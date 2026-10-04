from sqlalchemy import func, select

from app.db.dev_seed import seed
from app.db.models import Product, UserEvent
from tests.integration.conftest import ADMIN_TOKEN

ONBOARDING = {
    "email": "amel@example.com",
    "skin_type": "brillante",  # quiz id of apps/web
    "concerns": ["boutons", "pores"],
    "budget_max": 2500,
    "fragrance_preference": "fragrance_free",
    "ingredients_to_avoid": ["drying_alcohol"],
}


def onboard(client, **overrides) -> dict:
    response = client.post("/api/v1/onboarding", json={**ONBOARDING, **overrides})
    assert response.status_code == 201, response.text
    return response.json()


def product_id(db, name_start: str) -> int:
    return db.scalar(select(Product.product_id).where(Product.name.startswith(name_start)))


def test_health_and_reference(client):
    assert client.get("/health").json()["status"] == "ok"
    reference = client.get("/api/v1/reference").json()
    assert {"code": "oily", "label": "Peau grasse"} in reference["skin_types"]
    assert "fragrance" in reference["avoidable_ingredient_families"]


def test_onboarding_maps_quiz_answers_and_profile_roundtrip(client):
    profile = onboard(client)
    assert profile["skin_type"] == "oily"
    assert [c["code"] for c in profile["concerns"]] == ["acne", "pores"]
    assert profile["concerns"][0]["priority"] == 1
    assert profile["ingredients_to_avoid"][0]["family"] == "drying_alcohol"

    user_id = profile["user_id"]
    assert client.get(f"/api/v1/users/{user_id}/profile").json() == profile
    patched = client.patch(f"/api/v1/users/{user_id}/profile", json={"budget_max": 1500, "concerns": ["taches"]}).json()
    assert patched["budget_max"] == 1500
    assert [c["code"] for c in patched["concerns"]] == ["hyperpigmentation"]
    assert patched["skin_type"] == "oily"  # untouched

    again = onboard(client, skin_type="seche")  # same email -> same user, profile replaced
    assert again["user_id"] == user_id and again["skin_type"] == "dry"


def test_onboarding_validation(client):
    assert client.post("/api/v1/onboarding", json={"skin_type": "blue"}).status_code == 422
    assert client.post("/api/v1/onboarding", json={"budget_min": 50, "budget_max": 10}).status_code == 422
    assert client.post("/api/v1/onboarding", json={"concerns": ["a", "b", "c", "d", "e", "f"]}).status_code == 422
    both = {"ingredients_to_avoid": ["parfum"], "ingredients_preferred": ["Parfum"]}
    assert client.post("/api/v1/onboarding", json=both).status_code == 422
    assert client.patch("/api/v1/users/999/profile", json={"budget_max": 10}).status_code == 404


def test_for_you_respects_constraints_and_explains(client, db):
    user_id = onboard(client)["user_id"]
    response = client.get("/api/v1/recommendations", params={"user_id": user_id, "limit": 8, "debug": True})
    assert response.status_code == 200
    body = response.json()
    assert body["strategy"] == "profile_content" and body["model_version"] == "v0-rules"
    assert body["request_id"] and len(body["items"]) == 8
    names = [item["product"]["name"] for item in body["items"]]
    assert "Soin ciblé anti-imperfections" not in names  # contains Alcohol Denat., avoided
    assert all(item["product"]["available"] for item in body["items"])
    assert all(item["product"]["price"] <= 2500 * 1.25 for item in body["items"])
    first = body["items"][0]
    assert first["rank"] == 1 and "matches_your_skin_type" in first["reasons"]
    assert "skin_match" in first["features"]
    assert body["stats"]["after_filters"] <= body["stats"]["candidates"]


def test_anonymous_cold_start(client):
    body = client.get("/api/v1/recommendations", params={"limit": 5}).json()
    assert body["strategy"] == "popular_fallback" and body["fallback_used"] is True
    assert len(body["items"]) == 5
    assert "features" not in body["items"][0]  # debug off


def test_similar_and_complete_routine(client, db):
    user_id = onboard(client)["user_id"]
    serum = product_id(db, "Sérum niacinamide")
    similar = client.get(f"/api/v1/products/{serum}/similar", params={"user_id": user_id, "limit": 4}).json()
    assert serum not in [item["product_id"] for item in similar["items"]]
    assert all(item["anchor_product_id"] == serum for item in similar["items"])

    routine = client.get(f"/api/v1/products/{serum}/complete-routine", params={"user_id": user_id}).json()
    steps = {step["slot"]: step for step in routine["steps"]}
    assert steps["treat"]["status"] == "covered"
    assert steps["cleanse"]["recommendation"]["product"]["routine_role"] == "CLEANSER"
    assert steps["protect"]["recommendation"]["product"]["routine_role"] == "SUNSCREEN"
    assert "pas un avis médical" in routine["disclaimer"]

    posted = client.post("/api/v1/routines/recommend", json={"user_id": user_id, "existing_products": [serum]})
    assert posted.status_code == 200
    assert client.post("/api/v1/routines/recommend", json={"existing_products": [999999]}).status_code == 404
    assert client.get("/api/v1/recommendations", params={"type": "similar"}).status_code == 422


def test_events_batch_reports_invalid_events(client, db):
    user_id = onboard(client)["user_id"]
    pid = product_id(db, "Sérum niacinamide")
    batch = {
        "events": [
            {"event_type": "IMPRESSION", "user_id": user_id, "product_id": pid, "metadata": {"request_id": "r1", "position": 0}},
            {"event_type": "CLICK", "session_id": "anon-1", "product_id": pid},
            {"event_type": "VIEW", "user_id": user_id, "product_id": 999999},
            {"event_type": "VIEW", "user_id": 424242, "product_id": pid},
        ]
    }
    result = client.post("/api/v1/events/batch", json=batch).json()
    assert result["accepted"] == 2
    assert [(r["index"], r["reason"]) for r in result["rejected"]] == [(2, "unknown_product"), (3, "unknown_user")]
    assert client.post("/api/v1/events", json={"event_type": "VIEW", "product_id": pid}).status_code == 422  # no actor
    assert client.post("/api/v1/events", json={"event_type": "SEARCH", "session_id": "s", "metadata": {"q": "spf"}}).status_code == 202
    stored = db.scalar(select(func.count()).select_from(UserEvent))
    assert stored == 3


def test_wishlist_is_idempotent_and_feeds_because_you_liked(client, db):
    user_id = onboard(client)["user_id"]
    pid = product_id(db, "Sérum niacinamide")
    assert client.put(f"/api/v1/users/{user_id}/wishlist/{pid}").status_code == 201
    assert client.put(f"/api/v1/users/{user_id}/wishlist/{pid}").status_code == 204
    wishlist = client.get(f"/api/v1/users/{user_id}/wishlist").json()
    assert [item["product"]["product_id"] for item in wishlist] == [pid]
    events = db.scalars(select(UserEvent.event_type).where(UserEvent.user_id == user_id)).all()
    assert events == ["WISHLIST_ADD"]  # emitted once, server side

    body = client.get("/api/v1/recommendations", params={"user_id": user_id, "type": "because_you_liked"}).json()
    assert body["strategy"] == "seed_similarity"
    assert all(item["anchor_product_id"] == pid for item in body["items"])

    assert client.delete(f"/api/v1/users/{user_id}/wishlist/{pid}").status_code == 204
    assert client.delete(f"/api/v1/users/{user_id}/wishlist/{pid}").status_code == 404


def test_products_endpoints(client, db):
    page = client.get("/api/v1/products", params={"routine_role": "SUNSCREEN"}).json()
    assert page["total"] == 3 and all(p["routine_role"] == "SUNSCREEN" for p in page["items"])
    assert client.get("/api/v1/products", params={"available_only": False}).json()["total"] == 37
    detail = client.get(f"/api/v1/products/{product_id(db, 'Crème riche au karité')}").json()
    assert "Parfum" in detail["ingredients"] and detail["data_source"] == "dev_seed"
    assert client.get("/api/v1/products/999999").status_code == 404


def test_admin_routes_require_token(client):
    assert client.post("/api/v1/admin/catalog/reload").status_code == 401
    headers = {"X-Admin-Token": ADMIN_TOKEN}
    assert client.post("/api/v1/admin/catalog/reload", headers=headers).json()["products"] == 37
    assert client.post("/api/v1/admin/stats/refresh", headers=headers).json()["products"] == 37


def test_user_lookup_by_external_id(client):
    user_id = onboard(client, external_id="0d1e-uuid-from-api-core")["user_id"]
    assert client.get("/api/v1/users/by-external/0d1e-uuid-from-api-core").json()["user_id"] == user_id
    assert client.get("/api/v1/users/by-external/missing").status_code == 404


def test_dev_seed_is_idempotent(db):
    assert seed(db) == 37
    assert db.scalar(select(func.count()).select_from(Product)) == 37

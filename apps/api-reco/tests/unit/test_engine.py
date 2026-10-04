from datetime import datetime, timedelta, timezone

import pytest

from app.recommender.config import RecommenderConfig
from app.recommender.domain import EventType, FragrancePreference, Interaction, RoutineRole, UserContext, UserProfile
from app.recommender.engine import UnknownProductError
from app.recommender.scoring import Reason
from tests.factories import ALCOHOL, build_engine

NOW = datetime.now(timezone.utc)
OILY_ACNE = UserProfile(user_id=1, skin_type="oily", concerns={"acne": 1, "pores": 2}, budget_max=3000)


def ids(result):
    return [item.product_id for item in result.items]


def test_cold_start_without_anything_falls_back_to_popularity():
    result = build_engine().for_you(UserContext(), k=5)
    assert result.strategy == "popular_fallback"
    assert result.fallback_used
    assert len(result.items) == 5
    assert 9 not in ids(result)  # unavailable


def test_for_you_with_onboarding_only():
    result = build_engine().for_you(UserContext(profile=OILY_ACNE), k=5)
    assert result.strategy == "profile_content"
    assert ids(result)[0] in {1, 3, 6, 11}
    top = result.items[0]
    assert Reason.SKIN_TYPE in top.reasons and Reason.CONCERNS in top.reasons
    assert all(item.reasons for item in result.items)


def test_popular_product_with_avoided_ingredient_is_never_recommended():
    profile = UserProfile(skin_type="oily", concerns={"acne": 1}, avoided_ingredient_ids={ALCOHOL})
    engine = build_engine()
    for rec in (engine.for_you(UserContext(profile=profile), k=12), engine.similar(1, UserContext(profile=profile), k=12)):
        assert 11 not in ids(rec)  # popular + perfect match, but contains an avoided ingredient


def test_fragrance_free_user_never_gets_fragranced_products():
    profile = UserProfile(skin_type="dry", concerns={"dryness": 1}, fragrance_preference=FragrancePreference.FRAGRANCE_FREE)
    assert 5 not in ids(build_engine().for_you(UserContext(profile=profile), k=12))


def test_diversification_caps_brands_and_roles():
    config = RecommenderConfig()
    config.diversity.max_per_brand = 1
    result = build_engine(config).for_you(UserContext(profile=OILY_ACNE), k=4)
    brands = [build_engine().catalog[pid].brand_id for pid in ids(result)]
    assert len(brands) == len(set(brands))


def test_similar_products():
    engine = build_engine()
    result = engine.similar(3, UserContext(), k=3)
    assert 3 not in ids(result)
    assert result.items and all(item.anchor_product_id == 3 for item in result.items)
    assert result.items[0].features["content_similarity"] is not None
    with pytest.raises(UnknownProductError):
        engine.similar(999, UserContext())


def test_because_you_liked_uses_interactions_and_falls_back_without_them():
    engine = build_engine()
    fallback = engine.because_you_liked(UserContext(profile=OILY_ACNE), k=3)
    assert fallback.fallback_used and fallback.strategy.startswith("for_you_fallback")

    context = UserContext(
        profile=OILY_ACNE,
        interactions=[Interaction(3, EventType.WISHLIST_ADD, NOW - timedelta(days=1))],
    )
    result = engine.because_you_liked(context, k=3)
    assert result.strategy == "seed_similarity"
    assert 3 not in ids(result)
    assert all(item.anchor_product_id == 3 for item in result.items)


def test_for_you_mixes_profile_and_behavior():
    context = UserContext(
        profile=OILY_ACNE, interactions=[Interaction(6, EventType.PURCHASE, NOW - timedelta(days=2))]
    )
    result = build_engine().for_you(context, k=5)
    assert result.strategy == "profile+behavior"
    assert any(item.features["behavior_affinity"] is not None for item in result.items)


def test_complete_routine_fills_missing_core_steps():
    plan = build_engine().complete_routine(UserContext(profile=OILY_ACNE), [3])
    steps = {step.slot: step for step in plan.steps}
    assert steps["treat"].status == "covered" and steps["treat"].existing_product_ids == [3]
    assert steps["cleanse"].recommendation.product_id == 1  # 10 is a bundle, excluded from routines
    assert build_engine().catalog[steps["moisturize"].recommendation.product_id].routine_role == RoutineRole.MOISTURIZER
    assert steps["protect"].recommendation.product_id == 7
    assert Reason.COMPLETES_ROUTINE in steps["cleanse"].recommendation.reasons
    assert "tone" not in steps  # optional step not requested


def test_routine_flags_cautious_layering():
    plan = build_engine().complete_routine(UserContext(), [4], include_optional=True)  # retinol serum owned
    toner_step = next(step for step in plan.steps if step.slot == "tone")
    candidates = [toner_step.recommendation, *toner_step.alternatives]
    aha = next(item for item in candidates if item and item.product_id == 8)
    assert aha.reason_details["layering_caution"] == ["retinoid+aha"]

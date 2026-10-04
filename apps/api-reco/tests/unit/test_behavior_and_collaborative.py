import math
from datetime import datetime, timedelta, timezone

import pytest

from app.recommender.behavior import compute_popularity, decayed_weight, product_interest
from app.recommender.collaborative import UserEvent, build_interaction_matrix, train_collaborative_model
from app.recommender.config import BehaviorConfig, CollaborativeConfig, PopularityConfig
from app.recommender.diversification import diversify
from app.recommender.config import DiversityConfig
from app.recommender.domain import EventType, Interaction, ScoredProduct
from tests.factories import catalog

NOW = datetime(2026, 10, 1, tzinfo=timezone.utc)


def test_time_decay():
    config = BehaviorConfig(decay_lambda_per_day=0.1)
    assert decayed_weight(EventType.PURCHASE, NOW, NOW, config) == 10
    assert decayed_weight(EventType.PURCHASE, NOW - timedelta(days=10), NOW, config) == pytest.approx(10 * math.exp(-1))


def test_interest_drops_products_the_user_turned_away_from():
    interactions = [
        Interaction(1, EventType.WISHLIST_ADD, NOW),
        Interaction(1, EventType.WISHLIST_REMOVE, NOW),
        Interaction(1, EventType.WISHLIST_REMOVE, NOW),
        Interaction(2, EventType.VIEW, NOW),
    ]
    assert set(product_interest(interactions, BehaviorConfig(), NOW)) == {2}


def test_popularity_without_any_data_is_empty():
    assert compute_popularity({}, {}, PopularityConfig()) == {}


def test_popularity_from_events_and_ratings():
    popularity = compute_popularity({1: 100.0, 2: 1.0}, {1: (4.0, 10), 3: (5.0, 1)}, PopularityConfig())
    assert popularity[1] > popularity[2] > 0
    assert 0 < popularity[3] < popularity[1]


def test_collaborative_stays_off_below_thresholds():
    events = [UserEvent(1, 1, EventType.PURCHASE, NOW)]
    matrix = build_interaction_matrix(events, BehaviorConfig(), NOW)
    assert train_collaborative_model(matrix, CollaborativeConfig()) is None


def test_item_knn_recommends_co_interacted_products():
    events = []
    for user in range(20):
        events += [UserEvent(user, 1, EventType.PURCHASE, NOW), UserEvent(user, 2, EventType.PURCHASE, NOW)]
        events.append(UserEvent(user, 3 if user % 2 else 4, EventType.VIEW, NOW))
    matrix = build_interaction_matrix(events, BehaviorConfig(), NOW)
    model = train_collaborative_model(matrix, CollaborativeConfig(min_users=10, min_interactions=10))
    assert model is not None
    recommended = model.recommend({1: 1.0}, k=3, exclude=set())
    assert recommended[0][0] == 2


def test_diversify_respects_caps_but_never_shortens_the_list():
    products = {p.product_id: p for p in catalog()}
    ranked = [ScoredProduct(pid, 1.0 - pid / 100) for pid in (1, 4, 10, 2, 3)]  # brands 1, 1, 1, 2, 3
    picked = diversify(ranked, 3, products, DiversityConfig(max_per_brand=1, mmr_lambda=1.0))
    assert [p.product_id for p in picked] == [1, 2, 3]
    picked = diversify(ranked[:3], 3, products, DiversityConfig(max_per_brand=1))
    assert len(picked) == 3  # only brand 1 left: caps relaxed rather than returning fewer items

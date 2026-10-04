import json
from datetime import datetime, timedelta, timezone

import numpy as np
import pytest

from app.ml.dataset import build_dataset, temporal_split
from app.ml.evaluate import catalog_coverage, evaluate_groups, ndcg_at_k, recall_at_k
from app.ml.features import LTR_FEATURES, EventRow, user_product_behavior
from app.recommender.config import RecommenderConfig, load_recommender_config
from app.recommender.domain import EventType, RecommendationType, UserContext, UserProfile
from tests.factories import build_engine

START = datetime(2026, 1, 1, tzinfo=timezone.utc)


def test_ranking_metrics():
    relevance = np.array([0, 2, 0, 1])
    perfect = np.array([0.1, 0.9, 0.0, 0.5])
    assert ndcg_at_k(relevance, perfect, 4) == pytest.approx(1.0)
    assert ndcg_at_k(relevance, -perfect, 4) < 1.0
    assert recall_at_k(relevance, perfect, 1) == 0.5
    metrics = evaluate_groups(relevance, perfect, [4], ks=(2,))
    assert metrics["precision@2"] == 1.0
    assert catalog_coverage([[1, 2], [2, 3]], 6) == 0.5


def test_behavior_features_only_use_the_past():
    events = [
        EventRow(1, 3, EventType.VIEW, START),
        EventRow(1, 3, EventType.PURCHASE, START + timedelta(days=10)),  # after the cutoff
    ]
    behavior = user_product_behavior(events, START + timedelta(days=5))
    assert behavior[3]["views_last_7d"] == 1
    assert behavior[3]["purchase_count"] == 0


def _synthetic_like_events() -> list[EventRow]:
    """Weekly sessions over ~20 weeks: user u is shown 1, 3, 6 and engages with 3."""
    events = []
    for week in range(20):
        for user in (1, 2, 3):
            at = START + timedelta(days=7 * week + user)
            for pid in (1, 3, 6):
                events.append(EventRow(user, pid, EventType.IMPRESSION, at))
            events.append(EventRow(user, 3, EventType.CLICK, at + timedelta(minutes=1)))
            if week % 3 == 0:
                events.append(EventRow(user, 3, EventType.PURCHASE, at + timedelta(minutes=5)))
    return events


def test_labels_are_graded_and_unseen_products_are_not_negatives():
    engine = build_engine()
    events = _synthetic_like_events()
    dataset = build_dataset(
        events, {1: UserProfile(skin_type="oily")}, engine.index, RecommenderConfig(),
        cutoffs=[START + timedelta(days=21)], horizon=timedelta(days=7),
    )
    assert dataset.n_groups == 3
    assert dataset.X.shape[1] == len(LTR_FEATURES)
    products = {key[1] for key in dataset.keys}
    assert products == {1, 3, 6}  # only exposed or engaged products, never the 9 others
    labels = {key[1]: label for key, label in zip(dataset.keys, dataset.y)}
    assert labels[3] == 4 and labels[1] == 0  # purchase week: graded label


def test_temporal_split_never_trains_on_the_future():
    engine = build_engine()
    split = temporal_split(
        _synthetic_like_events(), {}, engine.index, RecommenderConfig(),
        horizon=timedelta(days=7), step=timedelta(days=7),
    )
    assert split.train.n_groups and split.test.n_groups
    assert max(cutoff for _, _, cutoff in split.train.keys) + timedelta(days=7) <= split.train_end
    assert min(cutoff for _, _, cutoff in split.test.keys) >= split.validation_end


def test_ltr_reranker_end_to_end(tmp_path):
    lgb = pytest.importorskip("lightgbm")
    from app.ml.inference import LtrReranker

    rng = np.random.default_rng(0)
    X = rng.random((200, len(LTR_FEATURES)))
    y = (X[:, 0] > 0.5).astype(int)
    booster = lgb.LGBMRanker(n_estimators=10, min_child_samples=5, verbose=-1).fit(X, y, group=[10] * 20).booster_
    booster.save_model(str(tmp_path / "model.txt"))
    (tmp_path / "metadata.json").write_text(
        json.dumps({"version": "test", "data_source": "synthetic", "feature_names": list(LTR_FEATURES)})
    )
    config = RecommenderConfig()
    config.ltr.enabled = True
    engine = build_engine(config)
    engine.reranker = LtrReranker.load(tmp_path)
    result = engine.for_you(UserContext(profile=UserProfile(skin_type="oily", concerns={"acne": 1})), k=5)
    assert result.model_version.endswith("+ltr:test")
    assert all("ltr_score" in item.features for item in result.items)


def test_yaml_config_overrides_only_given_keys(tmp_path):
    path = tmp_path / "reco.yaml"
    path.write_text("weights:\n  for_you:\n    skin_match: 0.9\ndiversity:\n  max_per_brand: 1\n")
    config = load_recommender_config(path)
    weights = config.weights_for(RecommendationType.FOR_YOU)
    assert weights.skin_match == 0.9
    assert weights.concern_match == 0.30  # default kept
    assert config.diversity.max_per_brand == 1
    assert config.weights_for(RecommendationType.SIMILAR).content_similarity == 0.55

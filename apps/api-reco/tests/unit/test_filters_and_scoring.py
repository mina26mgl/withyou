import math

import pytest

from app.recommender.config import FilterConfig, ScoringWeights
from app.recommender.domain import FragrancePreference, UserProfile
from app.recommender.filters import ExclusionReason, apply_hard_filters
from app.recommender.scoring import (
    Reason,
    budget_match,
    concern_match,
    score_product,
    skin_match,
    weighted_score,
)
from tests.factories import ALCOHOL, catalog

CATALOG = {p.product_id: p for p in catalog()}


def filter_ids(profile, **kwargs):
    return apply_hard_filters(CATALOG, CATALOG, profile, FilterConfig(), **kwargs)


def test_avoided_ingredient_is_excluded():
    result = filter_ids(UserProfile(avoided_ingredient_ids={ALCOHOL}))
    assert result.excluded[11] == ExclusionReason.AVOIDED_INGREDIENT
    assert 11 not in result.kept


def test_avoided_family_excludes_every_member():
    result = filter_ids(UserProfile(avoided_families={"fragrance"}))
    assert result.excluded[5] == ExclusionReason.AVOIDED_INGREDIENT


def test_fragrance_free_preference_is_a_hard_constraint():
    result = filter_ids(UserProfile(fragrance_preference=FragrancePreference.FRAGRANCE_FREE))
    assert result.excluded[5] == ExclusionReason.FRAGRANCE


def test_budget_tolerance():
    result = filter_ids(UserProfile(budget_max=2000))
    assert result.excluded[12] == ExclusionReason.OVER_BUDGET  # 9000 > 2000 * 1.25
    assert 6 in result.kept  # 1900: within budget
    assert 3 in result.kept  # 2300: above budget but within the 25 % tolerance, only scored lower


def test_unavailable_and_explicit_exclusions():
    result = filter_ids(None, exclude_ids={1})
    assert result.excluded[9] == ExclusionReason.UNAVAILABLE
    assert result.excluded[1] == ExclusionReason.EXCLUDED


def test_skin_match():
    oily = UserProfile(skin_type="oily")
    assert skin_match(CATALOG[1], oily) == 1.0
    assert skin_match(CATALOG[2], oily) == 0.0
    assert skin_match(CATALOG[1], None) is None
    sensitive_dry = UserProfile(skin_type="dry", sensitivity=5)
    assert skin_match(CATALOG[2], sensitive_dry) == 1.0  # dry 1.0 and sensitive 1.0


def test_concern_match_respects_priority():
    profile = UserProfile(concerns={"pores": 1, "acne": 2})
    score_3, matched = concern_match(CATALOG[3], profile)  # pores 1.0, acne 0.9
    score_1, _ = concern_match(CATALOG[1], profile)  # acne only (2nd priority)
    assert matched == ["pores", "acne"]
    assert score_3 > score_1


def test_budget_match_decays_above_budget():
    profile = UserProfile(budget_max=2000)
    assert budget_match(CATALOG[6], profile) == 1.0
    assert budget_match(CATALOG[3], profile) == pytest.approx(math.exp(-300 / 500))
    assert budget_match(CATALOG[6], UserProfile()) is None


def test_missing_features_do_not_penalise():
    weights = ScoringWeights(skin_match=0.5, budget_match=0.5)
    assert weighted_score({"skin_match": 0.8, "budget_match": None}, weights) == pytest.approx(0.8)
    assert weighted_score({}, weights) == 0.0


def test_score_product_explains_itself():
    profile = UserProfile(skin_type="oily", concerns={"acne": 1}, budget_max=2500)
    scored = score_product(CATALOG[1], profile, ScoringWeights(skin_match=0.35, concern_match=0.3, budget_match=0.15))
    assert scored.score == pytest.approx(1.0)
    assert {Reason.SKIN_TYPE, Reason.CONCERNS, Reason.BUDGET} <= set(scored.reasons)
    assert scored.reason_details["matched_concerns"] == ["acne"]

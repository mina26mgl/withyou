"""User x product compatibility features, weighted score and explanations.

Each feature is in [0, 1], or None when it cannot be computed for this request
(no budget declared, no seed product...). None features are left out and the
remaining weights are re-normalised, so a user who skipped a question is not
penalised for it.

The same features are the first columns of the Learning-to-Rank dataset
(app/ml/features.py), so V3 learns from exactly what V0 hand-weights.
"""

from __future__ import annotations

import math

from app.recommender.config import FEATURE_NAMES, ScoringWeights
from app.recommender.domain import FragrancePreference, ProductRecord, ScoredProduct, UserProfile
from app.recommender.filters import FRAGRANCE_FAMILY

# Score given to a product that does not say which skin types it targets.
UNSPECIFIED_SKIN_MATCH = 0.5


class Reason:
    SKIN_TYPE = "matches_your_skin_type"
    SUITS_SENSITIVE = "suits_sensitive_skin"
    CONCERNS = "matches_your_concerns"
    BUDGET = "within_your_budget"
    PREFERRED_INGREDIENTS = "contains_preferred_ingredients"
    NO_AVOIDED_INGREDIENTS = "free_of_ingredients_you_avoid"
    FRAGRANCE_FREE = "fragrance_free"
    CATEGORY = "in_a_category_you_like"
    BRAND = "from_a_brand_you_like"
    TEXTURE = "matches_your_texture_preference"
    SIMILAR = "similar_to_this_product"
    BECAUSE_YOU_LIKED = "similar_to_products_you_liked"
    BEHAVIOR = "matches_your_recent_activity"
    POPULAR = "popular_with_customers"
    COMPLETES_ROUTINE = "completes_your_routine"


def skin_match(product: ProductRecord, profile: UserProfile | None) -> float | None:
    if profile is None or (profile.skin_type is None and not profile.is_sensitive):
        return None
    if not product.skin_types:
        return UNSPECIFIED_SKIN_MATCH
    parts: list[float] = []
    if profile.skin_type:
        parts.append(product.skin_types.get(profile.skin_type, 0.0))
    if profile.is_sensitive and profile.skin_type != "sensitive":
        parts.append(product.skin_types.get("sensitive", 0.0))
    return sum(parts) / len(parts)


def concern_match(product: ProductRecord, profile: UserProfile | None) -> tuple[float | None, list[str]]:
    """Mix of the best match and the priority-weighted coverage of all concerns."""
    if profile is None or not profile.concerns:
        return None, []
    weights = {code: 1.0 / max(priority, 1) for code, priority in profile.concerns.items()}
    relevances = {code: product.concerns.get(code, 0.0) for code in weights}
    matched = sorted((c for c, r in relevances.items() if r > 0), key=lambda c: profile.concerns[c])
    coverage = sum(weights[c] * relevances[c] for c in weights) / sum(weights.values())
    best = max(relevances[c] * weights[c] / max(weights.values()) for c in weights)
    return 0.5 * best + 0.5 * coverage, matched


def budget_match(product: ProductRecord, profile: UserProfile | None) -> float | None:
    if profile is None or (profile.budget_max is None and profile.budget_min is None):
        return None
    price = product.price
    if profile.budget_max is not None and price > profile.budget_max:
        # 1 at the limit, ~0.37 at +25 % (where the hard filter usually starts).
        return math.exp(-(price - profile.budget_max) / (0.25 * profile.budget_max))
    if profile.budget_min is not None and price < profile.budget_min:
        return 0.8
    return 1.0


def ingredient_match(product: ProductRecord, profile: UserProfile | None) -> tuple[float | None, int]:
    if profile is None or not profile.preferred_ingredient_ids:
        return None, 0
    found = len(product.ingredient_ids & profile.preferred_ingredient_ids)
    return min(1.0, found / min(len(profile.preferred_ingredient_ids), 2)), found


def category_match(product: ProductRecord, profile: UserProfile | None) -> float | None:
    if profile is None or not profile.preferred_category_ids:
        return None
    ids = {product.category_id, product.parent_category_id}
    return 1.0 if ids & profile.preferred_category_ids else 0.0


def brand_match(product: ProductRecord, profile: UserProfile | None) -> float | None:
    if profile is None or not profile.preferred_brand_ids:
        return None
    return 1.0 if product.brand_id in profile.preferred_brand_ids else 0.0


def texture_match(product: ProductRecord, profile: UserProfile | None) -> float | None:
    if profile is None or not profile.texture_preference:
        return None
    if product.texture is None:
        return 0.5
    return 1.0 if product.texture == profile.texture_preference else 0.0


def weighted_score(features: dict[str, float | None], weights: ScoringWeights) -> float:
    total, norm = 0.0, 0.0
    for name, weight in weights.as_dict().items():
        value = features.get(name)
        if value is None or weight <= 0:
            continue
        total += weight * value
        norm += weight
    return total / norm if norm else 0.0


def score_product(
    product: ProductRecord,
    profile: UserProfile | None,
    weights: ScoringWeights,
    *,
    content_similarity: float | None = None,
    behavior_affinity: float | None = None,
    similarity_reason: str = Reason.SIMILAR,
) -> ScoredProduct:
    concern_value, matched_concerns = concern_match(product, profile)
    ingredient_value, preferred_found = ingredient_match(product, profile)
    features: dict[str, float | None] = {
        "skin_match": skin_match(product, profile),
        "concern_match": concern_value,
        "budget_match": budget_match(product, profile),
        "ingredient_match": ingredient_value,
        "category_match": category_match(product, profile),
        "brand_match": brand_match(product, profile),
        "texture_match": texture_match(product, profile),
        "content_similarity": None if content_similarity is None else max(0.0, min(1.0, content_similarity)),
        "behavior_affinity": behavior_affinity,
        "popularity": product.popularity,
    }
    assert set(features) == set(FEATURE_NAMES)
    scored = ScoredProduct(product_id=product.product_id, score=weighted_score(features, weights), features=features)
    scored.reasons, scored.reason_details = explain(product, profile, features, matched_concerns, similarity_reason)
    return scored


def explain(
    product: ProductRecord,
    profile: UserProfile | None,
    features: dict[str, float | None],
    matched_concerns: list[str],
    similarity_reason: str,
) -> tuple[list[str], dict[str, list[str]]]:
    """Turn feature values into reason codes the frontend can translate."""
    reasons: list[str] = []
    details: dict[str, list[str]] = {}

    def at_least(name: str, threshold: float) -> bool:
        value = features.get(name)
        return value is not None and value >= threshold

    if profile is not None:
        if profile.skin_type and product.skin_types.get(profile.skin_type, 0) >= 0.8:
            reasons.append(Reason.SKIN_TYPE)
        if profile.is_sensitive and product.skin_types.get("sensitive", 0) >= 0.8:
            reasons.append(Reason.SUITS_SENSITIVE)
        if matched_concerns:
            reasons.append(Reason.CONCERNS)
            details["matched_concerns"] = matched_concerns
        if features.get("budget_match") == 1.0 and profile.budget_max is not None:
            reasons.append(Reason.BUDGET)
        if at_least("ingredient_match", 1e-9):
            reasons.append(Reason.PREFERRED_INGREDIENTS)
        if at_least("category_match", 1.0):
            reasons.append(Reason.CATEGORY)
        if at_least("brand_match", 1.0):
            reasons.append(Reason.BRAND)
        if at_least("texture_match", 1.0):
            reasons.append(Reason.TEXTURE)
        if (
            profile.fragrance_preference == FragrancePreference.FRAGRANCE_FREE
            and FRAGRANCE_FAMILY not in product.ingredient_families
        ):
            reasons.append(Reason.FRAGRANCE_FREE)
        if profile.avoided_ingredient_ids:
            reasons.append(Reason.NO_AVOIDED_INGREDIENTS)
    if at_least("content_similarity", 0.3):
        reasons.append(similarity_reason)
    if at_least("behavior_affinity", 0.5):
        reasons.append(Reason.BEHAVIOR)
    if at_least("popularity", 0.6):
        reasons.append(Reason.POPULAR)
    return reasons, details

"""Hard constraints. They run BEFORE scoring: an excluded product never gets a
score, so no popularity or similarity can bring it back."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable, Mapping

from app.recommender.config import FilterConfig
from app.recommender.domain import FragrancePreference, ProductRecord, RoutineRole, UserProfile

FRAGRANCE_FAMILY = "fragrance"


class ExclusionReason:
    UNKNOWN = "unknown_product"
    EXCLUDED = "explicitly_excluded"
    UNAVAILABLE = "unavailable"
    AVOIDED_INGREDIENT = "contains_avoided_ingredient"
    FRAGRANCE = "contains_fragrance"
    OVER_BUDGET = "over_budget"
    ROLE = "role_not_requested"
    BUNDLE = "bundle"


@dataclass
class FilterResult:
    kept: list[int] = field(default_factory=list)
    excluded: dict[int, str] = field(default_factory=dict)


def violated_constraint(
    product: ProductRecord,
    profile: UserProfile | None,
    config: FilterConfig,
    *,
    allowed_roles: set[RoutineRole] | None = None,
    exclude_bundles: bool = False,
) -> str | None:
    """Return why the product must not be shown to this user, or None."""
    if config.exclude_unavailable and not product.available:
        return ExclusionReason.UNAVAILABLE
    if allowed_roles is not None and product.routine_role not in allowed_roles:
        return ExclusionReason.ROLE
    if exclude_bundles and product.is_bundle:
        return ExclusionReason.BUNDLE
    if profile is None:
        return None
    if product.ingredient_ids & profile.avoided_ingredient_ids:
        return ExclusionReason.AVOIDED_INGREDIENT
    if product.ingredient_families & profile.avoided_families:
        return ExclusionReason.AVOIDED_INGREDIENT
    if (
        profile.fragrance_preference == FragrancePreference.FRAGRANCE_FREE
        and FRAGRANCE_FAMILY in product.ingredient_families
    ):
        return ExclusionReason.FRAGRANCE
    if (
        config.budget_hard_tolerance is not None
        and profile.budget_max is not None
        and product.price > profile.budget_max * config.budget_hard_tolerance
    ):
        return ExclusionReason.OVER_BUDGET
    return None


def apply_hard_filters(
    candidate_ids: Iterable[int],
    catalog: Mapping[int, ProductRecord],
    profile: UserProfile | None,
    config: FilterConfig,
    *,
    exclude_ids: set[int] | None = None,
    allowed_roles: set[RoutineRole] | None = None,
    exclude_bundles: bool = False,
) -> FilterResult:
    result = FilterResult()
    exclude_ids = exclude_ids or set()
    for pid in candidate_ids:
        product = catalog.get(pid)
        if product is None:
            result.excluded[pid] = ExclusionReason.UNKNOWN
            continue
        if pid in exclude_ids:
            result.excluded[pid] = ExclusionReason.EXCLUDED
            continue
        reason = violated_constraint(
            product, profile, config, allowed_roles=allowed_roles, exclude_bundles=exclude_bundles
        )
        if reason:
            result.excluded[pid] = reason
        else:
            result.kept.append(pid)
    return result

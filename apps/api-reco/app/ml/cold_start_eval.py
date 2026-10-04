"""Cold-start quality checks, without any interaction data.

There is no ground truth before launch, so instead of accuracy we check, for
a grid of declared profiles (personas), properties the V0 recommender must
have:

    constraint_violations   avoided ingredient / fragrance / over-budget items shown  -> must be 0
    skin_match_rate         share of items compatible with the declared skin type
    concern_match_rate      share of items addressing at least one declared concern
    budget_rate             share of items within budget_max
    distinct_categories     average number of categories in a top-K list
    max_same_brand          worst brand repetition in a list
    routine_completeness    share of the core routine steps that could be filled
    catalog_coverage        share of the catalogue recommended to at least one persona
"""

from __future__ import annotations

import itertools
from dataclasses import dataclass
from statistics import mean

from app.ml.evaluate import catalog_coverage
from app.recommender.domain import FragrancePreference, UserContext, UserProfile
from app.recommender.engine import RecommendationEngine
from app.recommender.filters import violated_constraint


@dataclass
class Persona:
    name: str
    profile: UserProfile


def persona_grid(avoid_families: list[str] | None = None) -> list[Persona]:
    skin_types = ["dry", "oily", "combination", "normal", "sensitive", None]
    concern_sets = [["acne"], ["dryness"], ["hyperpigmentation", "dullness"], ["aging"], ["redness"], []]
    budgets = [None, 2000.0]
    fragrance = [FragrancePreference.NO_PREFERENCE, FragrancePreference.FRAGRANCE_FREE]
    personas = []
    for skin, concerns, budget, frag in itertools.product(skin_types, concern_sets, budgets, fragrance):
        profile = UserProfile(
            skin_type=skin,
            concerns={c: i for i, c in enumerate(concerns, start=1)},
            budget_max=budget,
            fragrance_preference=frag,
            avoided_families=set(avoid_families or []) if frag == FragrancePreference.FRAGRANCE_FREE else set(),
        )
        name = f"{skin or 'unknown'}|{'+'.join(concerns) or '-'}|{budget or 'any'}|{frag.value}"
        personas.append(Persona(name, profile))
    return personas


def evaluate_cold_start(engine: RecommendationEngine, personas: list[Persona], k: int = 10) -> dict[str, float]:
    catalog = engine.catalog
    violations = 0
    skin_rates, concern_rates, budget_rates, categories, brand_max, lengths, completeness = [], [], [], [], [], [], []
    lists: list[list[int]] = []
    for persona in personas:
        profile = persona.profile
        items = engine.for_you(UserContext(profile=profile), k).items
        products = [catalog[i.product_id] for i in items]
        lists.append([p.product_id for p in products])
        lengths.append(len(products))
        violations += sum(
            1 for p in products if violated_constraint(p, profile, engine.config.filters) is not None
        )
        if not products:
            continue
        if profile.skin_type:
            skin_rates.append(mean(p.skin_types.get(profile.skin_type, 0) >= 0.8 for p in products))
        if profile.concerns:
            concern_rates.append(mean(any(c in p.concerns for c in profile.concerns) for p in products))
        if profile.budget_max is not None:
            budget_rates.append(mean(p.price <= profile.budget_max for p in products))
        categories.append(len({p.category_id for p in products}))
        brand_counts: dict = {}
        for p in products:
            brand_counts[p.brand_id] = brand_counts.get(p.brand_id, 0) + 1
        brand_max.append(max(brand_counts.values()))

        plan = engine.complete_routine(UserContext(profile=profile), [])
        core_steps = [s for s in plan.steps if not s.optional]
        completeness.append(mean(s.status != "no_match" for s in core_steps) if core_steps else 0.0)

    def avg(values: list[float]) -> float:
        return float(mean(values)) if values else float("nan")

    return {
        "personas": float(len(personas)),
        "constraint_violations": float(violations),
        "avg_list_length": avg(lengths),
        "skin_match_rate": avg(skin_rates),
        "concern_match_rate": avg(concern_rates),
        "budget_rate": avg(budget_rates),
        "distinct_categories": avg(categories),
        "max_same_brand": float(max(brand_max)) if brand_max else float("nan"),
        "routine_completeness": avg(completeness),
        "catalog_coverage": catalog_coverage(lists, len(catalog)),
    }

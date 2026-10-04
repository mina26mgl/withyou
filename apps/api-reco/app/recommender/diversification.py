"""Re-order a ranked list so the top K is not five serums from one brand.

Greedy Maximal Marginal Relevance with category / brand / role caps:

    pick argmax  lambda * relevance - (1 - lambda) * max_similarity_to_already_picked

Caps are soft: if no remaining candidate fits them, the best remaining one is
taken anyway — relevance stays the priority and the list is never short.
"""

from __future__ import annotations

from collections import Counter
from typing import Callable, Mapping, Sequence

import numpy as np

from app.recommender.config import DiversityConfig
from app.recommender.domain import ProductRecord, ScoredProduct

SimilarityFn = Callable[[Sequence[int]], np.ndarray]


def diversify(
    ranked: Sequence[ScoredProduct],
    k: int,
    catalog: Mapping[int, ProductRecord],
    config: DiversityConfig,
    pairwise_similarity: SimilarityFn | None = None,
) -> list[ScoredProduct]:
    ranked = sorted(ranked, key=lambda item: item.score, reverse=True)
    if not config.enabled or len(ranked) <= 1:
        return ranked[:k]

    scores = np.array([item.score for item in ranked])
    spread = scores.max() - scores.min()
    relevance = (scores - scores.min()) / spread if spread > 0 else np.ones_like(scores)
    ids = [item.product_id for item in ranked]
    similarity = pairwise_similarity(ids) if pairwise_similarity else np.zeros((len(ids), len(ids)))

    selected: list[int] = []
    remaining = list(range(len(ranked)))
    per_category: Counter = Counter()
    per_brand: Counter = Counter()
    per_role: Counter = Counter()

    def within_caps(index: int) -> bool:
        product = catalog[ids[index]]
        return (
            per_category[product.category_id] < config.max_per_category
            and per_brand[product.brand_id] < config.max_per_brand
            and per_role[product.routine_role] < config.max_per_role
        )

    while remaining and len(selected) < k:
        pool = [i for i in remaining if within_caps(i)] or remaining
        if selected:
            redundancy = similarity[np.ix_(pool, selected)].max(axis=1)
        else:
            redundancy = np.zeros(len(pool))
        mmr = config.mmr_lambda * relevance[pool] - (1 - config.mmr_lambda) * redundancy
        best = pool[int(np.argmax(mmr))]
        selected.append(best)
        remaining.remove(best)
        product = catalog[ids[best]]
        per_category[product.category_id] += 1
        per_brand[product.brand_id] += 1
        per_role[product.routine_role] += 1

    return [ranked[i] for i in selected]

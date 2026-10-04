"""Independent candidate generators, merged and de-duplicated.

    content        products close to the user's declared profile   (V0)
    similar        products close to seed products                 (V0)
    popular        most popular products                           (V0, fallback)
    routine        products playing the requested routine roles    (V0)
    collaborative  item-item CF on real interactions               (V2, off until enough data)

Generators only *propose*; hard filters and ranking come after.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Mapping, Protocol, Sequence

import numpy as np

from app.recommender.catalog_index import CatalogIndex
from app.recommender.collaborative import CollaborativeModel
from app.recommender.domain import RoutineRole, UserProfile


@dataclass
class CandidateRequest:
    profile: UserProfile | None = None
    seeds: Mapping[int, float] = field(default_factory=dict)
    interest: Mapping[int, float] = field(default_factory=dict)
    roles: set[RoutineRole] | None = None
    exclude: set[int] = field(default_factory=set)


@dataclass
class Candidate:
    product_id: int
    source_scores: dict[str, float] = field(default_factory=dict)

    @property
    def sources(self) -> set[str]:
        return set(self.source_scores)


class CandidateGenerator(Protocol):
    name: str

    def generate(self, request: CandidateRequest, k: int) -> list[tuple[int, float]]: ...


class ContentCandidates:
    name = "content"

    def __init__(self, index: CatalogIndex) -> None:
        self.index = index

    def generate(self, request: CandidateRequest, k: int) -> list[tuple[int, float]]:
        if request.profile is None:
            return []
        query = self.index.profile_vector(request.profile)
        if query is None:
            return []
        return self.index.top_k(self.index.scores_for(query), k, exclude=request.exclude)


class SimilarCandidates:
    name = "similar"

    def __init__(self, index: CatalogIndex) -> None:
        self.index = index

    def generate(self, request: CandidateRequest, k: int) -> list[tuple[int, float]]:
        if not request.seeds:
            return []
        return self.index.similar_to(request.seeds, k, exclude=request.exclude)


class PopularCandidates:
    name = "popular"

    def __init__(self, index: CatalogIndex) -> None:
        # Popularity, then rating, then newest id: deterministic even with 0 data.
        self._ranked = sorted(
            index.products,
            key=lambda p: (p.popularity, p.avg_rating or 0.0, p.product_id),
            reverse=True,
        )

    def generate(self, request: CandidateRequest, k: int) -> list[tuple[int, float]]:
        results = []
        for product in self._ranked:
            if len(results) >= k:
                break
            if product.product_id in request.exclude:
                continue
            if request.roles is not None and product.routine_role not in request.roles:
                continue
            results.append((product.product_id, product.popularity))
        return results


class RoutineCandidates:
    name = "routine"

    def __init__(self, index: CatalogIndex) -> None:
        self.index = index

    def generate(self, request: CandidateRequest, k: int) -> list[tuple[int, float]]:
        if not request.roles:
            return []
        mask = np.array([p.routine_role in request.roles for p in self.index.products], dtype=bool)
        if not mask.any():
            return []
        query = self.index.profile_vector(request.profile) if request.profile else None
        if query is None:
            scores = np.array([p.popularity for p in self.index.products]) + 1e-6
        else:
            scores = self.index.scores_for(query) + 1e-6
        scores = np.where(mask, scores, -np.inf)
        return self.index.top_k(scores, k, exclude=request.exclude, min_score=0.0)


class CollaborativeCandidates:
    name = "collaborative"

    def __init__(self, model: CollaborativeModel | None) -> None:
        self.model = model

    def generate(self, request: CandidateRequest, k: int) -> list[tuple[int, float]]:
        if self.model is None or not request.interest:
            return []
        return self.model.recommend(request.interest, k, exclude=request.exclude)


def generate_candidates(
    generators: Sequence[CandidateGenerator],
    request: CandidateRequest,
    per_generator: Mapping[str, int],
    pool_size: int,
) -> dict[int, Candidate]:
    merged: dict[int, Candidate] = {}
    for generator in generators:
        for pid, score in generator.generate(request, per_generator.get(generator.name, pool_size)):
            candidate = merged.setdefault(pid, Candidate(pid))
            candidate.source_scores[generator.name] = max(score, candidate.source_scores.get(generator.name, score))
    if len(merged) <= pool_size:
        return merged
    # Keep the candidates proposed by several generators / with the best scores.
    ranked = sorted(merged.values(), key=lambda c: (len(c.source_scores), max(c.source_scores.values())), reverse=True)
    return {c.product_id: c for c in ranked[:pool_size]}

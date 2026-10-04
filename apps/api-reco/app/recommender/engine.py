"""Recommendation pipeline, independent of the database and of the API.

    candidate generation (≈500)  ->  hard filtering  ->  rule scoring (top 100)
        ->  optional LTR re-ranking  ->  diversification  ->  top K
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Literal, Protocol, Sequence

from app.recommender.behavior import affinity_scorer, product_interest
from app.recommender.candidates import (
    Candidate,
    CandidateGenerator,
    CandidateRequest,
    CollaborativeCandidates,
    ContentCandidates,
    PopularCandidates,
    RoutineCandidates,
    SimilarCandidates,
    generate_candidates,
)
from app.recommender.catalog_index import CatalogIndex
from app.recommender.collaborative import CollaborativeModel
from app.recommender.config import RecommenderConfig
from app.recommender.diversification import diversify
from app.recommender.domain import (
    ProductRecord,
    RecommendationResult,
    RecommendationType,
    RoutineRole,
    ScoredProduct,
    UserContext,
)
from app.recommender.filters import apply_hard_filters
from app.recommender.scoring import Reason, score_product

logger = logging.getLogger(__name__)


class Reranker(Protocol):
    """Learning-to-Rank model (V3). See app/ml/inference.py."""

    version: str

    def rerank(
        self,
        items: list[ScoredProduct],
        catalog: dict[int, ProductRecord],
        context: UserContext,
        blend: float,
    ) -> list[ScoredProduct]: ...


class UnknownProductError(KeyError):
    pass


StepStatus = Literal["covered", "recommended", "no_match"]


@dataclass
class RoutineStep:
    slot: str
    roles: list[RoutineRole]
    optional: bool
    status: StepStatus
    existing_product_ids: list[int] = field(default_factory=list)
    recommendation: ScoredProduct | None = None
    alternatives: list[ScoredProduct] = field(default_factory=list)


@dataclass
class RoutinePlan:
    steps: list[RoutineStep]
    model_version: str
    strategy: str


class RecommendationEngine:
    def __init__(
        self,
        index: CatalogIndex,
        config: RecommenderConfig,
        collaborative_model: CollaborativeModel | None = None,
        reranker: Reranker | None = None,
    ) -> None:
        self.index = index
        self.config = config
        self.collaborative_model = collaborative_model
        self.reranker = reranker
        self.content = ContentCandidates(index)
        self.similar_gen = SimilarCandidates(index)
        self.popular = PopularCandidates(index)
        self.routine_gen = RoutineCandidates(index)
        self.collaborative = CollaborativeCandidates(collaborative_model)

    @property
    def catalog(self) -> dict[int, ProductRecord]:
        return self.index.by_id

    @property
    def model_version(self) -> str:
        version = self.config.version
        if self.collaborative_model is not None:
            version += f"+cf:{self.collaborative_model.version}"
        if self._ltr_active:
            version += f"+ltr:{self.reranker.version}"  # type: ignore[union-attr]
        return version

    @property
    def _ltr_active(self) -> bool:
        return self.reranker is not None and self.config.ltr.enabled

    # ------------------------------------------------------------------ #
    # Public entry points
    # ------------------------------------------------------------------ #
    def for_you(self, context: UserContext, k: int = 10) -> RecommendationResult:
        interest = product_interest(context.interactions, self.config.behavior)
        has_profile = context.profile is not None and context.profile.has_preferences
        seeds = self._top_seeds(interest)
        request = CandidateRequest(
            profile=context.profile, seeds=seeds, interest=interest,
            exclude=set(context.exclude_product_ids),
        )
        generators: list[CandidateGenerator] = [self.content, self.similar_gen, self.collaborative, self.popular]
        if has_profile and interest:
            strategy = "profile+behavior"
        elif has_profile:
            strategy = "profile_content"
        elif interest:
            strategy = "behavior_only"
        else:
            strategy = "popular_fallback"
        return self._run(
            RecommendationType.FOR_YOU, generators, request, context, k,
            strategy=strategy, fallback=strategy == "popular_fallback",
        )

    def similar(self, product_id: int, context: UserContext, k: int = 10) -> RecommendationResult:
        if product_id not in self.catalog:
            raise UnknownProductError(product_id)
        interest = product_interest(context.interactions, self.config.behavior)
        request = CandidateRequest(
            profile=context.profile, seeds={product_id: 1.0}, interest={product_id: 1.0},
            exclude=set(context.exclude_product_ids) | {product_id},
        )
        result = self._run(
            RecommendationType.SIMILAR, [self.similar_gen, self.collaborative], request, context, k,
            strategy="content_similarity", similarity_reason=Reason.SIMILAR, interest=interest,
        )
        for item in result.items:
            item.anchor_product_id = product_id
        return result

    def because_you_liked(self, context: UserContext, k: int = 10) -> RecommendationResult:
        interest = product_interest(context.interactions, self.config.behavior)
        seeds = self._top_seeds(interest)
        if not seeds:
            result = self.for_you(context, k)
            result.strategy = f"for_you_fallback:{result.strategy}"
            result.fallback_used = True
            return result
        request = CandidateRequest(
            profile=context.profile, seeds=seeds, interest=interest,
            exclude=set(context.exclude_product_ids) | set(seeds),
        )
        result = self._run(
            RecommendationType.BECAUSE_YOU_LIKED, [self.similar_gen, self.collaborative], request, context, k,
            strategy="seed_similarity", similarity_reason=Reason.BECAUSE_YOU_LIKED, interest=interest,
        )
        for item in result.items:
            item.anchor_product_id = max(seeds, key=lambda seed: self.index.similarity(seed, item.product_id))
        return result

    def complete_routine(
        self,
        context: UserContext,
        existing_product_ids: Sequence[int],
        include_optional: bool = False,
    ) -> RoutinePlan:
        existing = [self.catalog[pid] for pid in existing_product_ids if pid in self.catalog]
        families = set().union(*(p.ingredient_families for p in existing)) if existing else set()
        used = set(context.exclude_product_ids) | set(existing_product_ids)
        weights = self.config.weights_for(RecommendationType.ROUTINE)
        cfg = self.config.routine
        steps: list[RoutineStep] = []

        for slot in cfg.slots:
            covered = [p.product_id for p in existing if p.routine_role in slot.roles]
            if covered:
                steps.append(RoutineStep(slot.name, slot.roles, slot.optional, "covered", existing_product_ids=covered))
                continue
            if slot.optional and not include_optional:
                continue
            roles = set(slot.roles)
            request = CandidateRequest(profile=context.profile, roles=roles, exclude=used)
            candidates = generate_candidates(
                [self.routine_gen], request, self.config.candidates.per_generator, self.config.candidates.pool_size
            )
            kept = apply_hard_filters(
                candidates, self.catalog, context.profile, self.config.filters,
                exclude_ids=used, allowed_roles=roles, exclude_bundles=True,
            ).kept
            scored = []
            for pid in kept:
                product = self.catalog[pid]
                compatibility = (
                    sum(self.index.similarity(pid, e.product_id) for e in existing) / len(existing) if existing else None
                )
                item = score_product(
                    product, context.profile, weights,
                    content_similarity=compatibility, similarity_reason=Reason.COMPLETES_ROUTINE,
                )
                self._apply_layering_caution(item, product, families)
                if Reason.COMPLETES_ROUTINE not in item.reasons:
                    item.reasons.insert(0, Reason.COMPLETES_ROUTINE)
                item.sources = {"routine"}
                scored.append(item)
            scored.sort(key=lambda s: s.score, reverse=True)
            if not scored:
                steps.append(RoutineStep(slot.name, slot.roles, slot.optional, "no_match"))
                continue
            choice, alternatives = scored[0], scored[1 : 1 + cfg.alternatives_per_slot]
            used.add(choice.product_id)
            families |= self.catalog[choice.product_id].ingredient_families
            steps.append(
                RoutineStep(slot.name, slot.roles, slot.optional, "recommended",
                            recommendation=choice, alternatives=alternatives)
            )
        strategy = "routine_completion" if existing else "routine_from_profile"
        return RoutinePlan(steps=steps, model_version=self.model_version, strategy=strategy)

    # ------------------------------------------------------------------ #
    # Pipeline
    # ------------------------------------------------------------------ #
    def _top_seeds(self, interest: dict[int, float]) -> dict[int, float]:
        known = {pid: w for pid, w in interest.items() if pid in self.catalog}
        top = sorted(known.items(), key=lambda kv: kv[1], reverse=True)[: self.config.behavior.max_seed_products]
        return dict(top)

    def _apply_layering_caution(self, item: ScoredProduct, product: ProductRecord, families: set[str]) -> None:
        cfg = self.config.routine
        pairs = [
            f"{a}+{b}"
            for a, b in cfg.cautious_pairs
            if (a in product.ingredient_families and b in families) or (b in product.ingredient_families and a in families)
        ]
        if pairs:
            item.score *= 1 - cfg.cautious_pair_penalty
            item.reason_details["layering_caution"] = pairs

    def _content_similarity(self, candidate: Candidate, seeds: dict[int, float]) -> float | None:
        if not seeds:
            return None
        if "similar" in candidate.source_scores:
            return candidate.source_scores["similar"]
        return max(self.index.similarity(seed, candidate.product_id) for seed in seeds)

    def _run(
        self,
        rec_type: RecommendationType,
        generators: Sequence[CandidateGenerator],
        request: CandidateRequest,
        context: UserContext,
        k: int,
        *,
        strategy: str,
        fallback: bool = False,
        similarity_reason: str = Reason.SIMILAR,
        interest: dict[int, float] | None = None,
    ) -> RecommendationResult:
        cfg = self.config
        interest = request.interest if interest is None else interest
        candidates = generate_candidates(generators, request, cfg.candidates.per_generator, cfg.candidates.pool_size)
        # Content candidates alone can be fewer than K on a tiny catalogue.
        if len(candidates) < k:
            for pid, score in self.popular.generate(request, cfg.candidates.per_generator["popular"]):
                candidates.setdefault(pid, Candidate(pid)).source_scores.setdefault("popular", score)

        filtered = apply_hard_filters(
            candidates, self.catalog, context.profile, cfg.filters, exclude_ids=request.exclude
        )
        affinity = affinity_scorer(interest, self.catalog)
        weights = cfg.weights_for(rec_type)
        scored: list[ScoredProduct] = []
        for pid in filtered.kept:
            product = self.catalog[pid]
            candidate = candidates[pid]
            use_similarity = rec_type in (RecommendationType.SIMILAR, RecommendationType.BECAUSE_YOU_LIKED)
            item = score_product(
                product, context.profile, weights,
                content_similarity=self._content_similarity(candidate, dict(request.seeds)) if use_similarity else None,
                behavior_affinity=affinity(product) if affinity else None,
                similarity_reason=similarity_reason,
            )
            item.sources = candidate.sources
            scored.append(item)

        scored.sort(key=lambda s: s.score, reverse=True)
        ranked = scored[: cfg.candidates.ranking_pool]
        if self._ltr_active:
            ranked = self.reranker.rerank(ranked, self.catalog, context, cfg.ltr.blend)  # type: ignore[union-attr]
        items = diversify(ranked, k, self.catalog, cfg.diversity, self.index.pairwise_similarity)

        stats = {"candidates": len(candidates), "after_filters": len(filtered.kept), "ranked": len(ranked)}
        logger.debug("%s %s: %s excluded=%s", rec_type.value, strategy, stats, filtered.excluded)
        return RecommendationResult(
            items=items, strategy=strategy, model_version=self.model_version, fallback_used=fallback, stats=stats
        )

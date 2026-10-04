"""Builds the user context from the database, calls the engine, formats the answer."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.errors import NotFoundError, ValidationFailed
from app.ml.features import user_product_behavior
from app.recommender.domain import RecommendationResult, RecommendationType, ScoredProduct, UserContext
from app.recommender.engine import RecommendationEngine, UnknownProductError
from app.schemas.product import ProductSummary
from app.schemas.recommendation import (
    RecommendationItem,
    RecommendationResponse,
    RoutineResponse,
    RoutineStepOut,
)
from app.services.catalog_service import get_summaries
from app.services.event_service import load_user_events, to_interactions
from app.services.profile_service import get_user, to_domain_profile


def build_context(session: Session, engine: RecommendationEngine, user_id: int | None) -> UserContext:
    if user_id is None:
        return UserContext()
    user = get_user(session, user_id)
    events = load_user_events(session, user_id, engine.config.behavior.history_days)
    context = UserContext(profile=to_domain_profile(user), interactions=to_interactions(events))
    if engine.reranker is not None and engine.config.ltr.enabled:
        context.product_behavior = user_product_behavior(events, datetime.now(timezone.utc), engine.catalog)
    return context


def _item(scored: ScoredProduct, rank: int, product: ProductSummary, debug: bool) -> RecommendationItem:
    return RecommendationItem(
        product_id=scored.product_id,
        rank=rank,
        score=round(scored.score, 4),
        reasons=scored.reasons,
        reason_details=scored.reason_details,
        sources=sorted(scored.sources),
        anchor_product_id=scored.anchor_product_id,
        features={k: (None if v is None else round(v, 4)) for k, v in scored.features.items()} if debug else None,
        product=product,
    )


def recommend(
    session: Session,
    engine: RecommendationEngine,
    rec_type: RecommendationType,
    *,
    user_id: int | None = None,
    product_id: int | None = None,
    limit: int = 10,
    debug: bool = False,
) -> RecommendationResponse:
    context = build_context(session, engine, user_id)
    result: RecommendationResult
    if rec_type == RecommendationType.FOR_YOU:
        result = engine.for_you(context, limit)
    elif rec_type == RecommendationType.BECAUSE_YOU_LIKED:
        result = engine.because_you_liked(context, limit)
    elif rec_type == RecommendationType.SIMILAR:
        if product_id is None:
            raise ValidationFailed("product_id is required for type=similar")
        try:
            result = engine.similar(product_id, context, limit)
        except UnknownProductError:
            raise NotFoundError(f"Product {product_id} not found") from None
    else:
        raise ValidationFailed("Use POST /api/v1/routines/recommend for routines")

    summaries = get_summaries(session, [i.product_id for i in result.items])
    items = [
        _item(scored, rank, summaries[scored.product_id], debug)
        for rank, scored in enumerate((s for s in result.items if s.product_id in summaries), start=1)
    ]
    return RecommendationResponse(
        request_id=str(uuid.uuid4()),
        type=rec_type,
        user_id=user_id,
        strategy=result.strategy,
        model_version=result.model_version,
        fallback_used=result.fallback_used,
        generated_at=datetime.now(timezone.utc),
        items=items,
        stats=result.stats if debug else None,
    )


def recommend_routine(
    session: Session,
    engine: RecommendationEngine,
    *,
    user_id: int | None,
    existing_product_ids: list[int],
    include_optional: bool = False,
    debug: bool = False,
) -> RoutineResponse:
    unknown = [pid for pid in existing_product_ids if pid not in engine.catalog]
    if unknown:
        raise NotFoundError(f"Unknown products: {unknown}")
    context = build_context(session, engine, user_id)
    plan = engine.complete_routine(context, existing_product_ids, include_optional=include_optional)

    ids = list(existing_product_ids)
    for step in plan.steps:
        if step.recommendation:
            ids.append(step.recommendation.product_id)
        ids.extend(a.product_id for a in step.alternatives)
    summaries = get_summaries(session, ids)

    steps = []
    for step in plan.steps:
        steps.append(
            RoutineStepOut(
                slot=step.slot,
                roles=step.roles,
                optional=step.optional,
                status=step.status,
                existing_products=[summaries[pid] for pid in step.existing_product_ids],
                recommendation=_item(step.recommendation, 1, summaries[step.recommendation.product_id], debug)
                if step.recommendation
                else None,
                alternatives=[
                    _item(alt, rank, summaries[alt.product_id], debug) for rank, alt in enumerate(step.alternatives, start=2)
                ],
            )
        )
    return RoutineResponse(
        request_id=str(uuid.uuid4()),
        user_id=user_id,
        strategy=plan.strategy,
        model_version=plan.model_version,
        generated_at=datetime.now(timezone.utc),
        steps=steps,
    )

from typing import Annotated

from fastapi import APIRouter, Query

from app.api.deps import DbSession, Engine
from app.core.errors import ValidationFailed
from app.recommender.domain import RecommendationType
from app.schemas.recommendation import RecommendationResponse
from app.services import recommendation_service

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.get("", response_model=RecommendationResponse, response_model_exclude_none=True)
def get_recommendations(
    db: DbSession,
    engine: Engine,
    type: RecommendationType = RecommendationType.FOR_YOU,
    user_id: int | None = None,
    product_id: Annotated[int | None, Query(description="Required for type=similar")] = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
    debug: Annotated[bool, Query(description="Include feature values and pipeline counters")] = False,
) -> RecommendationResponse:
    """for_you | similar | because_you_liked. Routines: POST /routines/recommend."""
    if type == RecommendationType.ROUTINE:
        raise ValidationFailed("type=routine is served by POST /api/v1/routines/recommend")
    return recommendation_service.recommend(
        db, engine, type, user_id=user_id, product_id=product_id, limit=limit, debug=debug
    )

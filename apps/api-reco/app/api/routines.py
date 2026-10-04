from fastapi import APIRouter

from app.api.deps import DbSession, Engine
from app.schemas.recommendation import RoutineRecommendRequest, RoutineResponse
from app.services import recommendation_service

router = APIRouter(prefix="/routines", tags=["routines"])


@router.post("/recommend", response_model=RoutineResponse, response_model_exclude_none=True)
def recommend_routine(body: RoutineRecommendRequest, db: DbSession, engine: Engine, debug: bool = False) -> RoutineResponse:
    """Fill the missing steps (cleanser -> treatment -> moisturizer -> SPF) around the products the user owns."""
    return recommendation_service.recommend_routine(
        db, engine, user_id=body.user_id, existing_product_ids=body.existing_products,
        include_optional=body.include_optional_steps, debug=debug,
    )

from typing import Annotated

from fastapi import APIRouter, Query

from app.api.deps import DbSession, Engine
from app.recommender.domain import RecommendationType, RoutineRole
from app.schemas.product import ProductDetail, ProductPage
from app.schemas.recommendation import RecommendationResponse, RoutineResponse
from app.services import catalog_service, recommendation_service

router = APIRouter(prefix="/products", tags=["products"])

Limit = Annotated[int, Query(ge=1, le=50)]


@router.get("", response_model=ProductPage)
def list_products(
    db: DbSession,
    category_id: int | None = None,
    brand_id: int | None = None,
    routine_role: RoutineRole | None = None,
    available_only: bool = True,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> ProductPage:
    items, total = catalog_service.list_products(
        db, category_id=category_id, brand_id=brand_id, routine_role=routine_role,
        available_only=available_only, limit=limit, offset=offset,
    )
    return ProductPage(items=items, total=total, limit=limit, offset=offset)


@router.get("/{product_id}", response_model=ProductDetail)
def get_product(product_id: int, db: DbSession) -> ProductDetail:
    return catalog_service.to_detail(catalog_service.get_product(db, product_id))


@router.get("/{product_id}/similar", response_model=RecommendationResponse, response_model_exclude_none=True)
def similar_products(
    product_id: int, db: DbSession, engine: Engine, user_id: int | None = None, limit: Limit = 10, debug: bool = False
) -> RecommendationResponse:
    return recommendation_service.recommend(
        db, engine, RecommendationType.SIMILAR, user_id=user_id, product_id=product_id, limit=limit, debug=debug
    )


@router.get("/{product_id}/complete-routine", response_model=RoutineResponse, response_model_exclude_none=True)
def complete_routine(
    product_id: int,
    db: DbSession,
    engine: Engine,
    user_id: int | None = None,
    include_optional_steps: bool = False,
    debug: bool = False,
) -> RoutineResponse:
    return recommendation_service.recommend_routine(
        db, engine, user_id=user_id, existing_product_ids=[product_id],
        include_optional=include_optional_steps, debug=debug,
    )

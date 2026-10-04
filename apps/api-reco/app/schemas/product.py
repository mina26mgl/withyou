from __future__ import annotations

from pydantic import BaseModel

from app.recommender.domain import RoutineRole, UsageTime


class ProductSummary(BaseModel):
    product_id: int
    external_id: str | None
    name: str
    brand_id: int | None
    brand_name: str | None
    category_id: int | None
    category_name: str | None
    price: float
    currency: str
    available: bool
    routine_role: RoutineRole
    image_url: str | None


class ScoredRef(BaseModel):
    code: str
    score: float


class ProductDetail(ProductSummary):
    description: str
    texture: str | None
    usage_time: UsageTime | None
    is_bundle: bool
    ingredients: list[str]
    skin_types: list[ScoredRef]
    concerns: list[ScoredRef]
    data_source: str


class ProductPage(BaseModel):
    items: list[ProductSummary]
    total: int
    limit: int
    offset: int

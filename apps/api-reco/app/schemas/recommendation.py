from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from app.recommender.domain import RecommendationType, RoutineRole
from app.schemas.product import ProductSummary

ROUTINE_DISCLAIMER = (
    "Suggestions basées sur les informations que vous avez déclarées et sur la composition des produits. "
    "Ce n'est pas un avis médical : en cas de doute, demandez conseil à un professionnel de santé."
)


class RecommendationItem(BaseModel):
    product_id: int
    rank: int
    score: float
    reasons: list[str]
    reason_details: dict[str, list[str]] = Field(default_factory=dict)
    sources: list[str]
    anchor_product_id: int | None = None
    features: dict[str, float | None] | None = Field(default=None, description="Only with debug=true")
    product: ProductSummary


class RecommendationResponse(BaseModel):
    request_id: str = Field(description="Send it back in the metadata of IMPRESSION / CLICK events.")
    type: RecommendationType
    user_id: int | None
    strategy: str
    model_version: str
    fallback_used: bool
    generated_at: datetime
    items: list[RecommendationItem]
    stats: dict[str, int] | None = None


class RoutineRecommendRequest(BaseModel):
    user_id: int | None = None
    existing_products: list[int] = Field(default_factory=list, max_length=20)
    include_optional_steps: bool = False


class RoutineStepOut(BaseModel):
    slot: str
    roles: list[RoutineRole]
    optional: bool
    status: str
    existing_products: list[ProductSummary]
    recommendation: RecommendationItem | None
    alternatives: list[RecommendationItem]


class RoutineResponse(BaseModel):
    request_id: str
    user_id: int | None
    strategy: str
    model_version: str
    generated_at: datetime
    steps: list[RoutineStepOut]
    disclaimer: str = ROUTINE_DISCLAIMER

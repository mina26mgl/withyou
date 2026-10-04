from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from app.schemas.product import ProductSummary


class ErrorResponse(BaseModel):
    code: str
    message: str


class WishlistItemOut(BaseModel):
    product: ProductSummary
    added_at: datetime


class CodeLabel(BaseModel):
    code: str
    label: str


class ReferenceData(BaseModel):
    """Everything the onboarding UI needs to render its choices."""

    skin_types: list[CodeLabel]
    concerns: list[CodeLabel]
    routine_roles: list[CodeLabel]
    textures: list[str]
    fragrance_preferences: list[str]
    avoidable_ingredient_families: list[str]
    event_types: list[str]

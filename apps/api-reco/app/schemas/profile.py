from __future__ import annotations

from datetime import datetime, timezone

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from app.recommender.domain import FragrancePreference
from app.recommender.vocabulary import TEXTURES, normalize_concern, normalize_skin_type

MAX_CONCERNS = 5
MAX_INGREDIENTS = 30


class _ProfileFields(BaseModel):
    """Fields shared by onboarding (create) and PATCH (partial update)."""

    skin_type: str | None = Field(
        default=None,
        description="dry | oily | combination | normal | sensitive | unknown. "
        "The quiz ids of apps/web (brillante, tendue, mixte, equilibree) are accepted.",
    )
    sensitivity: int | None = Field(default=None, ge=0, le=5)
    concerns: list[str] | None = Field(
        default=None, max_length=MAX_CONCERNS, description="Ordered by priority, first = most important."
    )
    budget_min: float | None = Field(default=None, ge=0)
    budget_max: float | None = Field(default=None, ge=0)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    fragrance_preference: FragrancePreference | None = None
    texture_preference: str | None = None
    preferred_category_ids: list[int] | None = None
    preferred_brand_ids: list[int] | None = None
    ingredients_to_avoid: list[str] | None = Field(default=None, max_length=MAX_INGREDIENTS)
    ingredients_preferred: list[str] | None = Field(default=None, max_length=MAX_INGREDIENTS)

    @field_validator("skin_type")
    @classmethod
    def _skin_type(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return normalize_skin_type(value) or "unknown"

    @field_validator("concerns")
    @classmethod
    def _concerns(cls, values: list[str] | None) -> list[str] | None:
        if values is None:
            return None
        codes: list[str] = []
        for value in values:
            code = normalize_concern(value)
            if code is None and value.strip().lower() not in ("rien", "none"):
                raise ValueError(f"Unknown concern: {value!r}")
            if code and code not in codes:
                codes.append(code)
        return codes

    @field_validator("texture_preference")
    @classmethod
    def _texture(cls, value: str | None) -> str | None:
        if value is not None and value not in TEXTURES:
            raise ValueError(f"texture_preference must be one of {', '.join(TEXTURES)}")
        return value

    @model_validator(mode="after")
    def _budget_range(self):
        if self.budget_min is not None and self.budget_max is not None and self.budget_min > self.budget_max:
            raise ValueError("budget_min must be <= budget_max")
        both = set(self.ingredients_to_avoid or []) & set(self.ingredients_preferred or [])
        if both:
            raise ValueError(f"Ingredients both preferred and avoided: {sorted(both)}")
        return self


class OnboardingRequest(_ProfileFields):
    """Creates the user when needed (identified by user_id, external_id or email)."""

    user_id: int | None = None
    external_id: str | None = Field(default=None, max_length=64, description="api-core consumer UUID")
    email: EmailStr | None = None
    skin_type: str | None = "unknown"
    concerns: list[str] | None = Field(default_factory=list, max_length=MAX_CONCERNS)
    fragrance_preference: FragrancePreference | None = FragrancePreference.NO_PREFERENCE


class ProfilePatch(_ProfileFields):
    """Only the fields sent are changed; a list sent replaces the stored list."""


class IngredientRef(BaseModel):
    ingredient_id: int
    name: str
    family: str | None = None


class ConcernRef(BaseModel):
    code: str
    label: str
    priority: int


class ProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    external_id: str | None
    email: str | None
    skin_type: str
    sensitivity: int | None
    concerns: list[ConcernRef]
    budget_min: float | None
    budget_max: float | None
    currency: str
    fragrance_preference: FragrancePreference
    texture_preference: str | None
    preferred_category_ids: list[int]
    preferred_brand_ids: list[int]
    ingredients_to_avoid: list[IngredientRef]
    ingredients_preferred: list[IngredientRef]
    onboarding_completed_at: datetime | None
    updated_at: datetime | None

    @field_validator("onboarding_completed_at", "updated_at")
    @classmethod
    def _as_utc(cls, value: datetime | None) -> datetime | None:
        # Timestamps are stored in UTC; some drivers (SQLite) return them naive.
        return value.replace(tzinfo=timezone.utc) if value is not None and value.tzinfo is None else value


class UserSummary(BaseModel):
    user_id: int
    external_id: str | None
    email: str | None
    has_profile: bool

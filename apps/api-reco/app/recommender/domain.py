"""Plain data types the recommender works on.

The recommender never touches the database or FastAPI: services convert
SQLAlchemy rows into these records, so the engine can be unit-tested with
hand-built catalogues.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Mapping


class RoutineRole(str, Enum):
    CLEANSER = "CLEANSER"
    TONER = "TONER"
    SERUM = "SERUM"
    TREATMENT = "TREATMENT"
    MOISTURIZER = "MOISTURIZER"
    SUNSCREEN = "SUNSCREEN"
    EYE_CARE = "EYE_CARE"
    MASK = "MASK"
    MAKEUP = "MAKEUP"
    OTHER = "OTHER"


class UsageTime(str, Enum):
    AM = "AM"
    PM = "PM"
    ANY = "ANY"


class EventType(str, Enum):
    IMPRESSION = "IMPRESSION"
    VIEW = "VIEW"
    CLICK = "CLICK"
    SEARCH = "SEARCH"
    WISHLIST_ADD = "WISHLIST_ADD"
    WISHLIST_REMOVE = "WISHLIST_REMOVE"
    CART_ADD = "CART_ADD"
    CART_REMOVE = "CART_REMOVE"
    PURCHASE = "PURCHASE"


class PreferenceType(str, Enum):
    PREFER = "PREFER"
    AVOID = "AVOID"


class FragrancePreference(str, Enum):
    NO_PREFERENCE = "no_preference"
    FRAGRANCE_FREE = "fragrance_free"
    LIKES_FRAGRANCE = "likes_fragrance"


class RecommendationType(str, Enum):
    FOR_YOU = "for_you"
    SIMILAR = "similar"
    ROUTINE = "routine"
    BECAUSE_YOU_LIKED = "because_you_liked"


class DataSource(str, Enum):
    """Where a catalogue row comes from. Never mix `dev_seed` into production."""

    CORE_SYNC = "core_sync"
    DEV_SEED = "dev_seed"
    MANUAL = "manual"


@dataclass(frozen=True)
class ProductRecord:
    product_id: int
    name: str
    price: float
    brand_id: int | None = None
    brand_name: str = ""
    category_id: int | None = None
    category_name: str = ""
    parent_category_id: int | None = None
    description: str = ""
    currency: str = "DZD"
    available: bool = True
    routine_role: RoutineRole = RoutineRole.OTHER
    texture: str | None = None
    usage_time: UsageTime | None = None
    is_bundle: bool = False
    # skin type code -> compatibility in [0, 1]
    skin_types: Mapping[str, float] = field(default_factory=dict)
    # concern code -> relevance in [0, 1]
    concerns: Mapping[str, float] = field(default_factory=dict)
    ingredient_ids: frozenset[int] = frozenset()
    ingredient_names: tuple[str, ...] = ()
    # Families of the product's ingredients ("fragrance", "retinoid"...)
    ingredient_families: frozenset[str] = frozenset()
    # Normalised to [0, 1] by the stats job; 0 for everything while there is no data.
    popularity: float = 0.0
    avg_rating: float | None = None
    rating_count: int = 0


@dataclass
class UserProfile:
    """What the user declared during onboarding. Nothing here is inferred or medical."""

    user_id: int | None = None
    skin_type: str | None = None  # None when unknown
    sensitivity: int | None = None  # 0 (doesn't know) .. 5 (very reactive)
    concerns: dict[str, int] = field(default_factory=dict)  # code -> priority (1 = top)
    budget_min: float | None = None
    budget_max: float | None = None
    fragrance_preference: FragrancePreference = FragrancePreference.NO_PREFERENCE
    texture_preference: str | None = None
    preferred_category_ids: set[int] = field(default_factory=set)
    preferred_brand_ids: set[int] = field(default_factory=set)
    preferred_ingredient_ids: set[int] = field(default_factory=set)
    avoided_ingredient_ids: set[int] = field(default_factory=set)
    # Families named by the avoided ingredients ("parfum" -> "fragrance"): every
    # product containing an ingredient of these families is excluded.
    avoided_families: set[str] = field(default_factory=set)

    @property
    def is_sensitive(self) -> bool:
        return self.skin_type == "sensitive" or (self.sensitivity or 0) >= 4

    @property
    def has_preferences(self) -> bool:
        return bool(
            self.skin_type
            or self.concerns
            or self.budget_max is not None
            or self.preferred_category_ids
            or self.preferred_brand_ids
            or self.preferred_ingredient_ids
            or self.texture_preference
        )


@dataclass(frozen=True)
class Interaction:
    product_id: int
    event_type: EventType
    occurred_at: datetime


@dataclass
class UserContext:
    profile: UserProfile | None = None
    interactions: list[Interaction] = field(default_factory=list)
    # Products never to show (already owned, currently viewed...).
    exclude_product_ids: set[int] = field(default_factory=set)
    # Per-product behavioural counters of this user (views_last_7d...), only
    # needed by the Learning-to-Rank reranker (V3).
    product_behavior: dict[int, dict[str, float]] = field(default_factory=dict)


@dataclass
class ScoredProduct:
    product_id: int
    score: float
    features: dict[str, float | None] = field(default_factory=dict)
    reasons: list[str] = field(default_factory=list)
    reason_details: dict[str, list[str]] = field(default_factory=dict)
    sources: set[str] = field(default_factory=set)
    anchor_product_id: int | None = None


@dataclass
class RecommendationResult:
    items: list[ScoredProduct]
    strategy: str
    model_version: str
    fallback_used: bool = False
    stats: dict[str, int] = field(default_factory=dict)

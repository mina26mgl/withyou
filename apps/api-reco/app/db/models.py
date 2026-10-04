"""SQLAlchemy models of the `reco` schema.

Rows synchronised from api-core keep the original UUID in `external_id`.
Synthetic rows (generated to test the pipeline) are flagged with
`is_synthetic` / `data_source` and are excluded from training by default.
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Any

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    SmallInteger,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, BigIntFK, BigIntPK, JSONDict
from app.recommender.domain import (
    DataSource,
    EventType,
    FragrancePreference,
    PreferenceType,
    RoutineRole,
    UsageTime,
)


def _one_of(column: str, enum: type[Enum], name: str, nullable: bool = False) -> CheckConstraint:
    values = ", ".join(f"'{member.value}'" for member in enum)
    condition = f"{column} IN ({values})"
    if nullable:
        condition = f"{column} IS NULL OR {condition}"
    return CheckConstraint(condition, name=name)


def _created_at() -> Mapped[datetime]:
    return mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


def _updated_at() -> Mapped[datetime]:
    return mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


# --------------------------------------------------------------------------- #
# Users & beauty profile
# --------------------------------------------------------------------------- #
class User(Base):
    __tablename__ = "users"

    user_id: Mapped[int] = mapped_column(BigIntPK, primary_key=True, autoincrement=True)
    external_id: Mapped[str | None] = mapped_column(String(64), unique=True)
    email: Mapped[str | None] = mapped_column(String(320), unique=True)
    is_synthetic: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)
    created_at: Mapped[datetime] = _created_at()
    updated_at: Mapped[datetime] = _updated_at()

    profile: Mapped[BeautyProfile | None] = relationship(back_populates="user", cascade="all, delete-orphan", uselist=False)
    concerns: Mapped[list[UserConcern]] = relationship(cascade="all, delete-orphan", order_by="UserConcern.priority")
    ingredient_preferences: Mapped[list[UserIngredientPreference]] = relationship(cascade="all, delete-orphan")
    category_preferences: Mapped[list[UserCategoryPreference]] = relationship(cascade="all, delete-orphan")
    brand_preferences: Mapped[list[UserBrandPreference]] = relationship(cascade="all, delete-orphan")


class SkinType(Base):
    __tablename__ = "skin_types"

    skin_type_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(32), unique=True)
    label: Mapped[str] = mapped_column(String(64))


class BeautyProfile(Base):
    __tablename__ = "beauty_profiles"
    __table_args__ = (
        CheckConstraint("budget_min IS NULL OR budget_min >= 0", name="budget_min_positive"),
        CheckConstraint(
            "budget_min IS NULL OR budget_max IS NULL OR budget_min <= budget_max", name="budget_range"
        ),
        CheckConstraint("sensitivity IS NULL OR sensitivity BETWEEN 0 AND 5", name="sensitivity_range"),
        _one_of("fragrance_preference", FragrancePreference, "fragrance_preference_values"),
    )

    user_id: Mapped[int] = mapped_column(
        BigIntFK, ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True
    )
    skin_type_id: Mapped[int | None] = mapped_column(ForeignKey("skin_types.skin_type_id", ondelete="SET NULL"))
    sensitivity: Mapped[int | None] = mapped_column(SmallInteger)
    budget_min: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    budget_max: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    currency: Mapped[str] = mapped_column(String(3), default="DZD", server_default="DZD")
    fragrance_preference: Mapped[str] = mapped_column(
        String(24), default=FragrancePreference.NO_PREFERENCE.value, server_default=FragrancePreference.NO_PREFERENCE.value
    )
    texture_preference: Mapped[str | None] = mapped_column(String(24))
    onboarding_completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = _created_at()
    updated_at: Mapped[datetime] = _updated_at()

    user: Mapped[User] = relationship(back_populates="profile")
    skin_type: Mapped[SkinType | None] = relationship(lazy="joined")


class Concern(Base):
    __tablename__ = "concerns"

    concern_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(48), unique=True)
    label: Mapped[str] = mapped_column(String(96))


class UserConcern(Base):
    __tablename__ = "user_concerns"
    __table_args__ = (CheckConstraint("priority BETWEEN 1 AND 10", name="priority_range"),)

    user_id: Mapped[int] = mapped_column(BigIntFK, ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True)
    concern_id: Mapped[int] = mapped_column(ForeignKey("concerns.concern_id", ondelete="CASCADE"), primary_key=True)
    priority: Mapped[int] = mapped_column(SmallInteger, default=1)

    concern: Mapped[Concern] = relationship(lazy="joined")


class Ingredient(Base):
    __tablename__ = "ingredients"

    ingredient_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    # Normalised (lowercase, no accents) — the matching key.
    name: Mapped[str] = mapped_column(String(160), unique=True)
    display_name: Mapped[str] = mapped_column(String(160))
    # "fragrance", "retinoid"... Avoiding the ingredient named like a family
    # excludes every ingredient of that family.
    family: Mapped[str | None] = mapped_column(String(32), index=True)


class UserIngredientPreference(Base):
    __tablename__ = "user_ingredient_preferences"
    __table_args__ = (_one_of("preference_type", PreferenceType, "preference_type_values"),)

    user_id: Mapped[int] = mapped_column(BigIntFK, ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True)
    ingredient_id: Mapped[int] = mapped_column(
        ForeignKey("ingredients.ingredient_id", ondelete="CASCADE"), primary_key=True
    )
    preference_type: Mapped[str] = mapped_column(String(8))
    created_at: Mapped[datetime] = _created_at()

    ingredient: Mapped[Ingredient] = relationship(lazy="joined")


class UserCategoryPreference(Base):
    __tablename__ = "user_category_preferences"

    user_id: Mapped[int] = mapped_column(BigIntFK, ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.category_id", ondelete="CASCADE"), primary_key=True)


class UserBrandPreference(Base):
    __tablename__ = "user_brand_preferences"

    user_id: Mapped[int] = mapped_column(BigIntFK, ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True)
    brand_id: Mapped[int] = mapped_column(ForeignKey("brands.brand_id", ondelete="CASCADE"), primary_key=True)


# --------------------------------------------------------------------------- #
# Catalogue
# --------------------------------------------------------------------------- #
class Brand(Base):
    __tablename__ = "brands"

    brand_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    external_id: Mapped[str | None] = mapped_column(String(64), unique=True)
    name: Mapped[str] = mapped_column(String(160), unique=True)
    created_at: Mapped[datetime] = _created_at()


class Category(Base):
    __tablename__ = "categories"

    category_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    external_id: Mapped[str | None] = mapped_column(String(64), unique=True)
    name: Mapped[str] = mapped_column(String(160), unique=True)
    parent_category_id: Mapped[int | None] = mapped_column(
        ForeignKey("categories.category_id", ondelete="SET NULL"), index=True
    )
    created_at: Mapped[datetime] = _created_at()

    parent: Mapped[Category | None] = relationship(remote_side=[category_id], lazy="joined", join_depth=1)


class Product(Base):
    __tablename__ = "products"
    __table_args__ = (
        CheckConstraint("price >= 0", name="price_positive"),
        _one_of("routine_role", RoutineRole, "routine_role_values"),
        _one_of("usage_time", UsageTime, "usage_time_values", nullable=True),
        _one_of("data_source", DataSource, "data_source_values"),
        Index("ix_products_available_role", "available", "routine_role"),
    )

    product_id: Mapped[int] = mapped_column(BigIntPK, primary_key=True, autoincrement=True)
    external_id: Mapped[str | None] = mapped_column(String(64), unique=True)
    brand_id: Mapped[int | None] = mapped_column(ForeignKey("brands.brand_id", ondelete="SET NULL"), index=True)
    category_id: Mapped[int | None] = mapped_column(
        ForeignKey("categories.category_id", ondelete="SET NULL"), index=True
    )
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text, default="", server_default="")
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    currency: Mapped[str] = mapped_column(String(3), default="DZD", server_default="DZD")
    available: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    routine_role: Mapped[str] = mapped_column(String(16), default=RoutineRole.OTHER.value, server_default="OTHER")
    # Set by hand it wins over the role inferred by the sync.
    routine_role_locked: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    texture: Mapped[str | None] = mapped_column(String(24))
    usage_time: Mapped[str | None] = mapped_column(String(3))
    is_bundle: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    image_url: Mapped[str | None] = mapped_column(Text)
    data_source: Mapped[str] = mapped_column(String(16), default=DataSource.MANUAL.value, server_default="manual")
    created_at: Mapped[datetime] = _created_at()
    updated_at: Mapped[datetime] = _updated_at()

    brand: Mapped[Brand | None] = relationship(lazy="joined")
    category: Mapped[Category | None] = relationship(lazy="joined")
    ingredients: Mapped[list[ProductIngredient]] = relationship(
        cascade="all, delete-orphan", order_by="ProductIngredient.position"
    )
    skin_types: Mapped[list[ProductSkinType]] = relationship(cascade="all, delete-orphan")
    concerns: Mapped[list[ProductConcern]] = relationship(cascade="all, delete-orphan")
    stats: Mapped[ProductStats | None] = relationship(cascade="all, delete-orphan", uselist=False)


class ProductIngredient(Base):
    __tablename__ = "product_ingredients"

    product_id: Mapped[int] = mapped_column(
        BigIntFK, ForeignKey("products.product_id", ondelete="CASCADE"), primary_key=True
    )
    ingredient_id: Mapped[int] = mapped_column(
        ForeignKey("ingredients.ingredient_id", ondelete="CASCADE"), primary_key=True, index=True
    )
    # Order on the label (INCI lists by decreasing concentration).
    position: Mapped[int] = mapped_column(SmallInteger, default=0)

    ingredient: Mapped[Ingredient] = relationship(lazy="joined")


class ProductSkinType(Base):
    __tablename__ = "product_skin_types"
    __table_args__ = (CheckConstraint("compatibility_score BETWEEN 0 AND 1", name="compatibility_range"),)

    product_id: Mapped[int] = mapped_column(
        BigIntFK, ForeignKey("products.product_id", ondelete="CASCADE"), primary_key=True
    )
    skin_type_id: Mapped[int] = mapped_column(
        ForeignKey("skin_types.skin_type_id", ondelete="CASCADE"), primary_key=True, index=True
    )
    compatibility_score: Mapped[float] = mapped_column(Float, default=1.0)

    skin_type: Mapped[SkinType] = relationship(lazy="joined")


class ProductConcern(Base):
    __tablename__ = "product_concerns"
    __table_args__ = (CheckConstraint("relevance_score BETWEEN 0 AND 1", name="relevance_range"),)

    product_id: Mapped[int] = mapped_column(
        BigIntFK, ForeignKey("products.product_id", ondelete="CASCADE"), primary_key=True
    )
    concern_id: Mapped[int] = mapped_column(
        ForeignKey("concerns.concern_id", ondelete="CASCADE"), primary_key=True, index=True
    )
    relevance_score: Mapped[float] = mapped_column(Float, default=1.0)

    concern: Mapped[Concern] = relationship(lazy="joined")


class ProductStats(Base):
    """Aggregates refreshed by `scripts/refresh_stats.py` (or POST /admin/stats/refresh)."""

    __tablename__ = "product_stats"

    product_id: Mapped[int] = mapped_column(
        BigIntFK, ForeignKey("products.product_id", ondelete="CASCADE"), primary_key=True
    )
    popularity_score: Mapped[float] = mapped_column(Float, default=0.0, server_default="0")
    view_count_30d: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    wishlist_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    cart_count_30d: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    purchase_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    avg_rating: Mapped[float | None] = mapped_column(Float)
    rating_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    updated_at: Mapped[datetime] = _updated_at()


# --------------------------------------------------------------------------- #
# Interactions
# --------------------------------------------------------------------------- #
class WishlistItem(Base):
    __tablename__ = "wishlist_items"

    user_id: Mapped[int] = mapped_column(BigIntFK, ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True)
    product_id: Mapped[int] = mapped_column(
        BigIntFK, ForeignKey("products.product_id", ondelete="CASCADE"), primary_key=True, index=True
    )
    created_at: Mapped[datetime] = _created_at()


class Order(Base):
    __tablename__ = "orders"
    __table_args__ = (Index("ix_orders_user_created", "user_id", "created_at"),)

    order_id: Mapped[int] = mapped_column(BigIntPK, primary_key=True, autoincrement=True)
    external_id: Mapped[str | None] = mapped_column(String(64), unique=True)
    user_id: Mapped[int] = mapped_column(BigIntFK, ForeignKey("users.user_id", ondelete="CASCADE"))
    status: Mapped[str] = mapped_column(String(32))
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    currency: Mapped[str] = mapped_column(String(3), default="DZD", server_default="DZD")
    is_synthetic: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    created_at: Mapped[datetime] = _created_at()

    items: Mapped[list[OrderItem]] = relationship(cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"
    __table_args__ = (CheckConstraint("quantity > 0", name="quantity_positive"),)

    order_id: Mapped[int] = mapped_column(BigIntFK, ForeignKey("orders.order_id", ondelete="CASCADE"), primary_key=True)
    product_id: Mapped[int] = mapped_column(
        BigIntFK, ForeignKey("products.product_id", ondelete="CASCADE"), primary_key=True, index=True
    )
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2))


class UserEvent(Base):
    """Raw behaviour log — the future training data. Append-only."""

    __tablename__ = "user_events"
    __table_args__ = (
        _one_of("event_type", EventType, "event_type_values"),
        CheckConstraint("user_id IS NOT NULL OR session_id IS NOT NULL", name="has_actor"),
        Index("ix_user_events_user_time", "user_id", "occurred_at"),
        Index("ix_user_events_product_type_time", "product_id", "event_type", "occurred_at"),
        Index("ix_user_events_session_time", "session_id", "occurred_at"),
        Index("ix_user_events_time", "occurred_at"),
    )

    event_id: Mapped[int] = mapped_column(BigIntPK, primary_key=True, autoincrement=True)
    user_id: Mapped[int | None] = mapped_column(BigIntFK, ForeignKey("users.user_id", ondelete="CASCADE"))
    product_id: Mapped[int | None] = mapped_column(BigIntFK, ForeignKey("products.product_id", ondelete="CASCADE"))
    session_id: Mapped[str | None] = mapped_column(String(64))
    event_type: Mapped[str] = mapped_column(String(16))
    # When it happened on the client; `received_at` is when the API stored it.
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    received_at: Mapped[datetime] = _created_at()
    # `metadata` is reserved by SQLAlchemy's declarative API, hence the attribute name.
    event_metadata: Mapped[dict[str, Any]] = mapped_column("metadata", JSONDict, default=dict)
    is_synthetic: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")

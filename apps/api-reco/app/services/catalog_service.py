"""Loads the catalogue from PostgreSQL and keeps the recommendation engine in memory.

The engine (catalogue matrix + optional CF / LTR models) is rebuilt only when
the catalogue or its stats changed, checked at most every
`catalog_refresh_seconds`. With < 10 000 products a rebuild takes well under
a second, so no external cache (Redis) is needed for V0.
"""

from __future__ import annotations

import logging
import threading
import time
from datetime import datetime, timedelta, timezone
from typing import Sequence

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.config import Settings
from app.core.errors import NotFoundError
from app.db.models import Product, ProductIngredient, ProductStats, UserEvent
from app.recommender.catalog_index import CatalogIndex
from app.recommender.collaborative import UserEvent as CfEvent
from app.recommender.collaborative import build_interaction_matrix, train_collaborative_model
from app.recommender.config import RecommenderConfig, load_recommender_config
from app.recommender.domain import EventType, ProductRecord, RoutineRole, UsageTime
from app.recommender.engine import RecommendationEngine
from app.schemas.product import ProductDetail, ProductSummary, ScoredRef

logger = logging.getLogger(__name__)


def _product_query():
    return select(Product).options(
        selectinload(Product.ingredients).joinedload(ProductIngredient.ingredient),
        selectinload(Product.skin_types),
        selectinload(Product.concerns),
        selectinload(Product.stats),
    )


def to_record(product: Product) -> ProductRecord:
    stats = product.stats
    ingredients = [link.ingredient for link in product.ingredients]
    return ProductRecord(
        product_id=product.product_id,
        name=product.name,
        price=float(product.price),
        brand_id=product.brand_id,
        brand_name=product.brand.name if product.brand else "",
        category_id=product.category_id,
        category_name=product.category.name if product.category else "",
        parent_category_id=product.category.parent_category_id if product.category else None,
        description=product.description or "",
        currency=product.currency,
        available=product.available,
        routine_role=RoutineRole(product.routine_role),
        texture=product.texture,
        usage_time=UsageTime(product.usage_time) if product.usage_time else None,
        is_bundle=product.is_bundle,
        skin_types={link.skin_type.name: link.compatibility_score for link in product.skin_types},
        concerns={link.concern.name: link.relevance_score for link in product.concerns},
        ingredient_ids=frozenset(i.ingredient_id for i in ingredients),
        ingredient_names=tuple(i.display_name for i in ingredients),
        ingredient_families=frozenset(i.family for i in ingredients if i.family),
        popularity=stats.popularity_score if stats else 0.0,
        avg_rating=stats.avg_rating if stats else None,
        rating_count=stats.rating_count if stats else 0,
    )


def load_product_records(session: Session) -> list[ProductRecord]:
    return [to_record(p) for p in session.scalars(_product_query()).unique()]


def catalog_version(session: Session) -> tuple:
    products = session.execute(select(func.count(Product.product_id), func.max(Product.updated_at))).one()
    stats = session.execute(select(func.max(ProductStats.updated_at))).scalar()
    return (*products, stats)


def load_cf_events(session: Session, days: int) -> list[CfEvent]:
    since = datetime.now(timezone.utc) - timedelta(days=days)
    rows = session.execute(
        select(UserEvent.user_id, UserEvent.product_id, UserEvent.event_type, UserEvent.occurred_at).where(
            UserEvent.user_id.is_not(None),
            UserEvent.product_id.is_not(None),
            UserEvent.is_synthetic.is_(False),
            UserEvent.occurred_at >= since,
        )
    )
    return [CfEvent(u, p, EventType(t), at) for u, p, t, at in rows]


class EngineProvider:
    """Process-wide holder of the current RecommendationEngine."""

    def __init__(self, settings: Settings, config: RecommenderConfig | None = None) -> None:
        self.settings = settings
        self.config = config or load_recommender_config(settings.recommender_config_path)
        self._engine: RecommendationEngine | None = None
        self._version: tuple | None = None
        self._checked_at = 0.0
        self._lock = threading.Lock()

    def invalidate(self) -> None:
        with self._lock:
            self._version = None
            self._checked_at = 0.0

    def get(self, session: Session) -> RecommendationEngine:
        now = time.monotonic()
        if self._engine is not None and now - self._checked_at < self.settings.catalog_refresh_seconds:
            return self._engine
        with self._lock:
            version = catalog_version(session)
            if self._engine is None or version != self._version:
                self._engine = self._build(session)
                self._version = version
            self._checked_at = now
            return self._engine

    def _build(self, session: Session) -> RecommendationEngine:
        started = time.perf_counter()
        index = CatalogIndex(load_product_records(session), self.config.encoder)
        cf_model = None
        if self.config.collaborative.enabled:
            matrix = build_interaction_matrix(
                load_cf_events(session, self.config.behavior.history_days), self.config.behavior
            )
            cf_model = train_collaborative_model(matrix, self.config.collaborative)
        reranker = None
        if self.settings.ltr_model_path and self.config.ltr.enabled:
            from app.ml.inference import LtrReranker

            reranker = LtrReranker.load(self.settings.ltr_model_path)
        engine = RecommendationEngine(index, self.config, collaborative_model=cf_model, reranker=reranker)
        logger.info(
            "Recommendation engine %s ready (%d products) in %.0f ms",
            engine.model_version, len(index), (time.perf_counter() - started) * 1000,
        )
        return engine


# --------------------------------------------------------------------------- #
# Product read helpers used by the API
# --------------------------------------------------------------------------- #
def to_summary(product: Product) -> ProductSummary:
    return ProductSummary(
        product_id=product.product_id,
        external_id=product.external_id,
        name=product.name,
        brand_id=product.brand_id,
        brand_name=product.brand.name if product.brand else None,
        category_id=product.category_id,
        category_name=product.category.name if product.category else None,
        price=float(product.price),
        currency=product.currency,
        available=product.available,
        routine_role=RoutineRole(product.routine_role),
        image_url=product.image_url,
    )


def to_detail(product: Product) -> ProductDetail:
    return ProductDetail(
        **to_summary(product).model_dump(),
        description=product.description or "",
        texture=product.texture,
        usage_time=UsageTime(product.usage_time) if product.usage_time else None,
        is_bundle=product.is_bundle,
        ingredients=[link.ingredient.display_name for link in product.ingredients],
        skin_types=[ScoredRef(code=l.skin_type.name, score=l.compatibility_score) for l in product.skin_types],
        concerns=[ScoredRef(code=l.concern.name, score=l.relevance_score) for l in product.concerns],
        data_source=product.data_source,
    )


def get_product(session: Session, product_id: int) -> Product:
    product = session.scalars(_product_query().where(Product.product_id == product_id)).unique().one_or_none()
    if product is None:
        raise NotFoundError(f"Product {product_id} not found")
    return product


def get_summaries(session: Session, product_ids: Sequence[int]) -> dict[int, ProductSummary]:
    if not product_ids:
        return {}
    products = session.scalars(select(Product).where(Product.product_id.in_(set(product_ids)))).unique()
    return {p.product_id: to_summary(p) for p in products}


def list_products(
    session: Session,
    *,
    category_id: int | None = None,
    brand_id: int | None = None,
    routine_role: RoutineRole | None = None,
    available_only: bool = True,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[ProductSummary], int]:
    query = select(Product)
    if category_id is not None:
        query = query.where(Product.category_id == category_id)
    if brand_id is not None:
        query = query.where(Product.brand_id == brand_id)
    if routine_role is not None:
        query = query.where(Product.routine_role == routine_role.value)
    if available_only:
        query = query.where(Product.available.is_(True))
    total = session.scalar(select(func.count()).select_from(query.subquery())) or 0
    rows = session.scalars(query.order_by(Product.product_id).limit(limit).offset(offset)).unique()
    return [to_summary(p) for p in rows], total

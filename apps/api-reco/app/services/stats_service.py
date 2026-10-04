"""Refreshes `product_stats` (popularity, counters) from real events."""

from __future__ import annotations

import logging
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models import Product, ProductStats, UserEvent, WishlistItem
from app.recommender.behavior import compute_popularity, decayed_weight
from app.recommender.config import RecommenderConfig
from app.recommender.domain import EventType

logger = logging.getLogger(__name__)


def refresh_product_stats(session: Session, config: RecommenderConfig, *, include_synthetic: bool = False) -> int:
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=config.popularity.window_days)
    query = select(UserEvent.product_id, UserEvent.event_type, UserEvent.occurred_at).where(
        UserEvent.product_id.is_not(None), UserEvent.occurred_at >= since
    )
    if not include_synthetic:
        query = query.where(UserEvent.is_synthetic.is_(False))

    scores: dict[int, float] = defaultdict(float)
    views: dict[int, int] = defaultdict(int)
    carts: dict[int, int] = defaultdict(int)
    purchases: dict[int, int] = defaultdict(int)
    month_ago = now - timedelta(days=30)
    for pid, event_type, occurred_at in session.execute(query):
        etype = EventType(event_type)
        scores[pid] += decayed_weight(etype, occurred_at, now, config.behavior)
        recent = (occurred_at if occurred_at.tzinfo else occurred_at.replace(tzinfo=timezone.utc)) >= month_ago
        if etype == EventType.VIEW and recent:
            views[pid] += 1
        elif etype == EventType.CART_ADD and recent:
            carts[pid] += 1
        elif etype == EventType.PURCHASE:
            purchases[pid] += 1

    wishlists = dict(
        session.execute(select(WishlistItem.product_id, func.count()).group_by(WishlistItem.product_id)).all()
    )
    existing = {s.product_id: s for s in session.scalars(select(ProductStats))}
    ratings = {
        pid: (s.avg_rating, s.rating_count) for pid, s in existing.items() if s.avg_rating is not None and s.rating_count
    }
    popularity = compute_popularity(scores, ratings, config.popularity)

    product_ids = list(session.scalars(select(Product.product_id)))
    for pid in product_ids:
        stats = existing.get(pid)
        if stats is None:
            stats = ProductStats(product_id=pid)
            session.add(stats)
        stats.popularity_score = round(popularity.get(pid, 0.0), 6)
        stats.view_count_30d = views.get(pid, 0)
        stats.cart_count_30d = carts.get(pid, 0)
        stats.purchase_count = purchases.get(pid, 0)
        stats.wishlist_count = int(wishlists.get(pid, 0))
        stats.updated_at = now
    session.commit()
    logger.info("product_stats refreshed for %d products (%d with events)", len(product_ids), len(scores))
    return len(product_ids)

"""Feature definitions shared by offline training and online inference.

One function computes the behavioural counters for both, so the model never
sees features at serving time that were computed differently during training
(training/serving skew).

LTR feature vector = rule features (app/recommender/scoring.py)
                   + behavioural counters of the user for the product
                   + product-level stats.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Iterable, Mapping

import numpy as np

from app.recommender.config import FEATURE_NAMES
from app.recommender.domain import EventType, ProductRecord, ScoredProduct

BEHAVIOR_FEATURES: tuple[str, ...] = (
    "views_last_7d",
    "views_last_30d",
    "clicks_last_30d",
    "wishlist_count",
    "cart_count",
    "purchase_count",
    "days_since_last_interaction",
    "category_affinity",
    "brand_affinity",
)
PRODUCT_FEATURES: tuple[str, ...] = ("product_rating", "product_rating_count", "product_popularity", "price_log")

LTR_FEATURES: tuple[str, ...] = (*FEATURE_NAMES, *BEHAVIOR_FEATURES, *PRODUCT_FEATURES)

# Used when the user never interacted with the product.
NEVER = 365.0


@dataclass(frozen=True)
class EventRow:
    user_id: int
    product_id: int
    event_type: EventType
    occurred_at: datetime


def _utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


def user_product_behavior(
    events: Iterable[EventRow], now: datetime, catalog: Mapping[int, ProductRecord] | None = None
) -> dict[int, dict[str, float]]:
    """Counters of ONE user's events strictly before `now`, per product.

    With a catalogue, category/brand affinities (share of the user's
    interactions in the product's category/brand) are added for every product
    of the catalogue, including never-seen ones.
    """
    now = _utc(now)
    per_product: dict[int, dict[str, float]] = defaultdict(
        lambda: {name: 0.0 for name in BEHAVIOR_FEATURES} | {"days_since_last_interaction": NEVER}
    )
    by_category: dict[int | None, float] = defaultdict(float)
    by_brand: dict[int | None, float] = defaultdict(float)
    total = 0.0
    for event in events:
        at = _utc(event.occurred_at)
        if at >= now or event.event_type in (EventType.IMPRESSION, EventType.SEARCH):
            continue
        age = (now - at).total_seconds() / 86400
        row = per_product[event.product_id]
        if event.event_type == EventType.VIEW:
            row["views_last_30d"] += age <= 30
            row["views_last_7d"] += age <= 7
        elif event.event_type == EventType.CLICK:
            row["clicks_last_30d"] += age <= 30
        elif event.event_type == EventType.WISHLIST_ADD:
            row["wishlist_count"] += 1
        elif event.event_type == EventType.CART_ADD:
            row["cart_count"] += 1
        elif event.event_type == EventType.PURCHASE:
            row["purchase_count"] += 1
        row["days_since_last_interaction"] = min(row["days_since_last_interaction"], age)
        if catalog is not None and event.product_id in catalog:
            product = catalog[event.product_id]
            by_category[product.category_id] += 1
            by_brand[product.brand_id] += 1
            total += 1

    result = {pid: dict(values) for pid, values in per_product.items()}
    if catalog is not None and total:
        for pid, product in catalog.items():
            row = result.get(pid) or ({name: 0.0 for name in BEHAVIOR_FEATURES} | {"days_since_last_interaction": NEVER})
            row["category_affinity"] = by_category.get(product.category_id, 0.0) / total
            row["brand_affinity"] = by_brand.get(product.brand_id, 0.0) / total
            result[pid] = row
    return result


def product_features(product: ProductRecord) -> dict[str, float]:
    return {
        "product_rating": product.avg_rating if product.avg_rating is not None else 0.0,
        "product_rating_count": float(product.rating_count),
        "product_popularity": product.popularity,
        "price_log": float(np.log1p(product.price)),
    }


def feature_row(
    scored: ScoredProduct, product: ProductRecord, behavior: Mapping[str, float] | None
) -> list[float]:
    """Fixed-order numeric vector. Missing rule features are NaN (LightGBM handles them)."""
    behavior = behavior or {}
    values: list[float] = []
    for name in FEATURE_NAMES:
        value = scored.features.get(name)
        values.append(float("nan") if value is None else float(value))
    for name in BEHAVIOR_FEATURES:
        default = NEVER if name == "days_since_last_interaction" else 0.0
        values.append(float(behavior.get(name, default)))
    prod = product_features(product)
    values.extend(prod[name] for name in PRODUCT_FEATURES)
    return values

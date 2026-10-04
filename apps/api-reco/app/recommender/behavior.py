"""Behavioural signals (V1): weighted, time-decayed interactions.

All functions accept an empty interaction list and then return neutral
results, so the engine keeps working with 0 interactions.
"""

from __future__ import annotations

import math
from collections import defaultdict
from datetime import datetime, timezone
from typing import Iterable, Mapping

from app.recommender.config import BehaviorConfig, PopularityConfig
from app.recommender.domain import EventType, Interaction, ProductRecord


def _as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


def decayed_weight(event_type: EventType, occurred_at: datetime, now: datetime, config: BehaviorConfig) -> float:
    """weight = initial_weight * exp(-lambda * age_in_days)"""
    initial = config.event_weights.get(event_type, 0.0)
    age_days = max(0.0, (_as_utc(now) - _as_utc(occurred_at)).total_seconds() / 86400)
    return initial * math.exp(-config.decay_lambda_per_day * age_days)


def product_interest(
    interactions: Iterable[Interaction], config: BehaviorConfig, now: datetime | None = None
) -> dict[int, float]:
    """Net decayed interest per product; products the user turned away from
    (wishlist/cart removals outweighing the rest) are dropped."""
    now = now or datetime.now(timezone.utc)
    totals: dict[int, float] = defaultdict(float)
    for interaction in interactions:
        totals[interaction.product_id] += decayed_weight(interaction.event_type, interaction.occurred_at, now, config)
    return {pid: weight for pid, weight in totals.items() if weight > 0}


def affinity_scorer(interest: Mapping[int, float], catalog: Mapping[int, ProductRecord]):
    """Build `product -> affinity in [0, 1]` from the categories, brands and
    routine roles the user interacted with. Returns None without interest."""
    if not interest:
        return None
    by_category: dict[int | None, float] = defaultdict(float)
    by_brand: dict[int | None, float] = defaultdict(float)
    by_role: dict[str, float] = defaultdict(float)
    for pid, weight in interest.items():
        product = catalog.get(pid)
        if product is None:
            continue
        by_category[product.category_id] += weight
        by_brand[product.brand_id] += weight
        by_role[product.routine_role.value] += weight
    if not by_category:
        return None
    top_cat, top_brand, top_role = max(by_category.values()), max(by_brand.values()), max(by_role.values())

    def score(product: ProductRecord) -> float:
        return (
            0.5 * by_category.get(product.category_id, 0.0) / top_cat
            + 0.3 * by_brand.get(product.brand_id, 0.0) / top_brand
            + 0.2 * by_role.get(product.routine_role.value, 0.0) / top_role
        )

    return score


def compute_popularity(
    event_scores: Mapping[int, float],
    ratings: Mapping[int, tuple[float, int]],
    config: PopularityConfig,
) -> dict[int, float]:
    """Popularity in [0, 1] from decayed event scores and Bayesian-averaged ratings.

    event_scores: product -> sum of decayed event weights over the window.
    ratings: product -> (average stars 1..5, number of reviews).
    """
    product_ids = set(event_scores) | set(ratings)
    if not product_ids:
        return {}

    positive = {pid: max(0.0, s) for pid, s in event_scores.items()}
    max_events = max(positive.values(), default=0.0)
    event_part = {pid: math.log1p(s) / math.log1p(max_events) for pid, s in positive.items()} if max_events > 0 else {}

    rating_part: dict[int, float] = {}
    rated = [(avg, n) for avg, n in ratings.values() if n > 0]
    if rated:
        global_mean = sum(avg * n for avg, n in rated) / sum(n for _, n in rated)
        prior = config.rating_prior_count
        for pid, (avg, n) in ratings.items():
            bayes = (avg * n + global_mean * prior) / (n + prior)
            rating_part[pid] = (bayes - 1.0) / 4.0

    if event_part and rating_part:
        w = config.rating_weight
        return {pid: (1 - w) * event_part.get(pid, 0.0) + w * rating_part.get(pid, 0.0) for pid in product_ids}
    # Only one signal exists: scale it down so a single 5-star review does not
    # turn a product into a "bestseller".
    only = event_part or {pid: config.rating_weight * v for pid, v in rating_part.items()}
    return {pid: only.get(pid, 0.0) for pid in product_ids}

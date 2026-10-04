"""Learning-to-Rank dataset built from `user_events`, with a temporal split.

Snapshot approach — "I know the past, can I predict what comes next?":

    for each cutoff date c (every `step_days`):
        features : computed only from events strictly before c
        labels   : what the user did with each product during [c, c + horizon)

Labels are graded, not purchase=1/else=0:

    PURCHASE 4 > CART_ADD 3 > WISHLIST_ADD 2 > CLICK / VIEW 1 > shown but ignored 0

Negatives are products the user was SHOWN (IMPRESSION) in the window and did
not engage with. A product the user never saw is not a negative: by default
it is left out (see `unexposed_negatives`).

The split is temporal on the label window: 80 % of the timeline -> train,
next 10 % -> validation, last 10 % -> test. No random split.

Known limitation: profiles are taken as they are today (their history is not
versioned), so a profile edited after a cutoff leaks a little future
information.
"""

from __future__ import annotations

import random
from collections import defaultdict
from dataclasses import dataclass, field, replace
from datetime import datetime, timedelta, timezone
from typing import Mapping, Sequence

import numpy as np
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import User, UserEvent
from app.ml.features import LTR_FEATURES, EventRow, feature_row, user_product_behavior
from app.recommender.behavior import affinity_scorer, compute_popularity, decayed_weight, product_interest
from app.recommender.catalog_index import CatalogIndex
from app.recommender.config import RecommenderConfig
from app.recommender.domain import EventType, Interaction, ProductRecord, RecommendationType, UserProfile
from app.recommender.filters import violated_constraint
from app.recommender.scoring import score_product

LABEL_GRADES: dict[EventType, int] = {
    EventType.PURCHASE: 4,
    EventType.CART_ADD: 3,
    EventType.WISHLIST_ADD: 2,
    EventType.CLICK: 1,
    EventType.VIEW: 1,
}


@dataclass
class RankingDataset:
    X: np.ndarray
    y: np.ndarray
    group_sizes: list[int]
    baseline_scores: np.ndarray  # V0 rule score, to compare the model against
    keys: list[tuple[int, int, datetime]] = field(default_factory=list)  # (user, product, cutoff)
    feature_names: tuple[str, ...] = LTR_FEATURES

    @property
    def n_groups(self) -> int:
        return len(self.group_sizes)

    @staticmethod
    def empty() -> "RankingDataset":
        return RankingDataset(np.zeros((0, len(LTR_FEATURES))), np.zeros(0), [], np.zeros(0))


@dataclass
class TemporalSplit:
    train: RankingDataset
    validation: RankingDataset
    test: RankingDataset
    train_end: datetime
    validation_end: datetime
    data_source: str  # "real" | "synthetic" | "mixed"


def _utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


def load_events(session: Session, include_synthetic: bool = False) -> tuple[list[EventRow], str]:
    query = select(
        UserEvent.user_id, UserEvent.product_id, UserEvent.event_type, UserEvent.occurred_at, UserEvent.is_synthetic
    ).where(UserEvent.user_id.is_not(None), UserEvent.product_id.is_not(None))
    if not include_synthetic:
        query = query.where(UserEvent.is_synthetic.is_(False))
    rows = session.execute(query.order_by(UserEvent.occurred_at)).all()
    flags = {bool(r[4]) for r in rows}
    source = "mixed" if flags == {True, False} else ("synthetic" if flags == {True} else "real")
    return [EventRow(u, p, EventType(t), _utc(at)) for u, p, t, at, _ in rows], source


def load_profiles(session: Session, user_ids: set[int]) -> dict[int, UserProfile]:
    from app.services.profile_service import _user_query, to_domain_profile

    profiles = {}
    for user in session.scalars(_user_query().where(User.user_id.in_(user_ids))).unique():
        profile = to_domain_profile(user)
        if profile is not None:
            profiles[user.user_id] = profile
    return profiles


def temporal_bounds(events: Sequence[EventRow], ratios: tuple[float, float, float] = (0.8, 0.1, 0.1)) -> tuple[datetime, datetime]:
    """Cut the timeline by event count: the first 80 % of events are 'the past'."""
    if not events:
        raise ValueError("No events")
    times = sorted(e.occurred_at for e in events)
    train_end = times[min(len(times) - 1, int(len(times) * ratios[0]))]
    validation_end = times[min(len(times) - 1, int(len(times) * (ratios[0] + ratios[1])))]
    return train_end, validation_end


def point_in_time_popularity(
    events: Sequence[EventRow], cutoff: datetime, config: RecommenderConfig
) -> dict[int, float]:
    window_start = cutoff - timedelta(days=config.popularity.window_days)
    scores: dict[int, float] = defaultdict(float)
    for e in events:
        if window_start <= e.occurred_at < cutoff:
            scores[e.product_id] += decayed_weight(e.event_type, e.occurred_at, cutoff, config.behavior)
    return compute_popularity(scores, {}, config.popularity)


def build_snapshot(
    user_events: Mapping[int, Sequence[EventRow]],
    profiles: Mapping[int, UserProfile],
    index: CatalogIndex,
    config: RecommenderConfig,
    cutoff: datetime,
    horizon: timedelta,
    popularity: Mapping[int, float],
    unexposed_negatives: int = 0,
    rng: random.Random | None = None,
) -> tuple[list[list[float]], list[int], list[int], list[float], list[tuple[int, int, datetime]]]:
    rng = rng or random.Random(0)
    weights = config.weights_for(RecommendationType.FOR_YOU)
    X: list[list[float]] = []
    y: list[int] = []
    groups: list[int] = []
    baseline: list[float] = []
    keys: list[tuple[int, int, datetime]] = []
    end = cutoff + horizon

    for user_id, events in user_events.items():
        future = [e for e in events if cutoff <= e.occurred_at < end]
        if not future:
            continue
        labels: dict[int, int] = {}
        exposed: set[int] = set()
        for e in future:
            if e.event_type == EventType.IMPRESSION:
                exposed.add(e.product_id)
            elif e.event_type in LABEL_GRADES:
                labels[e.product_id] = max(labels.get(e.product_id, 0), LABEL_GRADES[e.event_type])
        if not labels:
            continue
        candidates = set(labels) | exposed
        if unexposed_negatives:
            pool = [pid for pid in index.by_id if pid not in candidates]
            candidates |= set(rng.sample(pool, min(unexposed_negatives, len(pool))))
        profile = profiles.get(user_id)
        candidates = {
            pid for pid in candidates
            if pid in index.by_id
            and (
                violated_constraint(index.by_id[pid], profile, config.filters) is None
                or labels.get(pid, 0) > 0  # keep real positives even if the profile now forbids them
            )
        }
        if len(candidates) < 2 or not any(labels.get(pid, 0) > 0 for pid in candidates):
            continue

        history = [e for e in events if e.occurred_at < cutoff]
        interest = product_interest(
            [Interaction(e.product_id, e.event_type, e.occurred_at) for e in history], config.behavior, now=cutoff
        )
        affinity = affinity_scorer(interest, index.by_id)
        seeds = dict(sorted(interest.items(), key=lambda kv: kv[1], reverse=True)[: config.behavior.max_seed_products])
        seed_query = index.seed_vector(seeds) if seeds else None
        seed_sims = index.scores_for(seed_query) if seed_query is not None else None
        behavior = user_product_behavior(history, cutoff, index.by_id)

        size = 0
        for pid in sorted(candidates):
            product: ProductRecord = replace(index.by_id[pid], popularity=popularity.get(pid, 0.0))
            scored = score_product(
                product, profile, weights,
                content_similarity=float(seed_sims[index.row_of[pid]]) if seed_sims is not None else None,
                behavior_affinity=affinity(product) if affinity else None,
            )
            X.append(feature_row(scored, product, behavior.get(pid)))
            y.append(labels.get(pid, 0))
            baseline.append(scored.score)
            keys.append((user_id, pid, cutoff))
            size += 1
        groups.append(size)
    return X, y, groups, baseline, keys


def build_dataset(
    events: Sequence[EventRow],
    profiles: Mapping[int, UserProfile],
    index: CatalogIndex,
    config: RecommenderConfig,
    cutoffs: Sequence[datetime],
    horizon: timedelta,
    unexposed_negatives: int = 0,
) -> RankingDataset:
    by_user: dict[int, list[EventRow]] = defaultdict(list)
    for e in events:
        by_user[e.user_id].append(e)
    X: list[list[float]] = []
    y: list[int] = []
    groups: list[int] = []
    baseline: list[float] = []
    keys: list[tuple[int, int, datetime]] = []
    rng = random.Random(42)
    for cutoff in cutoffs:
        popularity = point_in_time_popularity(events, cutoff, config)
        sx, sy, sg, sb, sk = build_snapshot(
            by_user, profiles, index, config, cutoff, horizon, popularity, unexposed_negatives, rng
        )
        X += sx
        y += sy
        groups += sg
        baseline += sb
        keys += sk
    if not X:
        return RankingDataset.empty()
    return RankingDataset(np.array(X, dtype=float), np.array(y, dtype=float), groups, np.array(baseline), keys)


def cutoffs_between(start: datetime, end: datetime, step: timedelta) -> list[datetime]:
    result = []
    current = start
    while current < end:
        result.append(current)
        current += step
    return result


def temporal_split(
    events: Sequence[EventRow],
    profiles: Mapping[int, UserProfile],
    index: CatalogIndex,
    config: RecommenderConfig,
    *,
    horizon: timedelta = timedelta(days=7),
    step: timedelta = timedelta(days=7),
    min_history: timedelta = timedelta(days=7),
    ratios: tuple[float, float, float] = (0.8, 0.1, 0.1),
    data_source: str = "real",
    unexposed_negatives: int = 0,
) -> TemporalSplit:
    """Snapshots whose label window ends before `train_end` train the model;
    the next ones validate it; the last ones test it. Windows never overlap
    two periods, so nothing from the future leaks into training labels."""
    train_end, validation_end = temporal_bounds(events, ratios)
    first = min(e.occurred_at for e in events) + min_history
    last = max(e.occurred_at for e in events)

    def build(start: datetime, stop: datetime) -> RankingDataset:
        cutoffs = [c for c in cutoffs_between(start, stop, step) if c + horizon <= stop]
        return build_dataset(events, profiles, index, config, cutoffs, horizon, unexposed_negatives)

    return TemporalSplit(
        train=build(first, train_end),
        validation=build(train_end, validation_end),
        test=build(validation_end, last + timedelta(seconds=1)),
        train_end=train_end,
        validation_end=validation_end,
        data_source=data_source,
    )

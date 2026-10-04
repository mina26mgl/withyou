"""Behaviour tracking. `user_events` is the single source of behavioural data:
wishlist changes and synced orders are written there too, so nothing is
counted twice."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Product, User, UserEvent
from app.ml.features import EventRow
from app.recommender.domain import EventType, Interaction
from app.schemas.event import EventBatchResult, EventIn, RejectedEvent

logger = logging.getLogger(__name__)

# Event types that carry an opinion about a product (impressions and searches don't).
INTERACTION_TYPES = tuple(t.value for t in EventType if t not in (EventType.IMPRESSION, EventType.SEARCH))


def record_events(session: Session, events: Sequence[EventIn], *, synthetic: bool = False) -> EventBatchResult:
    """Validate references in bulk, store the valid events, report the others."""
    user_ids = {e.user_id for e in events if e.user_id is not None}
    product_ids = {e.product_id for e in events if e.product_id is not None}
    # user_id -> is_synthetic: events of a synthetic user are always synthetic.
    known_users = (
        dict(session.execute(select(User.user_id, User.is_synthetic).where(User.user_id.in_(user_ids))).all())
        if user_ids
        else {}
    )
    known_products = (
        set(session.scalars(select(Product.product_id).where(Product.product_id.in_(product_ids))))
        if product_ids
        else set()
    )
    now = datetime.now(timezone.utc)
    rejected: list[RejectedEvent] = []
    rows: list[UserEvent] = []
    for index, event in enumerate(events):
        if event.user_id is not None and event.user_id not in known_users:
            rejected.append(RejectedEvent(index=index, reason="unknown_user"))
            continue
        if event.product_id is not None and event.product_id not in known_products:
            rejected.append(RejectedEvent(index=index, reason="unknown_product"))
            continue
        occurred_at = event.occurred_at or now
        if occurred_at.tzinfo is None:
            occurred_at = occurred_at.replace(tzinfo=timezone.utc)
        if occurred_at > now + timedelta(minutes=5):
            rejected.append(RejectedEvent(index=index, reason="occurred_in_the_future"))
            continue
        rows.append(
            UserEvent(
                user_id=event.user_id,
                product_id=event.product_id,
                session_id=event.session_id,
                event_type=event.event_type.value,
                occurred_at=occurred_at,
                event_metadata=event.metadata,
                is_synthetic=synthetic or bool(known_users.get(event.user_id, False)),
            )
        )
    session.add_all(rows)
    session.commit()
    if rejected:
        logger.info("Events: %d accepted, %d rejected", len(rows), len(rejected))
    return EventBatchResult(accepted=len(rows), rejected=rejected)


def add_server_event(
    session: Session,
    user_id: int,
    product_id: int,
    event_type: EventType,
    metadata: dict[str, Any] | None = None,
    occurred_at: datetime | None = None,
    synthetic: bool = False,
) -> None:
    """Event emitted by the backend itself (wishlist, synced orders). Not committed."""
    session.add(
        UserEvent(
            user_id=user_id,
            product_id=product_id,
            event_type=event_type.value,
            occurred_at=occurred_at or datetime.now(timezone.utc),
            event_metadata={"source": "server", **(metadata or {})},
            is_synthetic=synthetic,
        )
    )


def load_user_events(session: Session, user_id: int, days: int) -> list[EventRow]:
    since = datetime.now(timezone.utc) - timedelta(days=days)
    rows = session.execute(
        select(UserEvent.product_id, UserEvent.event_type, UserEvent.occurred_at)
        .where(
            UserEvent.user_id == user_id,
            UserEvent.product_id.is_not(None),
            UserEvent.event_type.in_(INTERACTION_TYPES),
            UserEvent.occurred_at >= since,
        )
        .order_by(UserEvent.occurred_at)
    )
    return [EventRow(user_id, pid, EventType(t), at) for pid, t, at in rows]


def to_interactions(events: Sequence[EventRow]) -> list[Interaction]:
    return [Interaction(e.product_id, e.event_type, e.occurred_at) for e in events]

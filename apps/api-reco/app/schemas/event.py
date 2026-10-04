from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, model_validator

from app.recommender.domain import EventType

MAX_BATCH_SIZE = 500


class EventIn(BaseModel):
    event_type: EventType
    user_id: int | None = None
    session_id: str | None = Field(default=None, max_length=64)
    product_id: int | None = None
    occurred_at: datetime | None = Field(default=None, description="Client time; server time when omitted.")
    metadata: dict[str, Any] = Field(
        default_factory=dict,
        description="Free context: request_id / position / list of the recommendation shown, search query, page...",
    )

    @model_validator(mode="after")
    def _check(self):
        if self.user_id is None and not self.session_id:
            raise ValueError("user_id or session_id is required")
        if self.event_type != EventType.SEARCH and self.product_id is None:
            raise ValueError(f"product_id is required for {self.event_type.value}")
        return self


class EventBatchIn(BaseModel):
    events: list[EventIn] = Field(min_length=1, max_length=MAX_BATCH_SIZE)


class RejectedEvent(BaseModel):
    index: int
    reason: str


class EventBatchResult(BaseModel):
    accepted: int
    rejected: list[RejectedEvent]

from fastapi import APIRouter, status

from app.api.deps import DbSession
from app.core.errors import ValidationFailed
from app.schemas.event import EventBatchIn, EventBatchResult, EventIn
from app.services import event_service

router = APIRouter(prefix="/events", tags=["events"])


@router.post("", response_model=EventBatchResult, status_code=status.HTTP_202_ACCEPTED)
def track_event(body: EventIn, db: DbSession) -> EventBatchResult:
    result = event_service.record_events(db, [body])
    if result.rejected:
        raise ValidationFailed(result.rejected[0].reason)
    return result


@router.post("/batch", response_model=EventBatchResult, status_code=status.HTTP_202_ACCEPTED)
def track_events(body: EventBatchIn, db: DbSession) -> EventBatchResult:
    """Preferred by the frontend: buffer events and flush every few seconds / on page hide.
    Invalid events are reported individually; valid ones are stored."""
    return event_service.record_events(db, body.events)

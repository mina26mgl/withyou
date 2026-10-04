from fastapi import APIRouter, status

from app.api.deps import DbSession
from app.schemas.profile import OnboardingRequest, ProfileResponse
from app.services import profile_service

router = APIRouter(tags=["onboarding"])


@router.post("/onboarding", response_model=ProfileResponse, status_code=status.HTTP_201_CREATED)
def submit_onboarding(body: OnboardingRequest, db: DbSession) -> ProfileResponse:
    """Create or replace the beauty profile. Creates the user if needed."""
    return profile_service.to_response(profile_service.onboard(db, body))

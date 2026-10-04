from fastapi import APIRouter

from app.recommender.domain import EventType, FragrancePreference
from app.recommender.vocabulary import AVOIDABLE_FAMILIES, CONCERNS, ROLE_LABELS, SKIN_TYPES, TEXTURES
from app.schemas.common import CodeLabel, ReferenceData

router = APIRouter(prefix="/reference", tags=["reference"])


@router.get("", response_model=ReferenceData)
def reference_data() -> ReferenceData:
    """Choices for the onboarding UI, so the frontend never hard-codes them."""
    return ReferenceData(
        skin_types=[CodeLabel(code=c, label=l) for c, l in SKIN_TYPES.items()] + [CodeLabel(code="unknown", label="Je ne sais pas")],
        concerns=[CodeLabel(code=c, label=l) for c, l in CONCERNS.items()],
        routine_roles=[CodeLabel(code=r.value, label=l) for r, l in ROLE_LABELS.items()],
        textures=list(TEXTURES),
        fragrance_preferences=[f.value for f in FragrancePreference],
        avoidable_ingredient_families=list(AVOIDABLE_FAMILIES),
        event_types=[e.value for e in EventType],
    )

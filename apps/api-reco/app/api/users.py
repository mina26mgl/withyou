from fastapi import APIRouter, Response, status

from app.api.deps import DbSession
from app.schemas.common import WishlistItemOut
from app.schemas.profile import ProfilePatch, ProfileResponse, UserSummary
from app.services import profile_service, wishlist_service

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/by-external/{external_id}", response_model=UserSummary)
def get_user_by_external_id(external_id: str, db: DbSession) -> UserSummary:
    """Map an api-core consumer UUID to the user_id of this service."""
    return profile_service.user_summary(profile_service.find_user_by_external_id(db, external_id))


@router.get("/{user_id}/profile", response_model=ProfileResponse)
def get_profile(user_id: int, db: DbSession) -> ProfileResponse:
    return profile_service.to_response(profile_service.get_user(db, user_id))


@router.patch("/{user_id}/profile", response_model=ProfileResponse)
def patch_profile(user_id: int, body: ProfilePatch, db: DbSession) -> ProfileResponse:
    return profile_service.to_response(profile_service.patch_profile(db, user_id, body))


@router.get("/{user_id}/wishlist", response_model=list[WishlistItemOut])
def get_wishlist(user_id: int, db: DbSession) -> list[WishlistItemOut]:
    return wishlist_service.list_wishlist(db, user_id)


@router.put(
    "/{user_id}/wishlist/{product_id}",
    status_code=status.HTTP_201_CREATED,
    responses={204: {"description": "Already in the wishlist"}},
)
def add_to_wishlist(user_id: int, product_id: int, db: DbSession) -> Response:
    """Idempotent: 201 when added, 204 when it was already there."""
    created = wishlist_service.add_to_wishlist(db, user_id, product_id)
    return Response(status_code=status.HTTP_201_CREATED if created else status.HTTP_204_NO_CONTENT)


@router.delete("/{user_id}/wishlist/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_from_wishlist(user_id: int, product_id: int, db: DbSession) -> Response:
    wishlist_service.remove_from_wishlist(db, user_id, product_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

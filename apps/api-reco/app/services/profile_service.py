"""Users, onboarding answers and their conversion into the engine's UserProfile."""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.errors import ConflictError, NotFoundError, ValidationFailed
from app.db.models import (
    BeautyProfile,
    Brand,
    Category,
    Concern,
    SkinType,
    User,
    UserBrandPreference,
    UserCategoryPreference,
    UserConcern,
    UserIngredientPreference,
)
from app.db.reference_data import get_or_create_ingredient
from app.recommender.domain import FragrancePreference, PreferenceType, UserProfile
from app.recommender.vocabulary import family_head
from app.schemas.profile import (
    ConcernRef,
    IngredientRef,
    OnboardingRequest,
    ProfilePatch,
    ProfileResponse,
    UserSummary,
)


def _user_query():
    return select(User).options(
        selectinload(User.profile),
        selectinload(User.concerns),
        selectinload(User.ingredient_preferences),
        selectinload(User.category_preferences),
        selectinload(User.brand_preferences),
    )


def get_user(session: Session, user_id: int) -> User:
    user = session.scalars(_user_query().where(User.user_id == user_id)).unique().one_or_none()
    if user is None:
        raise NotFoundError(f"User {user_id} not found")
    return user


def find_user_by_external_id(session: Session, external_id: str) -> User:
    user = session.scalars(_user_query().where(User.external_id == external_id)).unique().one_or_none()
    if user is None:
        raise NotFoundError(f"No user with external_id {external_id}")
    return user


def user_summary(user: User) -> UserSummary:
    return UserSummary(
        user_id=user.user_id, external_id=user.external_id, email=user.email, has_profile=user.profile is not None
    )


def _resolve_user(session: Session, request: OnboardingRequest) -> User:
    if request.user_id is not None:
        return get_user(session, request.user_id)
    user = None
    if request.external_id:
        user = session.scalars(_user_query().where(User.external_id == request.external_id)).unique().one_or_none()
    if user is None and request.email:
        user = session.scalars(_user_query().where(User.email == request.email)).unique().one_or_none()
    if user is None:
        user = User(external_id=request.external_id, email=request.email)
        session.add(user)
        session.flush()
    elif request.external_id and user.external_id not in (None, request.external_id):
        raise ConflictError("This email belongs to another external_id")
    return user


def _check_ids_exist(session: Session, column: Any, ids: list[int], label: str) -> None:
    found = set(session.scalars(select(column).where(column.in_(ids))))
    missing = sorted(set(ids) - found)
    if missing:
        raise ValidationFailed(f"Unknown {label}: {missing}")


def _apply_fields(session: Session, user: User, fields: dict[str, Any]) -> None:
    profile = user.profile
    if profile is None:
        profile = BeautyProfile(user_id=user.user_id, fragrance_preference=FragrancePreference.NO_PREFERENCE.value)
        session.add(profile)
        user.profile = profile

    if "skin_type" in fields:
        code = fields["skin_type"]
        # Assign the relationship (not only the FK) so the loaded profile is not stale.
        profile.skin_type = (
            None if code in (None, "unknown") else session.scalar(select(SkinType).where(SkinType.name == code))
        )
    for name in ("sensitivity", "texture_preference"):
        if name in fields:
            setattr(profile, name, fields[name])
    if fields.get("currency"):
        profile.currency = fields["currency"].upper()
    if "fragrance_preference" in fields:
        value = fields["fragrance_preference"] or FragrancePreference.NO_PREFERENCE
        profile.fragrance_preference = FragrancePreference(value).value
    for name in ("budget_min", "budget_max"):
        if name in fields:
            setattr(profile, name, None if fields[name] is None else Decimal(str(fields[name])))
    if profile.budget_min is not None and profile.budget_max is not None and profile.budget_min > profile.budget_max:
        raise ValidationFailed("budget_min must be <= budget_max")

    if fields.get("concerns") is not None:
        codes: list[str] = fields["concerns"]
        concerns = {c.name: c for c in session.scalars(select(Concern).where(Concern.name.in_(codes)))}
        user.concerns.clear()
        session.flush()
        for priority, code in enumerate(codes, start=1):
            user.concerns.append(UserConcern(concern_id=concerns[code].concern_id, priority=priority))

    if fields.get("preferred_category_ids") is not None:
        ids = list(dict.fromkeys(fields["preferred_category_ids"]))
        _check_ids_exist(session, Category.category_id, ids, "category ids")
        user.category_preferences.clear()
        session.flush()
        user.category_preferences.extend(UserCategoryPreference(category_id=i) for i in ids)

    if fields.get("preferred_brand_ids") is not None:
        ids = list(dict.fromkeys(fields["preferred_brand_ids"]))
        _check_ids_exist(session, Brand.brand_id, ids, "brand ids")
        user.brand_preferences.clear()
        session.flush()
        user.brand_preferences.extend(UserBrandPreference(brand_id=i) for i in ids)

    for field_name, preference in (("ingredients_to_avoid", PreferenceType.AVOID), ("ingredients_preferred", PreferenceType.PREFER)):
        names = fields.get(field_name)
        if names is None:
            continue
        kept = [p for p in user.ingredient_preferences if p.preference_type != preference.value]
        user.ingredient_preferences[:] = kept
        session.flush()
        other_kind = {p.ingredient_id for p in kept}
        seen: set[int] = set()
        for raw in names:
            ingredient = get_or_create_ingredient(session, raw)
            if ingredient is None or ingredient.ingredient_id in seen:
                continue
            if ingredient.ingredient_id in other_kind:
                raise ValidationFailed(f"Ingredient {raw!r} cannot be both preferred and avoided")
            seen.add(ingredient.ingredient_id)
            user.ingredient_preferences.append(
                UserIngredientPreference(ingredient_id=ingredient.ingredient_id, preference_type=preference.value)
            )
    profile.updated_at = datetime.now(timezone.utc)


def onboard(session: Session, request: OnboardingRequest) -> User:
    user = _resolve_user(session, request)
    fields = request.model_dump(exclude={"user_id", "external_id", "email"}, exclude_unset=False)
    _apply_fields(session, user, fields)
    user.profile.onboarding_completed_at = datetime.now(timezone.utc)  # type: ignore[union-attr]
    session.commit()
    return get_user(session, user.user_id)


def patch_profile(session: Session, user_id: int, patch: ProfilePatch) -> User:
    user = get_user(session, user_id)
    _apply_fields(session, user, patch.model_dump(exclude_unset=True))
    session.commit()
    return get_user(session, user_id)


def to_response(user: User) -> ProfileResponse:
    profile = user.profile
    if profile is None:
        raise NotFoundError(f"User {user.user_id} has no beauty profile yet")
    prefs = user.ingredient_preferences

    def refs(kind: PreferenceType) -> list[IngredientRef]:
        return [
            IngredientRef(ingredient_id=p.ingredient_id, name=p.ingredient.display_name, family=p.ingredient.family)
            for p in prefs
            if p.preference_type == kind.value
        ]

    return ProfileResponse(
        user_id=user.user_id,
        external_id=user.external_id,
        email=user.email,
        skin_type=profile.skin_type.name if profile.skin_type else "unknown",
        sensitivity=profile.sensitivity,
        concerns=[ConcernRef(code=c.concern.name, label=c.concern.label, priority=c.priority) for c in user.concerns],
        budget_min=float(profile.budget_min) if profile.budget_min is not None else None,
        budget_max=float(profile.budget_max) if profile.budget_max is not None else None,
        currency=profile.currency,
        fragrance_preference=FragrancePreference(profile.fragrance_preference),
        texture_preference=profile.texture_preference,
        preferred_category_ids=[p.category_id for p in user.category_preferences],
        preferred_brand_ids=[p.brand_id for p in user.brand_preferences],
        ingredients_to_avoid=refs(PreferenceType.AVOID),
        ingredients_preferred=refs(PreferenceType.PREFER),
        onboarding_completed_at=profile.onboarding_completed_at,
        updated_at=profile.updated_at,
    )


def to_domain_profile(user: User) -> UserProfile | None:
    profile = user.profile
    if profile is None:
        return None
    avoided = [p.ingredient for p in user.ingredient_preferences if p.preference_type == PreferenceType.AVOID.value]
    return UserProfile(
        user_id=user.user_id,
        skin_type=profile.skin_type.name if profile.skin_type else None,
        sensitivity=profile.sensitivity,
        concerns={c.concern.name: c.priority for c in user.concerns},
        budget_min=float(profile.budget_min) if profile.budget_min is not None else None,
        budget_max=float(profile.budget_max) if profile.budget_max is not None else None,
        fragrance_preference=FragrancePreference(profile.fragrance_preference),
        texture_preference=profile.texture_preference,
        preferred_category_ids={p.category_id for p in user.category_preferences},
        preferred_brand_ids={p.brand_id for p in user.brand_preferences},
        preferred_ingredient_ids={
            p.ingredient_id for p in user.ingredient_preferences if p.preference_type == PreferenceType.PREFER.value
        },
        avoided_ingredient_ids={i.ingredient_id for i in avoided},
        avoided_families={family for family in (family_head(i.name) for i in avoided) if family},
    )


def load_domain_profile(session: Session, user_id: int | None) -> UserProfile | None:
    if user_id is None:
        return None
    return to_domain_profile(get_user(session, user_id))

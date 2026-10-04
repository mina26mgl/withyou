"""Idempotent seeding of reference tables (skin types, concerns, ingredient families)."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Concern, Ingredient, SkinType
from app.recommender.vocabulary import AVOIDABLE_FAMILIES, CONCERNS, SKIN_TYPES, ingredient_family, normalize_text


def get_or_create_ingredient(session: Session, raw_name: str) -> Ingredient | None:
    name = normalize_text(raw_name)
    if not name:
        return None
    ingredient = session.scalar(select(Ingredient).where(Ingredient.name == name))
    if ingredient is None:
        ingredient = Ingredient(name=name, display_name=raw_name.strip()[:160], family=ingredient_family(name))
        session.add(ingredient)
        session.flush()
    elif ingredient.family is None and ingredient_family(name):
        ingredient.family = ingredient_family(name)  # vocabulary learned a new family since
    return ingredient


def seed_reference_data(session: Session) -> None:
    existing_skin = set(session.scalars(select(SkinType.name)))
    for name, label in SKIN_TYPES.items():
        if name not in existing_skin:
            session.add(SkinType(name=name, label=label))

    existing_concerns = set(session.scalars(select(Concern.name)))
    for name, label in CONCERNS.items():
        if name not in existing_concerns:
            session.add(Concern(name=name, label=label))

    # One ingredient row per family, so users can avoid a whole family.
    for family in AVOIDABLE_FAMILIES:
        get_or_create_ingredient(session, family)
    session.commit()

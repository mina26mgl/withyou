"""Idempotent catalogue upserts, shared by the dev seed and the api-core sync."""

from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Brand, Category, Concern, Product, ProductConcern, ProductIngredient, ProductSkinType, SkinType
from app.db.reference_data import get_or_create_ingredient
from app.recommender.domain import DataSource, RoutineRole, UsageTime


@dataclass
class ProductSpec:
    external_id: str
    name: str
    price: float
    data_source: DataSource
    brand_name: str | None = None
    brand_external_id: str | None = None
    category_name: str | None = None
    category_external_id: str | None = None
    description: str = ""
    currency: str = "DZD"
    available: bool = True
    routine_role: RoutineRole = RoutineRole.OTHER
    texture: str | None = None
    usage_time: UsageTime | None = None
    is_bundle: bool = False
    image_url: str | None = None
    skin_types: dict[str, float] = field(default_factory=dict)  # canonical code -> score
    concerns: dict[str, float] = field(default_factory=dict)
    ingredients: list[str] = field(default_factory=list)


class CatalogWriter:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.skin_types = {s.name: s.skin_type_id for s in session.scalars(select(SkinType))}
        self.concerns = {c.name: c.concern_id for c in session.scalars(select(Concern))}
        self._brands: dict[str, Brand] = {}
        self._categories: dict[str, Category] = {}

    def brand(self, name: str, external_id: str | None = None) -> Brand:
        key = external_id or f"name:{name}"
        if key in self._brands:
            return self._brands[key]
        brand = None
        if external_id:
            brand = self.session.scalar(select(Brand).where(Brand.external_id == external_id))
        if brand is None:
            brand = self.session.scalar(select(Brand).where(Brand.name == name))
        if brand is None:
            brand = Brand(name=name, external_id=external_id)
            self.session.add(brand)
        else:
            brand.name = name
            brand.external_id = brand.external_id or external_id
        self.session.flush()
        self._brands[key] = brand
        return brand

    def category(self, name: str, external_id: str | None = None, parent: Category | None = None) -> Category:
        key = external_id or f"name:{name}"
        if key in self._categories:
            return self._categories[key]
        category = None
        if external_id:
            category = self.session.scalar(select(Category).where(Category.external_id == external_id))
        if category is None:
            category = self.session.scalar(select(Category).where(Category.name == name))
        if category is None:
            category = Category(name=name, external_id=external_id)
            self.session.add(category)
        category.name = name
        category.external_id = category.external_id or external_id
        category.parent_category_id = parent.category_id if parent else None
        self.session.flush()
        self._categories[key] = category
        return category

    def category_by_key(self, name: str | None, external_id: str | None) -> Category | None:
        if external_id and external_id in self._categories:
            return self._categories[external_id]
        if name:
            return self._categories.get(f"name:{name}") or self.category(name, external_id)
        return None

    def upsert_product(self, spec: ProductSpec) -> Product:
        product = self.session.scalar(select(Product).where(Product.external_id == spec.external_id))
        if product is None:
            product = Product(external_id=spec.external_id)
            self.session.add(product)
        product.name = spec.name[:255]
        product.description = spec.description or ""
        product.price = Decimal(str(spec.price))
        product.currency = spec.currency
        product.available = spec.available
        if not product.routine_role_locked:
            product.routine_role = spec.routine_role.value
        product.texture = spec.texture
        product.usage_time = spec.usage_time.value if spec.usage_time else None
        product.is_bundle = spec.is_bundle
        product.image_url = spec.image_url
        product.data_source = spec.data_source.value
        if spec.brand_name:
            product.brand_id = self.brand(spec.brand_name, spec.brand_external_id).brand_id
        category = self.category_by_key(spec.category_name, spec.category_external_id)
        product.category_id = category.category_id if category else None
        self.session.flush()

        product.skin_types[:] = [
            ProductSkinType(skin_type_id=self.skin_types[code], compatibility_score=score)
            for code, score in spec.skin_types.items()
            if code in self.skin_types
        ]
        product.concerns[:] = [
            ProductConcern(concern_id=self.concerns[code], relevance_score=score)
            for code, score in spec.concerns.items()
            if code in self.concerns
        ]
        links: list[ProductIngredient] = []
        seen: set[int] = set()
        for position, raw in enumerate(spec.ingredients):
            ingredient = get_or_create_ingredient(self.session, raw)
            if ingredient is None or ingredient.ingredient_id in seen:
                continue
            seen.add(ingredient.ingredient_id)
            links.append(ProductIngredient(ingredient_id=ingredient.ingredient_id, position=position))
        product.ingredients[:] = links
        self.session.flush()
        return product

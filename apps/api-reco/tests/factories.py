"""Tiny hand-built catalogue for engine unit tests (no database)."""

from __future__ import annotations

from app.recommender.catalog_index import CatalogIndex
from app.recommender.config import RecommenderConfig
from app.recommender.domain import ProductRecord, RoutineRole, UsageTime
from app.recommender.engine import RecommendationEngine

# Ingredient ids
WATER, GLYCERIN, SALICYLIC, NIACINAMIDE, SHEA, PARFUM, RETINOL, GLYCOLIC, ZINC_OXIDE, ALCOHOL = range(1, 11)

FAMILIES = {PARFUM: "fragrance", RETINOL: "retinoid", GLYCOLIC: "aha", SALICYLIC: "bha", ALCOHOL: "drying_alcohol"}


def product(pid: int, name: str, role: RoutineRole, price: float, *, brand: int = 1, category: int = 1, **kwargs) -> ProductRecord:
    ingredients = frozenset(kwargs.pop("ingredients", (WATER, GLYCERIN)))
    return ProductRecord(
        product_id=pid,
        name=name,
        price=price,
        brand_id=brand,
        brand_name=f"Brand {brand}",
        category_id=category,
        category_name=f"Category {category}",
        routine_role=role,
        ingredient_ids=ingredients,
        ingredient_families=frozenset(FAMILIES[i] for i in ingredients if i in FAMILIES),
        **kwargs,
    )


def catalog() -> list[ProductRecord]:
    return [
        product(1, "Gel nettoyant purifiant", RoutineRole.CLEANSER, 1200, brand=1, category=1,
                skin_types={"oily": 1.0}, concerns={"acne": 1.0}, ingredients=(WATER, SALICYLIC),
                description="gel moussant purifiant acide salicylique imperfections"),
        product(2, "Lait nettoyant doux", RoutineRole.CLEANSER, 1100, brand=2, category=1,
                skin_types={"dry": 1.0, "sensitive": 1.0}, concerns={"dryness": 0.8},
                description="lait nettoyant doux apaisant peau seche"),
        product(3, "Sérum niacinamide", RoutineRole.SERUM, 2300, brand=3, category=2,
                skin_types={"oily": 1.0, "combination": 0.9}, concerns={"acne": 0.9, "pores": 1.0},
                ingredients=(WATER, NIACINAMIDE), description="serum niacinamide pores imperfections sebum"),
        product(4, "Sérum rétinol", RoutineRole.SERUM, 3500, brand=1, category=2,
                skin_types={"normal": 1.0}, concerns={"aging": 1.0}, ingredients=(WATER, RETINOL), usage_time=UsageTime.PM,
                description="serum retinol rides anti-age nuit"),
        product(5, "Crème riche parfumée", RoutineRole.MOISTURIZER, 2200, brand=2, category=3,
                skin_types={"dry": 1.0}, concerns={"dryness": 1.0}, ingredients=(WATER, SHEA, PARFUM),
                popularity=1.0, description="creme riche karite parfum nourrissante"),
        product(6, "Gel-crème léger", RoutineRole.MOISTURIZER, 1900, brand=3, category=3,
                skin_types={"oily": 1.0, "combination": 1.0}, concerns={"acne": 0.5},
                ingredients=(WATER, NIACINAMIDE), texture="gel", description="gel creme leger matifiant"),
        product(7, "SPF 50 fluide", RoutineRole.SUNSCREEN, 2800, brand=4, category=4,
                skin_types={"oily": 1.0, "normal": 1.0}, concerns={"hyperpigmentation": 0.8},
                ingredients=(WATER, ZINC_OXIDE), description="protection solaire spf 50"),
        product(8, "Toner AHA", RoutineRole.TONER, 2100, brand=4, category=5,
                skin_types={"normal": 1.0, "oily": 0.8}, concerns={"dullness": 1.0},
                ingredients=(WATER, GLYCOLIC), description="lotion exfoliante acide glycolique eclat"),
        product(9, "Crème légère indisponible", RoutineRole.MOISTURIZER, 1500, brand=4, category=3,
                skin_types={"oily": 1.0}, concerns={"acne": 1.0}, available=False, description="creme legere"),
        product(10, "Coffret peau grasse", RoutineRole.CLEANSER, 4000, brand=1, category=1, is_bundle=True,
                 skin_types={"oily": 1.0}, concerns={"acne": 1.0}, description="coffret routine peau grasse"),
        product(11, "Soin bouton alcoolisé", RoutineRole.TREATMENT, 1300, brand=5, category=6,
                skin_types={"oily": 1.0}, concerns={"acne": 1.0}, ingredients=(WATER, SALICYLIC, ALCOHOL),
                popularity=0.9, description="soin cible bouton asseche"),
        product(12, "Crème luxe", RoutineRole.MOISTURIZER, 9000, brand=5, category=3,
                skin_types={"oily": 1.0}, concerns={"acne": 1.0}, description="creme luxe peau grasse"),
    ]


def build_engine(config: RecommenderConfig | None = None, products: list[ProductRecord] | None = None) -> RecommendationEngine:
    config = config or RecommenderConfig()
    return RecommendationEngine(CatalogIndex(products or catalog(), config.encoder), config)

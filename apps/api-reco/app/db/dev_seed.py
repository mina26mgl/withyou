"""Loads data/dev_catalog.json: fictitious products for development and tests only."""

from __future__ import annotations

import json
import re
from pathlib import Path

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.db.models import Product
from app.db.reference_data import seed_reference_data
from app.recommender.domain import DataSource, RoutineRole, UsageTime
from app.services.catalog_writer import CatalogWriter, ProductSpec

DEFAULT_PATH = Path(__file__).resolve().parents[2] / "data" / "dev_catalog.json"


def slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def seed(session: Session, path: Path = DEFAULT_PATH, reset: bool = False) -> int:
    data = json.loads(path.read_text(encoding="utf-8"))
    seed_reference_data(session)
    if reset:
        session.execute(delete(Product).where(Product.data_source == DataSource.DEV_SEED.value))
        session.commit()

    writer = CatalogWriter(session)
    by_name = {}
    for entry in data["categories"]:  # parents are listed before children
        parent = by_name.get(entry["parent"]) if entry["parent"] else None
        by_name[entry["name"]] = writer.category(entry["name"], f"dev:cat:{slug(entry['name'])}", parent)
    for name in data["brands"]:
        writer.brand(name, f"dev:brand:{slug(name)}")

    for item in data["products"]:
        writer.upsert_product(
            ProductSpec(
                external_id=f"dev:{slug(item['brand'])}:{slug(item['name'])}",
                name=item["name"],
                price=item["price"],
                data_source=DataSource.DEV_SEED,
                brand_name=item["brand"],
                brand_external_id=f"dev:brand:{slug(item['brand'])}",
                category_name=item["category"],
                category_external_id=f"dev:cat:{slug(item['category'])}",
                description=item["description"],
                currency=data.get("currency", "DZD"),
                available=item.get("available", True),
                routine_role=RoutineRole(item["role"]),
                texture=item.get("texture"),
                usage_time=UsageTime(item["usage_time"]) if item.get("usage_time") else None,
                is_bundle=item.get("is_bundle", False),
                skin_types=item.get("skin_types", {}),
                concerns=item.get("concerns", {}),
                ingredients=item.get("ingredients", []),
            )
        )
    session.commit()
    return len(data["products"])

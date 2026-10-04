"""Import the REAL marketplace data of api-core (Prisma tables, schema `public`)
into the `reco` schema. Read-only on api-core; idempotent (upserts by external_id).

    python scripts/sync_core.py                 # catalogue + consumers + wishlists + orders
    python scripts/sync_core.py --catalog-only

What is mapped:
    categorie / marque / produit (+ image, avis)  -> categories / brands / products (+ product_stats ratings)
    produit.skin_types / needs / ingredients       -> product_skin_types / product_concerns / product_ingredients
    consomateur (quiz answers)                     -> users + beauty_profiles + user_concerns
    wishlist                                       -> wishlist_items + WISHLIST_ADD events (once)
    order / ligne_order                            -> orders + order_items + PURCHASE events (once)

Routine roles and textures are inferred from names/categories; a role set by
hand (products.routine_role_locked = true) is never overwritten.
"""

from __future__ import annotations

import argparse
import logging
from datetime import datetime, timezone
from decimal import Decimal

import _bootstrap  # noqa: F401
from sqlalchemy import create_engine, select, text
from sqlalchemy.engine import Connection
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.logging import configure_logging
from app.db.models import (
    BeautyProfile,
    Category,
    Concern,
    Order,
    OrderItem,
    Product,
    ProductStats,
    SkinType,
    User,
    UserConcern,
    WishlistItem,
)
from app.db.reference_data import seed_reference_data
from app.db.session import get_session_factory
from app.recommender.domain import DataSource, EventType
from app.recommender.vocabulary import (
    USAGE_TIME_ALIASES,
    infer_routine_role,
    infer_texture,
    normalize_concern,
    normalize_skin_type,
    normalize_text,
)
from app.services.catalog_writer import CatalogWriter, ProductSpec
from app.services.event_service import add_server_event
from app.services.stats_service import refresh_product_stats
from app.services.catalog_service import EngineProvider

logger = logging.getLogger("sync_core")

CANCELLED_ORDER_MARKERS = ("annul", "rembours", "refus")


def _skin_scores(labels: list[str]) -> dict[str, float]:
    scores: dict[str, float] = {}
    for label in labels or []:
        try:
            code = normalize_skin_type(label)
        except ValueError:
            logger.warning("Unknown product skin type %r ignored", label)
            continue
        if code:
            scores[code] = 1.0
    return scores


def _concern_scores(needs: list[str]) -> dict[str, float]:
    scores: dict[str, float] = {}
    for need in needs or []:
        code = normalize_concern(need)
        if code:
            scores[code] = 1.0
    return scores


def _clean_ingredients(raw: list[str]) -> list[str]:
    cleaned = []
    for item in raw or []:
        value = item.strip().strip(".;,()").strip()
        if len(normalize_text(value)) >= 2:
            cleaned.append(value)
    return cleaned


def sync_catalog(core: Connection, session: Session) -> int:
    writer = CatalogWriter(session)

    categories = core.execute(text("SELECT id_cat::text, nom, id_parent::text FROM categorie")).all()
    pending = {row[0]: row for row in categories}
    created: dict[str, Category] = {}
    while pending:  # parents first
        progressed = False
        for cid, (_, name, parent_id) in list(pending.items()):
            if parent_id and parent_id not in created and parent_id in pending:
                continue
            created[cid] = writer.category(name, cid, created.get(parent_id) if parent_id else None)
            del pending[cid]
            progressed = True
        if not progressed:  # cycle: attach the rest at the root
            for cid, (_, name, _) in pending.items():
                created[cid] = writer.category(name, cid, None)
            break

    rows = core.execute(
        text(
            """
            SELECT p.id_product::text, p.nom, p.description, p.prix, p.discount, p.stock, p.status::text,
                   p.skin_types, p.needs, p.ingredients, p.moment, p.is_pack,
                   m.id_marque::text, m.nom_marque, m.compte_status::text,
                   c.id_cat::text, c.nom,
                   (SELECT url FROM produit_image i WHERE i.id_produit = p.id_product
                     ORDER BY i.is_principale DESC, i.ordre LIMIT 1) AS image_url
            FROM produit p
            JOIN marque m ON m.id_marque = p.id_marque
            JOIN categorie c ON c.id_cat = p.id_categori
            """
        )
    ).all()
    for r in rows:
        (pid, name, description, price, discount, stock, status, skin_types, needs, ingredients, moment, is_pack,
         brand_id, brand_name, brand_status, cat_id, cat_name, image_url) = r
        final_price = Decimal(price) - Decimal(discount or 0)
        writer.upsert_product(
            ProductSpec(
                external_id=pid,
                name=name,
                price=float(max(final_price, Decimal(0))),
                data_source=DataSource.CORE_SYNC,
                brand_name=brand_name,
                brand_external_id=brand_id,
                category_name=cat_name,
                category_external_id=cat_id,
                description=description or "",
                available=status == "ONLINE" and brand_status == "ACTIVE" and (stock or 0) > 0,
                routine_role=infer_routine_role(name, cat_name, needs=needs),
                texture=infer_texture(name, cat_name),
                usage_time=USAGE_TIME_ALIASES.get(normalize_text(moment)) if moment else None,
                is_bundle=bool(is_pack),
                image_url=image_url,
                skin_types=_skin_scores(skin_types),
                concerns=_concern_scores(needs),
                ingredients=_clean_ingredients(ingredients),
            )
        )

    # Products removed from api-core stay (history references them) but are no longer recommended.
    known = {r[0] for r in rows}
    for product in session.scalars(select(Product).where(Product.data_source == DataSource.CORE_SYNC.value)):
        if product.external_id not in known:
            product.available = False

    ratings = core.execute(
        text("SELECT id_produit::text, AVG(stars)::float, COUNT(*) FROM avis GROUP BY id_produit")
    ).all()
    by_external = {p.external_id: p.product_id for p in session.scalars(select(Product))}
    for external_id, avg, count in ratings:
        product_id = by_external.get(external_id)
        if product_id is None:
            continue
        stats = session.get(ProductStats, product_id) or ProductStats(product_id=product_id)
        stats.avg_rating, stats.rating_count = avg, count
        session.add(stats)
    session.commit()
    return len(rows)


def sync_consumers(core: Connection, session: Session) -> int:
    skin_ids = {s.name: s.skin_type_id for s in session.scalars(select(SkinType))}
    concern_ids = {c.name: c.concern_id for c in session.scalars(select(Concern))}
    rows = core.execute(
        text(
            """
            SELECT c.id_consumer::text, u.email, c.type_peau, c.preoccupations, c.sensibilite, c.onboarding_done_at
            FROM consomateur c JOIN "user" u ON u.id_usr = c.id_usr
            """
        )
    ).all()
    for consumer_id, email, skin_labels, concerns, sensitivity, done_at in rows:
        user = session.scalar(select(User).where(User.external_id == consumer_id))
        if user is None:
            email_taken = email and session.scalar(select(User.user_id).where(User.email == email))
            user = User(external_id=consumer_id, email=None if email_taken else email)
            session.add(user)
            session.flush()
        if not skin_labels and not concerns and sensitivity is None:
            continue  # quiz not answered: keep the user without a profile

        codes = [c for c in (_safe_skin(label) for label in skin_labels or []) if c]
        skin = "combination" if len(set(codes)) > 1 else (codes[0] if codes else None)
        profile = session.get(BeautyProfile, user.user_id) or BeautyProfile(user_id=user.user_id)
        profile.skin_type_id = skin_ids.get(skin) if skin else None
        profile.sensitivity = sensitivity
        profile.onboarding_completed_at = done_at
        session.add(profile)

        session.query(UserConcern).filter(UserConcern.user_id == user.user_id).delete()
        seen: list[str] = []
        for label in concerns or []:
            code = normalize_concern(label)
            if code and code not in seen:
                seen.append(code)
        for priority, code in enumerate(seen[:10], start=1):
            session.add(UserConcern(user_id=user.user_id, concern_id=concern_ids[code], priority=priority))
    session.commit()
    return len(rows)


def _safe_skin(label: str) -> str | None:
    try:
        return normalize_skin_type(label)
    except ValueError:
        return None


def _maps(session: Session) -> tuple[dict[str, int], dict[str, int]]:
    users = {u.external_id: u.user_id for u in session.scalars(select(User).where(User.external_id.is_not(None)))}
    products = {
        p.external_id: p.product_id for p in session.scalars(select(Product).where(Product.external_id.is_not(None)))
    }
    return users, products


def sync_wishlists(core: Connection, session: Session) -> int:
    users, products = _maps(session)
    added = 0
    for consumer_id, product_external, created_at in core.execute(
        text("SELECT id_consumer::text, id_produit::text, created_at FROM wishlist")
    ):
        user_id, product_id = users.get(consumer_id), products.get(product_external)
        if user_id is None or product_id is None or session.get(WishlistItem, (user_id, product_id)):
            continue
        session.add(WishlistItem(user_id=user_id, product_id=product_id, created_at=created_at))
        add_server_event(
            session, user_id, product_id, EventType.WISHLIST_ADD, {"source": "core_sync"}, occurred_at=created_at
        )
        added += 1
    session.commit()
    return added


def sync_orders(core: Connection, session: Session) -> int:
    users, products = _maps(session)
    existing = set(session.scalars(select(Order.external_id).where(Order.external_id.is_not(None))))
    lines: dict[str, list[tuple[str, int, Decimal]]] = {}
    for order_id, product_external, quantity, unit_price in core.execute(
        text("SELECT id_order::text, id_product::text, quantite, prix_unitaire FROM ligne_order")
    ):
        lines.setdefault(order_id, []).append((product_external, quantity, unit_price))

    added = 0
    for order_id, consumer_id, status, total, created_at in core.execute(
        text('SELECT id_order::text, id_consumer::text, status, montant_total, created_at FROM "order"')
    ):
        user_id = users.get(consumer_id)
        if order_id in existing or user_id is None:
            continue
        if any(marker in (status or "").lower() for marker in CANCELLED_ORDER_MARKERS):
            continue
        created_at = created_at or datetime.now(timezone.utc)
        order = Order(external_id=order_id, user_id=user_id, status=status, total_amount=total, created_at=created_at)
        for product_external, quantity, unit_price in lines.get(order_id, []):
            product_id = products.get(product_external)
            if product_id is None:
                continue
            order.items.append(OrderItem(product_id=product_id, quantity=quantity, unit_price=unit_price))
            add_server_event(
                session, user_id, product_id, EventType.PURCHASE,
                {"source": "core_sync", "order_external_id": order_id, "quantity": quantity},
                occurred_at=created_at,
            )
        session.add(order)
        added += 1
    session.commit()
    return added


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--catalog-only", action="store_true")
    args = parser.parse_args()

    settings = get_settings()
    configure_logging(settings.log_level)
    core_engine = create_engine(settings.core_database_url or settings.database_url)
    with core_engine.connect() as core, get_session_factory()() as session:
        seed_reference_data(session)
        logger.info("Catalogue: %d products synced", sync_catalog(core, session))
        if not args.catalog_only:
            logger.info("Consumers: %d read", sync_consumers(core, session))
            logger.info("Wishlists: %d new items", sync_wishlists(core, session))
            logger.info("Orders: %d new orders", sync_orders(core, session))
        refresh_product_stats(session, EngineProvider(settings).config)


if __name__ == "__main__":
    main()

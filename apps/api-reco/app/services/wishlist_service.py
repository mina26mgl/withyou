from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
from app.db.models import Product, WishlistItem
from app.recommender.domain import EventType
from app.schemas.common import WishlistItemOut
from app.services.catalog_service import to_summary
from app.services.event_service import add_server_event
from app.services.profile_service import get_user


def list_wishlist(session: Session, user_id: int) -> list[WishlistItemOut]:
    get_user(session, user_id)
    rows = session.execute(
        select(WishlistItem, Product)
        .join(Product, Product.product_id == WishlistItem.product_id)
        .where(WishlistItem.user_id == user_id)
        .order_by(WishlistItem.created_at.desc())
    ).unique()
    return [WishlistItemOut(product=to_summary(product), added_at=item.created_at) for item, product in rows]


def add_to_wishlist(session: Session, user_id: int, product_id: int) -> bool:
    """Idempotent. Returns True when the product was not in the wishlist yet."""
    user = get_user(session, user_id)
    if session.get(Product, product_id) is None:
        raise NotFoundError(f"Product {product_id} not found")
    if session.get(WishlistItem, (user_id, product_id)) is not None:
        return False
    session.add(WishlistItem(user_id=user_id, product_id=product_id))
    add_server_event(session, user_id, product_id, EventType.WISHLIST_ADD, synthetic=user.is_synthetic)
    session.commit()
    return True


def remove_from_wishlist(session: Session, user_id: int, product_id: int) -> None:
    user = get_user(session, user_id)
    item = session.get(WishlistItem, (user_id, product_id))
    if item is None:
        raise NotFoundError(f"Product {product_id} is not in the wishlist of user {user_id}")
    session.delete(item)
    add_server_event(session, user_id, product_id, EventType.WISHLIST_REMOVE, synthetic=user.is_synthetic)
    session.commit()

"""SYNTHETIC users and interactions, to test the technical pipeline only
(events -> stats -> collaborative filtering -> LTR training).

    python scripts/generate_synthetic.py --users 300 --days 120
    python scripts/generate_synthetic.py --purge        # remove every synthetic row

Everything created here is flagged: users.is_synthetic, user_events.is_synthetic,
emails @example.invalid, metadata {"synthetic": true}. Training and stats
ignore these rows unless explicitly asked (--include-synthetic).

WARNING: the simulated users click according to a hand-written model that
re-uses the V0 rule score plus hidden tastes. Any model trained on these
events learns that hand-written model back. Its metrics validate that the
code runs end to end; they are NOT an evaluation of recommendation quality.
Replace with real events as soon as the marketplace is live.
"""

from __future__ import annotations

import argparse
import logging
import math
import random
import sys
from datetime import datetime, timedelta, timezone

import _bootstrap  # noqa: F401
from sqlalchemy import delete, select

from app.core.config import get_settings
from app.core.logging import configure_logging
from app.db.models import User, UserEvent
from app.db.session import get_session_factory
from app.recommender.catalog_index import CatalogIndex
from app.recommender.config import load_recommender_config
from app.recommender.domain import EventType, FragrancePreference, Interaction, UserContext
from app.recommender.engine import RecommendationEngine
from app.recommender.vocabulary import CONCERNS, SKIN_TYPES
from app.schemas.profile import OnboardingRequest
from app.services.catalog_service import load_product_records
from app.services.profile_service import onboard, to_domain_profile

logger = logging.getLogger("generate_synthetic")
GENERATOR_VERSION = "synthetic-v1"


def purge(session) -> None:
    deleted_events = session.execute(delete(UserEvent).where(UserEvent.is_synthetic.is_(True))).rowcount
    deleted_users = session.execute(delete(User).where(User.is_synthetic.is_(True))).rowcount
    session.commit()
    logger.info("Purged %d synthetic users and %d synthetic events", deleted_users, deleted_events)


def random_onboarding(rng: random.Random, user_id: int) -> OnboardingRequest:
    budget_max = rng.choice([None, 1500, 2500, 3500, 5000])
    return OnboardingRequest(
        user_id=user_id,
        skin_type=rng.choice([*SKIN_TYPES, "unknown"]),
        sensitivity=rng.choice([None, 0, 1, 2, 3, 4, 5]),
        concerns=rng.sample(list(CONCERNS), k=rng.randint(0, 3)),
        budget_max=budget_max,
        fragrance_preference=rng.choice(list(FragrancePreference)),
        ingredients_to_avoid=rng.sample(["fragrance", "drying_alcohol", "essential_oil", "retinoid"], k=rng.randint(0, 2)),
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--users", type=int, default=300)
    parser.add_argument("--days", type=int, default=120)
    parser.add_argument("--sessions-per-week", type=float, default=1.5)
    parser.add_argument("--seed", type=int, default=7)
    parser.add_argument("--purge", action="store_true")
    args = parser.parse_args()

    settings = get_settings()
    configure_logging(settings.log_level)
    if settings.environment == "prod":
        sys.exit("Refusing to generate synthetic data with ENVIRONMENT=prod")
    rng = random.Random(args.seed)
    config = load_recommender_config(settings.recommender_config_path)

    with get_session_factory()() as session:
        if args.purge:
            purge(session)
            return 0
        records = load_product_records(session)
        if not records:
            sys.exit("Empty catalogue: run scripts/seed_dev_catalog.py or scripts/sync_core.py first")
        engine = RecommendationEngine(CatalogIndex(records, config.encoder), config)
        brands = sorted({r.brand_id for r in records if r.brand_id is not None})
        start = datetime.now(timezone.utc) - timedelta(days=args.days)
        offset = session.scalar(select(User.user_id).order_by(User.user_id.desc()).limit(1)) or 0

        total_events = 0
        for n in range(args.users):
            user = User(email=f"synthetic-{offset + n + 1}@example.invalid", is_synthetic=True)
            session.add(user)
            session.flush()
            profile = to_domain_profile(onboard(session, random_onboarding(rng, user.user_id)))
            # Hidden tastes the onboarding does not capture (so the data is not a pure copy of the rules).
            loved_brand = rng.choice(brands) if brands else None
            price_sensitivity = rng.uniform(0.0, 1.0)
            history: list[Interaction] = []
            events: list[UserEvent] = []

            n_sessions = max(1, int(rng.expovariate(1 / (args.sessions_per_week * args.days / 7))))
            for _ in range(n_sessions):
                at = start + timedelta(seconds=rng.uniform(0, args.days * 86400))
                session_id = f"syn-{user.user_id}-{int(at.timestamp())}"
                shown = engine.for_you(UserContext(profile=profile, interactions=history), k=10).items
                for position, item in enumerate(shown):
                    product = engine.catalog[item.product_id]
                    meta = {"synthetic": True, "generator": GENERATOR_VERSION, "position": position}
                    events.append(_event(user.user_id, item.product_id, session_id, EventType.IMPRESSION, at, meta))
                    utility = (
                        2.5 * item.score
                        + (0.8 if product.brand_id == loved_brand else 0.0)
                        - price_sensitivity * product.price / 5000
                        - 0.15 * position
                        + rng.gauss(0, 0.4)
                    )
                    if rng.random() > 1 / (1 + math.exp(-(utility - 2.0))):
                        continue
                    t = at + timedelta(seconds=5 + 10 * position)
                    for event_type, probability in (
                        (EventType.CLICK, 1.0), (EventType.VIEW, 1.0), (EventType.WISHLIST_ADD, 0.25),
                        (EventType.CART_ADD, 0.2), (EventType.PURCHASE, 0.5),
                    ):
                        if rng.random() > probability:
                            break
                        t += timedelta(seconds=rng.randint(5, 600))
                        events.append(_event(user.user_id, item.product_id, session_id, event_type, t, meta))
                        history.append(Interaction(item.product_id, event_type, t))
            session.add_all(events)
            session.commit()
            total_events += len(events)
        logger.info("Created %d SYNTHETIC users and %d SYNTHETIC events (flag is_synthetic=true)", args.users, total_events)
    return 0


def _event(user_id, product_id, session_id, event_type, at, meta) -> UserEvent:
    return UserEvent(
        user_id=user_id, product_id=product_id, session_id=session_id, event_type=event_type.value,
        occurred_at=at, event_metadata=meta, is_synthetic=True,
    )


if __name__ == "__main__":
    sys.exit(main())

"""Load data/dev_catalog.json (fictitious products) into the `reco` schema.

    python scripts/seed_dev_catalog.py            # upsert
    python scripts/seed_dev_catalog.py --reset    # delete every dev_seed product first

Refuses to run with ENVIRONMENT=prod.
"""

from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

import _bootstrap  # noqa: F401

from app.core.config import get_settings
from app.core.logging import configure_logging
from app.db.dev_seed import DEFAULT_PATH, seed
from app.db.session import get_session_factory

logger = logging.getLogger("seed_dev_catalog")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--reset", action="store_true")
    parser.add_argument("--path", type=Path, default=DEFAULT_PATH)
    args = parser.parse_args()

    settings = get_settings()
    configure_logging(settings.log_level)
    if settings.environment == "prod":
        sys.exit("Refusing to load the development catalogue with ENVIRONMENT=prod")
    with get_session_factory()() as session:
        count = seed(session, args.path, args.reset)
    logger.info("Development catalogue loaded: %d fictitious products (data_source=dev_seed)", count)


if __name__ == "__main__":
    main()

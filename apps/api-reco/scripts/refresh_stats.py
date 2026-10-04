"""Recompute product_stats (popularity...) from real events. Run it daily (cron).

    python scripts/refresh_stats.py
"""

import _bootstrap  # noqa: F401

from app.core.config import get_settings
from app.core.logging import configure_logging
from app.db.session import get_session_factory
from app.recommender.config import load_recommender_config
from app.services.stats_service import refresh_product_stats

if __name__ == "__main__":
    settings = get_settings()
    configure_logging(settings.log_level)
    with get_session_factory()() as session:
        refresh_product_stats(session, load_recommender_config(settings.recommender_config_path))

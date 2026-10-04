"""Cold-start quality report on the current catalogue (see app/ml/cold_start_eval.py).

    python scripts/evaluate_cold_start.py
Exit code 1 if any persona was shown a product violating its constraints.
"""

import sys

import _bootstrap  # noqa: F401

from app.core.config import get_settings
from app.core.logging import configure_logging
from app.db.session import get_session_factory
from app.ml.cold_start_eval import evaluate_cold_start, persona_grid
from app.recommender.catalog_index import CatalogIndex
from app.recommender.config import load_recommender_config
from app.recommender.engine import RecommendationEngine
from app.services.catalog_service import load_product_records

if __name__ == "__main__":
    settings = get_settings()
    configure_logging("WARNING")
    config = load_recommender_config(settings.recommender_config_path)
    with get_session_factory()() as session:
        engine = RecommendationEngine(CatalogIndex(load_product_records(session), config.encoder), config)
    report = evaluate_cold_start(engine, persona_grid(["fragrance"]))
    print(f"Cold-start report ({len(engine.catalog)} products, config {config.version})")
    for name, value in report.items():
        print(f"  {name:<24} {value:.3f}")
    sys.exit(1 if report["constraint_violations"] else 0)

"""Online Learning-to-Rank re-ranking (V3). Loaded only when LTR_MODEL_PATH is
set and `ltr.enabled: true` in config/recommender.yaml."""

from __future__ import annotations

import json
import logging
from pathlib import Path

import numpy as np

from app.core.config import get_settings
from app.ml.features import LTR_FEATURES, feature_row
from app.recommender.domain import ProductRecord, ScoredProduct, UserContext

logger = logging.getLogger(__name__)


class LtrReranker:
    def __init__(self, booster, metadata: dict) -> None:
        self.booster = booster
        self.metadata = metadata
        self.version = metadata.get("version", "unknown")

    @classmethod
    def load(cls, path: Path) -> "LtrReranker":
        import lightgbm as lgb

        path = Path(path)
        metadata = json.loads((path / "metadata.json").read_text(encoding="utf-8"))
        if tuple(metadata["feature_names"]) != LTR_FEATURES:
            raise RuntimeError(f"Model {path} was trained with other features; retrain it.")
        if metadata.get("data_source") != "real" and get_settings().environment == "prod":
            raise RuntimeError(f"Model {path} was trained on {metadata.get('data_source')} data: refused in prod.")
        logger.info("LTR model %s loaded (trained on %s data)", metadata.get("version"), metadata.get("data_source"))
        return cls(lgb.Booster(model_file=str(path / "model.txt")), metadata)

    def rerank(
        self,
        items: list[ScoredProduct],
        catalog: dict[int, ProductRecord],
        context: UserContext,
        blend: float,
    ) -> list[ScoredProduct]:
        if not items:
            return items
        rows = [feature_row(i, catalog[i.product_id], context.product_behavior.get(i.product_id)) for i in items]
        predictions = np.asarray(self.booster.predict(np.array(rows, dtype=float)))
        spread = predictions.max() - predictions.min()
        normalized = (predictions - predictions.min()) / spread if spread > 0 else np.full_like(predictions, 0.5)
        for item, model_score in zip(items, normalized):
            item.features["ltr_score"] = float(model_score)
            item.score = blend * float(model_score) + (1 - blend) * item.score
        return sorted(items, key=lambda i: i.score, reverse=True)

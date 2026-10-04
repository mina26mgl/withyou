"""Offline Learning-to-Rank training (V3).

    python -m app.ml.train                       # real data only
    python -m app.ml.train --include-synthetic   # pipeline test on synthetic data

PostgreSQL -> events -> features -> ranking dataset -> temporal split
-> LightGBM LambdaRank -> evaluation vs the V0 rule score -> MLflow -> artifacts/ltr/<version>/

It refuses to train on too little real data. A model trained on synthetic
data is tagged as such, and its metrics only prove the pipeline runs: they say
nothing about real users.
"""

from __future__ import annotations

import argparse
import inspect
import json
import logging
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np

from app.core.config import SERVICE_ROOT, get_settings
from app.core.logging import configure_logging
from app.db.session import get_session_factory
from app.ml.dataset import RankingDataset, TemporalSplit, load_events, load_profiles, temporal_split
from app.ml.evaluate import evaluate_groups
from app.ml.features import LTR_FEATURES
from app.recommender.catalog_index import CatalogIndex
from app.recommender.config import load_recommender_config
from app.services.catalog_service import load_product_records

logger = logging.getLogger("train_ltr")

DEFAULT_PARAMS = {
    "objective": "lambdarank",
    "n_estimators": 300,
    "learning_rate": 0.05,
    "num_leaves": 15,
    "min_child_samples": 20,
    "subsample": 0.8,
    "subsample_freq": 1,
    "colsample_bytree": 0.8,
    "random_state": 42,
    "verbose": -1,
}


def train_ranker(split: TemporalSplit, params: dict | None = None):
    import lightgbm as lgb

    params = {**DEFAULT_PARAMS, **(params or {})}
    model = lgb.LGBMRanker(**params)
    fit_kwargs: dict = {"group": split.train.group_sizes}
    if split.validation.n_groups:
        # LightGBM >= 4.7 renamed eval_set into eval_X / eval_y.
        if "eval_X" in inspect.signature(model.fit).parameters:
            fit_kwargs.update(eval_X=(split.validation.X,), eval_y=(split.validation.y,))
        else:
            fit_kwargs.update(eval_set=[(split.validation.X, split.validation.y)])
        fit_kwargs.update(
            eval_group=[split.validation.group_sizes],
            eval_at=[5, 10],
            callbacks=[lgb.early_stopping(30, verbose=False)],
        )
    model.fit(split.train.X, split.train.y, **fit_kwargs)
    return model


def evaluate(model, dataset: RankingDataset) -> dict[str, float]:
    if not dataset.n_groups:
        return {}
    model_metrics = evaluate_groups(dataset.y, model.predict(dataset.X), dataset.group_sizes)
    baseline_metrics = evaluate_groups(dataset.y, dataset.baseline_scores, dataset.group_sizes)
    return {**{f"model_{k}": v for k, v in model_metrics.items()}, **{f"rules_{k}": v for k, v in baseline_metrics.items()}}


def _log_mlflow(params: dict, metrics: dict, tags: dict, model_dir: Path) -> None:
    try:
        import mlflow
    except ImportError:
        logger.info("mlflow not installed: run not tracked (pip install -r requirements-ml.txt)")
        return
    mlflow.set_tracking_uri(os.environ.get("MLFLOW_TRACKING_URI", f"file:{SERVICE_ROOT / 'mlruns'}"))
    mlflow.set_experiment("withyou-ltr")
    with mlflow.start_run(run_name=tags["version"]):
        mlflow.set_tags(tags)
        mlflow.log_params(params)
        mlflow.log_metrics({k: v for k, v in metrics.items() if np.isfinite(v)})
        mlflow.log_artifacts(str(model_dir), artifact_path="model")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--include-synthetic", action="store_true", help="Also use events flagged is_synthetic")
    parser.add_argument("--horizon-days", type=int, default=7)
    parser.add_argument("--step-days", type=int, default=7)
    parser.add_argument("--min-train-groups", type=int, default=200)
    parser.add_argument("--unexposed-negatives", type=int, default=0)
    parser.add_argument("--out", type=Path, default=SERVICE_ROOT / "artifacts" / "ltr")
    args = parser.parse_args(argv)

    settings = get_settings()
    configure_logging(settings.log_level)
    config = load_recommender_config(settings.recommender_config_path)

    with get_session_factory()() as session:
        events, data_source = load_events(session, include_synthetic=args.include_synthetic)
        if not events:
            logger.error("No %s events: nothing to learn from yet. Keep V0 rules.", "usable" if args.include_synthetic else "real")
            return 1
        index = CatalogIndex(load_product_records(session), config.encoder)
        profiles = load_profiles(session, {e.user_id for e in events})

    split = temporal_split(
        events, profiles, index, config,
        horizon=timedelta(days=args.horizon_days), step=timedelta(days=args.step_days),
        data_source=data_source, unexposed_negatives=args.unexposed_negatives,
    )
    logger.info(
        "Dataset (%s): train %d groups / %d rows, validation %d groups, test %d groups (train_end=%s, validation_end=%s)",
        data_source, split.train.n_groups, len(split.train.y), split.validation.n_groups, split.test.n_groups,
        split.train_end.date(), split.validation_end.date(),
    )
    if split.train.n_groups < args.min_train_groups:
        logger.error(
            "Only %d training groups (< %d). Not enough data for a trustworthy model: keep V0 rules.",
            split.train.n_groups, args.min_train_groups,
        )
        return 1
    if data_source != "real":
        logger.warning("Training on %s data: metrics validate the PIPELINE ONLY, not model quality.", data_source)

    model = train_ranker(split)
    metrics = {f"val_{k}": v for k, v in evaluate(model, split.validation).items()}
    metrics |= {f"test_{k}": v for k, v in evaluate(model, split.test).items()}
    for name, value in sorted(metrics.items()):
        logger.info("%-28s %.4f", name, value)

    version = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    model_dir = args.out / version
    model_dir.mkdir(parents=True, exist_ok=True)
    model.booster_.save_model(str(model_dir / "model.txt"))
    metadata = {
        "version": version,
        "data_source": data_source,
        "evaluation_is_meaningful": data_source == "real",
        "feature_names": list(LTR_FEATURES),
        "horizon_days": args.horizon_days,
        "train_end": split.train_end.isoformat(),
        "validation_end": split.validation_end.isoformat(),
        "train_groups": split.train.n_groups,
        "metrics": metrics,
        "feature_importance": dict(zip(LTR_FEATURES, map(int, model.booster_.feature_importance()))),
    }
    (model_dir / "metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    _log_mlflow(
        {**DEFAULT_PARAMS, "horizon_days": args.horizon_days, "step_days": args.step_days},
        metrics,
        {"version": version, "data_source": data_source, "evaluation_is_meaningful": str(data_source == "real")},
        model_dir,
    )
    logger.info("Model saved to %s (set LTR_MODEL_PATH and ltr.enabled to serve it)", model_dir)
    return 0


if __name__ == "__main__":
    sys.exit(main())

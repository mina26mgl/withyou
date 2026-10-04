"""Ranking metrics. Pure numpy, usable on any (relevance, score, group) data."""

from __future__ import annotations

from typing import Iterable, Sequence

import numpy as np


def _top_k(scores: np.ndarray, k: int) -> np.ndarray:
    return np.argsort(-scores, kind="stable")[:k]


def precision_at_k(relevance: np.ndarray, scores: np.ndarray, k: int) -> float:
    top = _top_k(scores, k)
    return float((relevance[top] > 0).sum() / k)


def recall_at_k(relevance: np.ndarray, scores: np.ndarray, k: int) -> float:
    positives = (relevance > 0).sum()
    if positives == 0:
        return float("nan")
    return float((relevance[_top_k(scores, k)] > 0).sum() / positives)


def ndcg_at_k(relevance: np.ndarray, scores: np.ndarray, k: int) -> float:
    """Graded NDCG with gain 2^rel - 1."""
    discounts = 1.0 / np.log2(np.arange(2, k + 2))
    gains = (2.0 ** relevance[_top_k(scores, k)] - 1)
    ideal = (2.0 ** np.sort(relevance)[::-1][:k] - 1)
    idcg = float((ideal * discounts[: ideal.size]).sum())
    if idcg == 0:
        return float("nan")
    return float((gains * discounts[: gains.size]).sum() / idcg)


def evaluate_groups(
    relevance: np.ndarray, scores: np.ndarray, group_sizes: Sequence[int], ks: Iterable[int] = (5, 10)
) -> dict[str, float]:
    """Average each metric over query groups (one group = one user at one cutoff)."""
    results: dict[str, list[float]] = {}
    start = 0
    for size in group_sizes:
        rel, sc = relevance[start : start + size], scores[start : start + size]
        start += size
        for k in ks:
            results.setdefault(f"precision@{k}", []).append(precision_at_k(rel, sc, k))
            results.setdefault(f"recall@{k}", []).append(recall_at_k(rel, sc, k))
            results.setdefault(f"ndcg@{k}", []).append(ndcg_at_k(rel, sc, k))
    return {name: float(np.nanmean(values)) if values else float("nan") for name, values in results.items()}


def catalog_coverage(recommended: Iterable[Iterable[int]], catalog_size: int) -> float:
    """Share of the catalogue that appears in at least one recommendation list."""
    if catalog_size == 0:
        return 0.0
    seen = set()
    for items in recommended:
        seen.update(items)
    return len(seen) / catalog_size

"""Collaborative filtering (V2), switched off until real data is sufficient.

V2 starts with item-item collaborative filtering on the weighted, decayed
User x Product matrix: simple, explainable ("people who wishlisted X also
bought Y") and good at small scale. ALS / matrix factorisation (e.g. the
`implicit` library) can later implement the same `CollaborativeModel` protocol.
"""

from __future__ import annotations

import logging
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Iterable, Mapping, Protocol

import numpy as np
from scipy import sparse
from sklearn.preprocessing import normalize

from app.recommender.behavior import decayed_weight
from app.recommender.config import BehaviorConfig, CollaborativeConfig
from app.recommender.domain import EventType

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class UserEvent:
    user_id: int
    product_id: int
    event_type: EventType
    occurred_at: datetime


@dataclass
class InteractionMatrix:
    matrix: sparse.csr_matrix  # users x products, non-negative
    user_ids: list[int]
    product_ids: list[int]

    @property
    def n_interactions(self) -> int:
        return int(self.matrix.nnz)


def build_interaction_matrix(
    events: Iterable[UserEvent], config: BehaviorConfig, now: datetime | None = None
) -> InteractionMatrix:
    now = now or datetime.now(timezone.utc)
    cells: dict[tuple[int, int], float] = defaultdict(float)
    for event in events:
        cells[(event.user_id, event.product_id)] += decayed_weight(event.event_type, event.occurred_at, now, config)
    cells = {key: value for key, value in cells.items() if value > 0}
    user_ids = sorted({u for u, _ in cells})
    product_ids = sorted({p for _, p in cells})
    u_index = {u: i for i, u in enumerate(user_ids)}
    p_index = {p: i for i, p in enumerate(product_ids)}
    if not cells:
        return InteractionMatrix(sparse.csr_matrix((0, 0)), [], [])
    rows = [u_index[u] for u, _ in cells]
    cols = [p_index[p] for _, p in cells]
    # log1p dampens heavy users / repeated views.
    data = np.log1p(np.fromiter(cells.values(), dtype=float))
    matrix = sparse.csr_matrix((data, (rows, cols)), shape=(len(user_ids), len(product_ids)))
    return InteractionMatrix(matrix, user_ids, product_ids)


class CollaborativeModel(Protocol):
    version: str

    def recommend(self, interest: Mapping[int, float], k: int, exclude: set[int]) -> list[tuple[int, float]]: ...


class ItemKNNModel:
    version = "item-knn"

    def __init__(self, data: InteractionMatrix, neighbors: int = 50) -> None:
        self.product_ids = np.array(data.product_ids)
        self.col_of = {pid: i for i, pid in enumerate(data.product_ids)}
        item_vectors = normalize(data.matrix.T.tocsr(), norm="l2")
        similarity = (item_vectors @ item_vectors.T).tolil()
        similarity.setdiag(0)
        self.similarity = self._keep_top_neighbors(similarity.tocsr(), neighbors)

    @staticmethod
    def _keep_top_neighbors(similarity: sparse.csr_matrix, k: int) -> sparse.csr_matrix:
        rows, cols, vals = [], [], []
        for row in range(similarity.shape[0]):
            start, end = similarity.indptr[row], similarity.indptr[row + 1]
            row_cols, row_vals = similarity.indices[start:end], similarity.data[start:end]
            if row_vals.size > k:
                keep = np.argpartition(-row_vals, k - 1)[:k]
                row_cols, row_vals = row_cols[keep], row_vals[keep]
            rows.extend([row] * len(row_cols))
            cols.extend(row_cols.tolist())
            vals.extend(row_vals.tolist())
        return sparse.csr_matrix((vals, (rows, cols)), shape=similarity.shape)

    def recommend(self, interest: Mapping[int, float], k: int, exclude: set[int]) -> list[tuple[int, float]]:
        cols = [(self.col_of[pid], w) for pid, w in interest.items() if pid in self.col_of]
        if not cols:
            return []
        user = np.zeros(len(self.product_ids))
        for col, weight in cols:
            user[col] = weight
        scores = self.similarity.T @ user
        if scores.max(initial=0) <= 0:
            return []
        scores = scores / scores.max()
        order = np.argsort(-scores)
        results = []
        for col in order:
            pid = int(self.product_ids[col])
            if scores[col] <= 0 or len(results) >= k:
                break
            if pid not in exclude and pid not in interest:
                results.append((pid, float(scores[col])))
        return results


def train_collaborative_model(
    data: InteractionMatrix, config: CollaborativeConfig
) -> CollaborativeModel | None:
    """Return a model only when there is enough real data to trust it."""
    if not config.enabled:
        return None
    if len(data.user_ids) < config.min_users or data.n_interactions < config.min_interactions:
        logger.info(
            "Collaborative filtering disabled: %d users / %d interactions (needs %d / %d)",
            len(data.user_ids), data.n_interactions, config.min_users, config.min_interactions,
        )
        return None
    return ItemKNNModel(data, neighbors=config.neighbors)

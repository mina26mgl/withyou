"""In-memory vector representation of the catalogue (content-based part).

Each product becomes one L2-normalised row made of weighted blocks:

    category | routine role | brand | skin types | concerns | ingredients (idf) | text | price band

Every block is normalised on its own then scaled by sqrt(block_weight), so the
cosine between two products is a weighted mix of per-block cosines. With
< 10 000 products the whole matrix fits in memory and a similarity query is a
single sparse matrix-vector product: no vector database needed.
"""

from __future__ import annotations

import logging
from typing import Iterable, Mapping, Sequence

import numpy as np
from scipy import sparse
from sklearn.feature_extraction import DictVectorizer
from sklearn.feature_extraction.text import TfidfTransformer
from sklearn.preprocessing import normalize

from app.recommender.config import EncoderConfig
from app.recommender.domain import ProductRecord, UserProfile
from app.recommender.encoders import TextEncoder, build_text_encoder
from app.recommender.vocabulary import CONCERNS, SKIN_TYPES

logger = logging.getLogger(__name__)

STRUCTURED_BLOCKS = ("category", "role", "brand", "skin", "concern", "ingredient", "price")


class CatalogIndex:
    def __init__(
        self,
        products: Sequence[ProductRecord],
        config: EncoderConfig | None = None,
        text_encoder: TextEncoder | None = None,
    ) -> None:
        self.config = config or EncoderConfig()
        self.products: list[ProductRecord] = list(products)
        self.by_id: dict[int, ProductRecord] = {p.product_id: p for p in self.products}
        self.ids = np.array([p.product_id for p in self.products], dtype=np.int64)
        self.row_of: dict[int, int] = {pid: row for row, pid in enumerate(self.ids.tolist())}
        self._text_encoder = text_encoder or build_text_encoder(self.config)
        self._vectorizers: dict[str, DictVectorizer] = {}
        self._ingredient_idf: TfidfTransformer | None = None
        self._price_edges = self._compute_price_edges()
        self.matrix: sparse.csr_matrix = self._build_matrix()
        logger.info("Catalog index built: %d products, %d dimensions", *self.matrix.shape)

    def __len__(self) -> int:
        return len(self.products)

    def __contains__(self, product_id: object) -> bool:
        return product_id in self.by_id

    # ------------------------------------------------------------------ #
    # Building
    # ------------------------------------------------------------------ #
    def _compute_price_edges(self) -> np.ndarray:
        prices = np.array([p.price for p in self.products if p.price > 0], dtype=float)
        if prices.size == 0:
            return np.array([])
        return np.unique(np.quantile(prices, np.linspace(0, 1, self.config.price_bands + 1)))

    def _price_band(self, price: float) -> int:
        if self._price_edges.size < 3:
            return 0
        return int(np.searchsorted(self._price_edges[1:-1], price, side="right"))

    def _price_features(self, price: float | None) -> dict[str, float]:
        if price is None or price <= 0:
            return {}
        band = self._price_band(price)
        # Neighbouring bands count half, so 2 500 DA is close to 2 400 DA even
        # when a band edge falls between them.
        return {f"band:{band}": 1.0, f"band:{band - 1}": 0.5, f"band:{band + 1}": 0.5}

    def _product_blocks(self, product: ProductRecord) -> dict[str, dict[str, float]]:
        category: dict[str, float] = {}
        if product.category_id is not None:
            category[f"cat:{product.category_id}"] = 1.0
        if product.parent_category_id is not None:
            category[f"cat:{product.parent_category_id}"] = 0.5
        return {
            "category": category,
            "role": {product.routine_role.value: 1.0},
            "brand": {f"brand:{product.brand_id}": 1.0} if product.brand_id is not None else {},
            "skin": dict(product.skin_types),
            "concern": dict(product.concerns),
            "ingredient": {str(i): 1.0 for i in product.ingredient_ids},
            "price": self._price_features(product.price),
        }

    @staticmethod
    def product_text(product: ProductRecord) -> str:
        return " ".join(
            part for part in (product.name, product.category_name, product.description) if part
        )

    def _weighted(self, block: str, matrix: sparse.spmatrix) -> sparse.csr_matrix:
        weight = self.config.block_weights.get(block, 0.0)
        if matrix.shape[1] == 0 or weight <= 0:
            return sparse.csr_matrix((matrix.shape[0], 0))
        return normalize(sparse.csr_matrix(matrix), norm="l2") * np.sqrt(weight)

    def _build_matrix(self) -> sparse.csr_matrix:
        n = len(self.products)
        if n == 0:
            return sparse.csr_matrix((0, 0))
        per_product = [self._product_blocks(p) for p in self.products]
        blocks: list[sparse.csr_matrix] = []
        for block in STRUCTURED_BLOCKS:
            vectorizer = DictVectorizer(sparse=True)
            raw = vectorizer.fit_transform([features[block] for features in per_product])
            self._vectorizers[block] = vectorizer
            if block == "ingredient" and raw.shape[1] > 0:
                # Rare ingredients say more about a product than water or glycerin.
                self._ingredient_idf = TfidfTransformer(norm=None, sublinear_tf=True)
                raw = self._ingredient_idf.fit_transform(raw)
            blocks.append(self._weighted(block, raw))

        texts = [self.product_text(p) for p in self.products]
        self._text_encoder.fit(texts)
        blocks.append(self._weighted("text", self._text_encoder.transform(texts)))
        return normalize(sparse.hstack(blocks, format="csr"), norm="l2")

    def _encode_blocks(self, blocks: Mapping[str, Mapping[str, float]], text: str) -> sparse.csr_matrix:
        parts: list[sparse.csr_matrix] = []
        for block in STRUCTURED_BLOCKS:
            raw = self._vectorizers[block].transform([dict(blocks.get(block, {}))])
            if block == "ingredient" and self._ingredient_idf is not None and raw.shape[1] > 0:
                raw = self._ingredient_idf.transform(raw)
            parts.append(self._weighted(block, raw))
        text_vec = self._text_encoder.transform([text]) if text else None
        if text_vec is None or text_vec.shape[1] == 0:
            text_width = self.matrix.shape[1] - sum(part.shape[1] for part in parts)
            text_vec = sparse.csr_matrix((1, text_width))
        parts.append(self._weighted("text", text_vec))
        return normalize(sparse.hstack(parts, format="csr"), norm="l2")

    # ------------------------------------------------------------------ #
    # Queries
    # ------------------------------------------------------------------ #
    def profile_vector(self, profile: UserProfile) -> sparse.csr_matrix | None:
        """Project declared preferences into the product space ("ideal product")."""
        if len(self) == 0 or not profile.has_preferences:
            return None
        skin: dict[str, float] = {}
        if profile.skin_type:
            skin[profile.skin_type] = 1.0
        if profile.is_sensitive:
            skin["sensitive"] = max(skin.get("sensitive", 0.0), 0.7)
        blocks = {
            "skin": skin,
            "concern": {code: 1.0 / max(priority, 1) for code, priority in profile.concerns.items()},
            "category": {f"cat:{cid}": 1.0 for cid in profile.preferred_category_ids},
            "brand": {f"brand:{bid}": 1.0 for bid in profile.preferred_brand_ids},
            "ingredient": {str(i): 1.0 for i in profile.preferred_ingredient_ids},
            "price": self._price_features(self._budget_target(profile)),
        }
        words = [CONCERNS[code] for code in profile.concerns if code in CONCERNS]
        if profile.skin_type in SKIN_TYPES:
            words.append(SKIN_TYPES[profile.skin_type])
        vector = self._encode_blocks(blocks, " ".join(words))
        return vector if vector.nnz else None

    @staticmethod
    def _budget_target(profile: UserProfile) -> float | None:
        if profile.budget_max is None:
            return None
        low = profile.budget_min or 0.0
        return (low + profile.budget_max) / 2

    def scores_for(self, query: sparse.csr_matrix) -> np.ndarray:
        if len(self) == 0:
            return np.zeros(0)
        return np.asarray(self.matrix @ query.T.toarray()).ravel()

    def seed_vector(self, seeds: Mapping[int, float]) -> sparse.csr_matrix | None:
        rows = [(self.row_of[pid], weight) for pid, weight in seeds.items() if pid in self.row_of and weight > 0]
        if not rows:
            return None
        weights = sparse.csr_matrix(
            (np.array([w for _, w in rows]), (np.zeros(len(rows), dtype=int), np.array([r for r, _ in rows]))),
            shape=(1, len(self)),
        )
        return normalize(weights @ self.matrix, norm="l2")

    def top_k(
        self, scores: np.ndarray, k: int, exclude: Iterable[int] = (), min_score: float = 1e-9
    ) -> list[tuple[int, float]]:
        if scores.size == 0 or k <= 0:
            return []
        scores = scores.copy()
        for pid in exclude:
            row = self.row_of.get(pid)
            if row is not None:
                scores[row] = -np.inf
        k = min(k, scores.size)
        top = np.argpartition(-scores, k - 1)[:k]
        top = top[np.argsort(-scores[top], kind="stable")]
        return [(int(self.ids[row]), float(scores[row])) for row in top if scores[row] > min_score]

    def similar_to(self, seeds: Mapping[int, float], k: int, exclude: Iterable[int] = ()) -> list[tuple[int, float]]:
        query = self.seed_vector(seeds)
        if query is None:
            return []
        return self.top_k(self.scores_for(query), k, exclude=set(exclude) | set(seeds))

    def similarity(self, a: int, b: int) -> float:
        if a not in self.row_of or b not in self.row_of:
            return 0.0
        return float(self.matrix[self.row_of[a]].multiply(self.matrix[self.row_of[b]]).sum())

    def pairwise_similarity(self, product_ids: Sequence[int]) -> np.ndarray:
        rows = [self.row_of[pid] for pid in product_ids]
        sub = self.matrix[rows]
        return np.asarray((sub @ sub.T).toarray())

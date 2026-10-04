"""Text encoders behind a common interface.

TF-IDF is the V0 encoder. A Sentence-Transformers encoder can replace it by
configuration only (encoder.text_encoder) — the catalogue index just needs a
matrix with one row per text.
"""

from __future__ import annotations

from typing import Protocol, Sequence

import numpy as np
from scipy import sparse
from sklearn.feature_extraction.text import TfidfVectorizer

from app.recommender.config import EncoderConfig
from app.recommender.vocabulary import FRENCH_STOPWORDS, normalize_text


class TextEncoder(Protocol):
    name: str

    def fit(self, texts: Sequence[str]) -> None: ...

    def transform(self, texts: Sequence[str]) -> sparse.csr_matrix: ...


class TfidfTextEncoder:
    name = "tfidf"

    def __init__(self, max_features: int = 5000) -> None:
        self._vectorizer = TfidfVectorizer(
            preprocessor=normalize_text,
            stop_words=FRENCH_STOPWORDS,
            ngram_range=(1, 2),
            sublinear_tf=True,
            max_features=max_features,
            token_pattern=r"(?u)\b[a-z0-9][a-z0-9\-]+\b",
        )
        self._fitted = False

    def fit(self, texts: Sequence[str]) -> None:
        non_empty = [text for text in texts if normalize_text(text)]
        if not non_empty:
            return
        self._vectorizer.fit(non_empty)
        self._fitted = True

    def transform(self, texts: Sequence[str]) -> sparse.csr_matrix:
        if not self._fitted:
            return sparse.csr_matrix((len(texts), 0))
        return self._vectorizer.transform(texts).tocsr()


class SentenceTransformerEncoder:
    name = "sentence_transformer"

    def __init__(self, model_name: str) -> None:
        try:
            from sentence_transformers import SentenceTransformer
        except ImportError as exc:  # pragma: no cover - optional dependency
            raise RuntimeError(
                "encoder.text_encoder=sentence_transformer needs `pip install sentence-transformers`"
            ) from exc
        self._model = SentenceTransformer(model_name)

    def fit(self, texts: Sequence[str]) -> None:  # pretrained, nothing to fit
        return None

    def transform(self, texts: Sequence[str]) -> sparse.csr_matrix:
        vectors = self._model.encode(list(texts), normalize_embeddings=True, show_progress_bar=False)
        return sparse.csr_matrix(np.asarray(vectors, dtype=np.float32))


def build_text_encoder(config: EncoderConfig) -> TextEncoder:
    if config.text_encoder == "sentence_transformer":
        return SentenceTransformerEncoder(config.sentence_transformer_model)
    return TfidfTextEncoder(max_features=config.tfidf_max_features)

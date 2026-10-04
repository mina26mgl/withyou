"""Every tunable number of the recommender lives here.

Defaults are starting values chosen by hand, not learned. Override them in
config/recommender.yaml (only the keys you want to change).
"""

from __future__ import annotations

from pathlib import Path
from typing import Literal

import yaml
from pydantic import BaseModel, Field

from app.recommender.domain import EventType, RecommendationType, RoutineRole

FEATURE_NAMES: tuple[str, ...] = (
    "skin_match",
    "concern_match",
    "budget_match",
    "ingredient_match",
    "category_match",
    "brand_match",
    "texture_match",
    "content_similarity",
    "behavior_affinity",
    "popularity",
)


class ScoringWeights(BaseModel):
    """Linear weights of the rule-based score. They are re-normalised over the
    features that can be computed for a request (a user without a budget does
    not get a budget_match), so they do not need to sum to 1."""

    skin_match: float = 0.0
    concern_match: float = 0.0
    budget_match: float = 0.0
    ingredient_match: float = 0.0
    category_match: float = 0.0
    brand_match: float = 0.0
    texture_match: float = 0.0
    content_similarity: float = 0.0
    behavior_affinity: float = 0.0
    popularity: float = 0.0

    def as_dict(self) -> dict[str, float]:
        return {name: getattr(self, name) for name in FEATURE_NAMES}


def _default_weights() -> dict[RecommendationType, ScoringWeights]:
    return {
        RecommendationType.FOR_YOU: ScoringWeights(
            skin_match=0.35, concern_match=0.30, budget_match=0.15, ingredient_match=0.10,
            popularity=0.10, category_match=0.05, brand_match=0.03, texture_match=0.03,
            behavior_affinity=0.10,
        ),
        RecommendationType.SIMILAR: ScoringWeights(
            content_similarity=0.55, skin_match=0.10, concern_match=0.10, budget_match=0.05,
            ingredient_match=0.05, popularity=0.10, behavior_affinity=0.05,
        ),
        RecommendationType.BECAUSE_YOU_LIKED: ScoringWeights(
            content_similarity=0.45, skin_match=0.15, concern_match=0.15, budget_match=0.05,
            ingredient_match=0.05, popularity=0.05, behavior_affinity=0.10,
        ),
        RecommendationType.ROUTINE: ScoringWeights(
            skin_match=0.30, concern_match=0.30, budget_match=0.15, ingredient_match=0.10,
            content_similarity=0.10, popularity=0.05, texture_match=0.03,
        ),
    }


class CandidateConfig(BaseModel):
    pool_size: int = 500
    ranking_pool: int = 100
    per_generator: dict[str, int] = Field(
        default_factory=lambda: {
            "content": 300,
            "similar": 200,
            "popular": 100,
            "routine": 200,
            "collaborative": 200,
        }
    )


class FilterConfig(BaseModel):
    # A product above budget_max * tolerance is excluded; below it, budget_match
    # only lowers the score. None disables the hard budget filter.
    budget_hard_tolerance: float | None = 1.25
    exclude_unavailable: bool = True


class DiversityConfig(BaseModel):
    enabled: bool = True
    max_per_category: int = 3
    max_per_brand: int = 2
    max_per_role: int = 3
    # Maximal Marginal Relevance: 1.0 = pure relevance, 0.0 = pure novelty.
    mmr_lambda: float = 0.75


class EncoderConfig(BaseModel):
    text_encoder: Literal["tfidf", "sentence_transformer"] = "tfidf"
    sentence_transformer_model: str = "paraphrase-multilingual-MiniLM-L12-v2"
    tfidf_max_features: int = 5000
    # Relative importance of each block in the product vector (cosine space).
    block_weights: dict[str, float] = Field(
        default_factory=lambda: {
            "category": 0.20,
            "role": 0.25,
            "brand": 0.08,
            "skin": 0.15,
            "concern": 0.25,
            "ingredient": 0.25,
            "text": 0.35,
            "price": 0.07,
        }
    )
    price_bands: int = 5


class BehaviorConfig(BaseModel):
    event_weights: dict[EventType, float] = Field(
        default_factory=lambda: {
            EventType.IMPRESSION: 0.05,
            EventType.VIEW: 0.5,
            EventType.CLICK: 1.0,
            EventType.SEARCH: 0.0,
            EventType.WISHLIST_ADD: 3.0,
            EventType.WISHLIST_REMOVE: -2.0,
            EventType.CART_ADD: 5.0,
            EventType.CART_REMOVE: -2.0,
            EventType.PURCHASE: 10.0,
        }
    )
    # weight = initial_weight * exp(-decay_lambda_per_day * age_in_days); 0.03 ≈ 23-day half-life.
    decay_lambda_per_day: float = 0.03
    history_days: int = 180
    # Number of seed products for "because you liked".
    max_seed_products: int = 5


class PopularityConfig(BaseModel):
    window_days: int = 90
    # Bayesian average: a product's rating is pulled towards the global mean
    # until it has `rating_prior_count` reviews.
    rating_prior_count: int = 5
    rating_weight: float = 0.3


class CollaborativeConfig(BaseModel):
    enabled: bool = True
    # Below these thresholds the collaborative generator stays silent.
    min_users: int = 50
    min_interactions: int = 1000
    neighbors: int = 50


class RoutineSlot(BaseModel):
    name: str
    roles: list[RoutineRole]
    optional: bool = False


class RoutineConfig(BaseModel):
    slots: list[RoutineSlot] = Field(
        default_factory=lambda: [
            RoutineSlot(name="cleanse", roles=[RoutineRole.CLEANSER]),
            RoutineSlot(name="tone", roles=[RoutineRole.TONER], optional=True),
            RoutineSlot(name="treat", roles=[RoutineRole.SERUM, RoutineRole.TREATMENT]),
            RoutineSlot(name="moisturize", roles=[RoutineRole.MOISTURIZER]),
            RoutineSlot(name="protect", roles=[RoutineRole.SUNSCREEN]),
            RoutineSlot(name="eyes", roles=[RoutineRole.EYE_CARE], optional=True),
            RoutineSlot(name="mask", roles=[RoutineRole.MASK], optional=True),
        ]
    )
    alternatives_per_slot: int = 2
    # Pairs of ingredient families that are usually not layered in the same
    # routine. A candidate creating such a pair is down-ranked, never presented
    # as a medical rule.
    cautious_pairs: list[tuple[str, str]] = Field(
        default_factory=lambda: [("retinoid", "aha"), ("retinoid", "bha")]
    )
    cautious_pair_penalty: float = 0.25


class LtrConfig(BaseModel):
    enabled: bool = False
    # Final score = blend * model + (1 - blend) * rule score.
    blend: float = 1.0


class RecommenderConfig(BaseModel):
    version: str = "v0-rules"
    weights: dict[RecommendationType, ScoringWeights] = Field(default_factory=_default_weights)
    candidates: CandidateConfig = Field(default_factory=CandidateConfig)
    filters: FilterConfig = Field(default_factory=FilterConfig)
    diversity: DiversityConfig = Field(default_factory=DiversityConfig)
    encoder: EncoderConfig = Field(default_factory=EncoderConfig)
    behavior: BehaviorConfig = Field(default_factory=BehaviorConfig)
    popularity: PopularityConfig = Field(default_factory=PopularityConfig)
    collaborative: CollaborativeConfig = Field(default_factory=CollaborativeConfig)
    routine: RoutineConfig = Field(default_factory=RoutineConfig)
    ltr: LtrConfig = Field(default_factory=LtrConfig)

    def weights_for(self, rec_type: RecommendationType) -> ScoringWeights:
        return self.weights[rec_type]


def _deep_merge(base: dict, override: dict) -> dict:
    merged = dict(base)
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = _deep_merge(merged[key], value)
        else:
            merged[key] = value
    return merged


def load_recommender_config(path: Path | None) -> RecommenderConfig:
    """Defaults, overridden by the YAML file when it exists."""
    defaults = RecommenderConfig().model_dump(mode="json")
    if path is None or not Path(path).exists():
        return RecommenderConfig.model_validate(defaults)
    with open(path, encoding="utf-8") as handle:
        override = yaml.safe_load(handle) or {}
    return RecommenderConfig.model_validate(_deep_merge(defaults, override))

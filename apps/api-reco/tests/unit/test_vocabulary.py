import pytest

from app.recommender.domain import RoutineRole, UsageTime
from app.recommender.vocabulary import (
    USAGE_TIME_ALIASES,
    infer_routine_role,
    infer_texture,
    ingredient_family,
    normalize_concern,
    normalize_skin_type,
    normalize_text,
)


def test_normalize_text_strips_accents_and_punctuation():
    assert normalize_text("  Crème  Démaquillante’s (Huile). ") == "creme demaquillante's huile"


@pytest.mark.parametrize(
    ("raw", "expected"),
    [("brillante", "oily"), ("tendue", "dry"), ("Mixte", "combination"), ("Sèche", "dry"), ("sensitive", "sensitive"),
     ("unknown", None), (None, None)],
)
def test_skin_type_aliases(raw, expected):
    assert normalize_skin_type(raw) == expected


def test_unknown_skin_type_raises():
    with pytest.raises(ValueError):
        normalize_skin_type("blue")


@pytest.mark.parametrize(
    ("raw", "expected"),
    [("boutons", "acne"), ("Taches", "hyperpigmentation"), ("Pores dilatés", "pores"), ("Éclat", "dullness"),
     ("Points noire", "blackheads"), ("rien", None), ("SPF", None)],
)
def test_concern_aliases(raw, expected):
    assert normalize_concern(raw) == expected


@pytest.mark.parametrize(
    ("texts", "needs", "expected"),
    [
        (("Crème Démaquillante Hydratante", "Crème et hydratant"), [], RoutineRole.CLEANSER),
        (("Contour des yeux à la caféine", "Crème et hydratant"), [], RoutineRole.EYE_CARE),
        (("Toner Pads 5% AHA", "Visage"), [], RoutineRole.TONER),
        (("Hydra Skin - Crème Hydratante", "Crème et hydratant"), [], RoutineRole.MOISTURIZER),
        (("Fluide SPF 50", ""), [], RoutineRole.SUNSCREEN),
        (("Produit X", "Visage"), ["Nettoie"], RoutineRole.CLEANSER),
        (("Produit X", "Visage"), [], RoutineRole.OTHER),
    ],
)
def test_infer_routine_role(texts, needs, expected):
    assert infer_routine_role(*texts, needs=needs) == expected


def test_ingredient_family():
    assert ingredient_family("parfum") == "fragrance"
    assert ingredient_family("linalool") == "fragrance"
    assert ingredient_family("retinol") == "retinoid"
    assert ingredient_family("alcohol denat") == "drying_alcohol"
    assert ingredient_family("cetearyl alcohol") is None  # fatty alcohol, not a drying one
    assert ingredient_family("fragrance") == "fragrance"  # family rows map to themselves


def test_texture_and_usage_time():
    assert infer_texture("Mousse Nettoyante") == "foam"
    assert infer_texture("Toner Pads") == "pads"
    assert USAGE_TIME_ALIASES[normalize_text("Les deux")] == UsageTime.ANY


def test_family_heads_designate_whole_families():
    from app.recommender.vocabulary import family_head

    assert family_head(normalize_text("drying_alcohol")) == "drying_alcohol"
    assert family_head(normalize_text("Huiles essentielles")) == "essential_oil"
    assert family_head("parfum") == "fragrance"
    assert family_head("linalool") is None  # a member, not the whole family
    assert ingredient_family(normalize_text("drying_alcohol")) == "drying_alcohol"

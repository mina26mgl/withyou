"""Canonical vocabulary of the recommender, and the aliases used to map
labels from api-core (French quiz ids, free-text product tags) onto it.
"""

from __future__ import annotations

import re
import unicodedata

from app.recommender.domain import RoutineRole, UsageTime

# --------------------------------------------------------------------------- #
# Skin types
# --------------------------------------------------------------------------- #
SKIN_TYPES: dict[str, str] = {
    "dry": "Peau sèche",
    "oily": "Peau grasse",
    "combination": "Peau mixte",
    "normal": "Peau normale",
    "sensitive": "Peau sensible",
}
UNKNOWN_SKIN_TYPE = "unknown"

SKIN_TYPE_ALIASES: dict[str, str] = {
    # quiz ids of apps/web (/quiz)
    "brillante": "oily",
    "tendue": "dry",
    "mixte": "combination",
    "equilibree": "normal",
    # product tags of api-core
    "grasse": "oily",
    "seche": "dry",
    "normale": "normal",
    "sensible": "sensitive",
}

# --------------------------------------------------------------------------- #
# Concerns
# --------------------------------------------------------------------------- #
CONCERNS: dict[str, str] = {
    "acne": "Imperfections / boutons",
    "blackheads": "Points noirs",
    "excess_sebum": "Excès de sébum",
    "pores": "Pores dilatés",
    "dryness": "Sécheresse / tiraillements",
    "dehydration": "Déshydratation",
    "hyperpigmentation": "Taches",
    "redness": "Rougeurs",
    "dullness": "Teint terne / fatigue",
    "aging": "Rides / ridules",
    "dark_circles": "Cernes",
    "puffiness": "Poches",
}

CONCERN_ALIASES: dict[str, str] = {
    # quiz ids of apps/web (/quiz2)
    "boutons": "acne",
    "taches": "hyperpigmentation",
    "ridules": "aging",
    "tiraillements": "dryness",
    "rougeurs": "redness",
    # product `needs` of api-core
    "imperfections": "acne",
    "points noire": "blackheads",
    "points noirs": "blackheads",
    "exces de sebum": "excess_sebum",
    "purifie": "excess_sebum",
    "pores dilates": "pores",
    "hydratation": "dehydration",
    "nourrissant": "dryness",
    "eclat": "dullness",
    "fatigue": "dullness",
    "rides": "aging",
    "anti-age": "aging",
    "cernes": "dark_circles",
    "poches": "puffiness",
    "reduire les poches": "puffiness",
}

# Product `needs` that describe a step of the routine rather than a concern.
NEED_TO_ROLE: dict[str, RoutineRole] = {
    "demaquille": RoutineRole.CLEANSER,
    "demaquillant": RoutineRole.CLEANSER,
    "nettoie": RoutineRole.CLEANSER,
    "nettoyant": RoutineRole.CLEANSER,
    "spf": RoutineRole.SUNSCREEN,
    "exfoliant": RoutineRole.TREATMENT,
    "maquillage": RoutineRole.MAKEUP,
}

# --------------------------------------------------------------------------- #
# Routine roles
# --------------------------------------------------------------------------- #
ROLE_LABELS: dict[RoutineRole, str] = {
    RoutineRole.CLEANSER: "Nettoyant",
    RoutineRole.TONER: "Tonique / lotion",
    RoutineRole.SERUM: "Sérum / huile",
    RoutineRole.TREATMENT: "Soin ciblé",
    RoutineRole.MOISTURIZER: "Hydratant",
    RoutineRole.SUNSCREEN: "Protection solaire",
    RoutineRole.EYE_CARE: "Contour des yeux",
    RoutineRole.MASK: "Masque",
    RoutineRole.MAKEUP: "Maquillage",
    RoutineRole.OTHER: "Autre",
}

# Ordered: the first keyword found in the product name/category wins.
ROLE_KEYWORDS: list[tuple[str, RoutineRole]] = [
    ("spf", RoutineRole.SUNSCREEN),
    ("solaire", RoutineRole.SUNSCREEN),
    ("ecran", RoutineRole.SUNSCREEN),
    ("contour des yeux", RoutineRole.EYE_CARE),
    ("contour yeux", RoutineRole.EYE_CARE),
    ("eye", RoutineRole.EYE_CARE),
    ("masque", RoutineRole.MASK),
    ("mask", RoutineRole.MASK),
    ("primer", RoutineRole.MAKEUP),
    ("bb creme", RoutineRole.MAKEUP),
    ("fond de teint", RoutineRole.MAKEUP),
    ("makeup", RoutineRole.MAKEUP),
    ("maquillage", RoutineRole.MAKEUP),
    ("demaquill", RoutineRole.CLEANSER),
    ("nettoyant", RoutineRole.CLEANSER),
    ("savon", RoutineRole.CLEANSER),
    ("mousse", RoutineRole.CLEANSER),
    ("cleanser", RoutineRole.CLEANSER),
    ("gel lavant", RoutineRole.CLEANSER),
    ("toner", RoutineRole.TONER),
    ("tonique", RoutineRole.TONER),
    ("tonifiant", RoutineRole.TONER),
    ("brume", RoutineRole.TONER),
    ("lotion", RoutineRole.TONER),
    ("serum", RoutineRole.SERUM),
    ("huile", RoutineRole.SERUM),
    ("oil", RoutineRole.SERUM),
    ("exfoli", RoutineRole.TREATMENT),
    ("peeling", RoutineRole.TREATMENT),
    ("soin cible", RoutineRole.TREATMENT),
    ("creme", RoutineRole.MOISTURIZER),
    ("hydratant", RoutineRole.MOISTURIZER),
    ("moisturizer", RoutineRole.MOISTURIZER),
    ("baume", RoutineRole.MOISTURIZER),
]

USAGE_TIME_ALIASES: dict[str, UsageTime] = {
    "matin": UsageTime.AM,
    "soir": UsageTime.PM,
    "les deux": UsageTime.ANY,
    "am": UsageTime.AM,
    "pm": UsageTime.PM,
    "any": UsageTime.ANY,
}

TEXTURES: tuple[str, ...] = ("gel", "cream", "lotion", "oil", "balm", "foam", "mist", "powder", "pads")

TEXTURE_KEYWORDS: list[tuple[str, str]] = [
    ("pads", "pads"),
    ("mousse", "foam"),
    ("foam", "foam"),
    ("brume", "mist"),
    ("gel", "gel"),
    ("huile", "oil"),
    ("baume", "balm"),
    ("argile", "powder"),
    ("poudre", "powder"),
    ("lait", "lotion"),
    ("lotion", "lotion"),
    ("creme", "cream"),
]

# --------------------------------------------------------------------------- #
# Ingredient families
# --------------------------------------------------------------------------- #
# A family name is itself an ingredient row: avoiding the "fragrance" ingredient
# excludes every product containing an ingredient of the fragrance family.
INGREDIENT_FAMILY_KEYWORDS: dict[str, tuple[str, ...]] = {
    "fragrance": (
        "fragrance", "parfum", "aroma", "linalool", "limonene", "citronellol",
        "geraniol", "eugenol", "coumarin", "citral", "hexyl cinnamal",
        "benzyl salicylate", "alpha-isomethyl ionone",
    ),
    "essential_oil": ("huile essentielle", "essential oil", "huiles essentielles"),
    "drying_alcohol": ("alcohol denat", "alcool denature", "ethanol", "sd alcohol", "isopropyl alcohol"),
    "sulfate": ("lauryl sulfate", "laureth sulfate", "sulfate"),
    "silicone": ("dimethicone", "cyclopentasiloxane", "cyclomethicone", "silicone"),
    "retinoid": ("retinol", "retinal", "retinyl", "retinoid"),
    "aha": ("glycolic acid", "acide glycolique", "lactic acid", "acide lactique", "mandelic acid", "aha"),
    "bha": ("salicylic acid", "acide salicylique", "bha"),
    "paraben": ("paraben",),
}

# Families that make sense to propose in the onboarding "ingredients to avoid".
AVOIDABLE_FAMILIES: tuple[str, ...] = (
    "fragrance", "essential_oil", "drying_alcohol", "sulfate", "silicone", "retinoid", "aha", "bha", "paraben",
)

FRENCH_STOPWORDS: list[str] = (
    "a au aux avec ce ces dans de des du elle en et eux il je la le les leur lui ma mais me meme mes moi mon "
    "ne nos notre nous on ou par pas pour qu que qui sa se ses son sur ta te tes toi ton tu un une vos votre "
    "vous c d j l m n s t y est sont ete etre avoir ainsi tres plus cette cet notre nos votre vos tout tous toute "
    "toutes sans peau produit produits soin soins"
).split()


def normalize_text(value: str) -> str:
    """Lowercase, strip accents and punctuation, collapse whitespace."""
    value = unicodedata.normalize("NFKD", value.replace("’", "'"))
    value = "".join(ch for ch in value if not unicodedata.combining(ch)).lower()
    value = re.sub(r"[^a-z0-9%/\-' ]+", " ", value)
    return re.sub(r"\s+", " ", value).strip(" -'")


def normalize_skin_type(value: str | None) -> str | None:
    """Return a canonical skin type, `None` for unknown, or raise ValueError."""
    if value is None:
        return None
    key = normalize_text(value)
    if key in ("", UNKNOWN_SKIN_TYPE, "inconnu", "je ne sais pas"):
        return None
    key = SKIN_TYPE_ALIASES.get(key, key)
    if key not in SKIN_TYPES:
        raise ValueError(f"Unknown skin type: {value!r}")
    return key


def normalize_concern(value: str) -> str | None:
    """Canonical concern code, or None when the label is not a concern (e.g. 'rien')."""
    key = normalize_text(value)
    if key in ("rien", "none", ""):
        return None
    key = CONCERN_ALIASES.get(key, key.replace(" ", "_"))
    return key if key in CONCERNS else None


# Names that designate a whole family when a user avoids them
# ("parfum" means every fragrance ingredient, not only the INCI "Parfum").
FAMILY_HEADS: dict[str, str] = {
    **{normalize_text(family): family for family in INGREDIENT_FAMILY_KEYWORDS},
    "parfum": "fragrance",
    "parfums": "fragrance",
    "alcool": "drying_alcohol",
    "alcohol": "drying_alcohol",
    "huile essentielle": "essential_oil",
    "huiles essentielles": "essential_oil",
    "sulfates": "sulfate",
    "silicones": "silicone",
    "parabens": "paraben",
    "retinoides": "retinoid",
    "retinoids": "retinoid",
}


def family_head(normalized_name: str) -> str | None:
    """The family an avoided ingredient stands for, if it names a whole family."""
    return FAMILY_HEADS.get(normalized_name)


def ingredient_family(normalized_name: str) -> str | None:
    if normalized_name in FAMILY_HEADS:
        return FAMILY_HEADS[normalized_name]
    for family, keywords in INGREDIENT_FAMILY_KEYWORDS.items():
        if any(keyword in normalized_name for keyword in keywords):
            return family
    return None


def infer_routine_role(*texts: str, needs: list[str] | None = None) -> RoutineRole:
    """Guess the routine step of a product from its name/category, then its needs."""
    haystack = " ".join(normalize_text(text) for text in texts if text)
    for keyword, role in ROLE_KEYWORDS:
        if re.search(rf"(^|\s){re.escape(keyword)}", haystack):
            return role
    for need in needs or []:
        role = NEED_TO_ROLE.get(normalize_text(need))
        if role:
            return role
    return RoutineRole.OTHER


def infer_texture(*texts: str) -> str | None:
    haystack = " ".join(normalize_text(text) for text in texts if text)
    for keyword, texture in TEXTURE_KEYWORDS:
        if re.search(rf"(^|\s){re.escape(keyword)}", haystack):
            return texture
    return None

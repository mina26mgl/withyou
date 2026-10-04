/**
 * Ingrédients phares à choisir en image dans la fiche produit. Un clic ajoute (ou
 * retire) leur nom INCI dans la liste INCI, qui reste la référence complète.
 */
export const KEY_INGREDIENTS = [
  { label: "Aloe vera", inci: "Aloe Barbadensis Leaf Juice", image: "/aloevera.png" },
  { label: "Café", inci: "Coffea Arabica Seed Extract", image: "/coffee.png" },
  { label: "Acide glycolique", inci: "Glycolic Acid", image: "/glycolic.png" },
  { label: "Miel", inci: "Mel", image: "/honey.png" },
  { label: "Huile d'olive", inci: "Olea Europaea Fruit Oil", image: "/huileolive.png" },
  { label: "Jasmin", inci: "Jasminum Officinale Flower Extract", image: "/jasmine.png" },
  { label: "Lavande", inci: "Lavandula Angustifolia Oil", image: "/lavendre.png" },
  { label: "Figue de barbarie", inci: "Opuntia Ficus-Indica Seed Oil", image: "/prickly.png" },
] as const;

/** Illustration d'un ingrédient phare d'après son nom INCI (null pour les autres). */
export function keyIngredientFor(inci: string) {
  const key = inci.trim().toLowerCase();
  return KEY_INGREDIENTS.find((k) => k.inci.toLowerCase() === key) ?? null;
}

/** Illustrations des types de peau de la fiche produit (valeurs de SKIN_TYPES). */
export const SKIN_TYPE_IMAGES: Record<string, string> = {
  Grasse: "/oily-skin.png",
  Sèche: "/seche.png",
  Normale: "/normale.png",
  Mixte: "/mixte.png",
  Sensible: "/sensetiv.png",
};

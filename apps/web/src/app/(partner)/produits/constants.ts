export const SKIN_TYPES = ["Normale", "Sèche", "Grasse", "Mixte", "Sensible"] as const;

export const NEEDS = ["Hydratation", "Imperfections", "Rougeurs", "Rides", "Taches", "Éclat", "Pores dilatés"] as const;

/** Besoins libres ajoutés par la marque (mêmes limites que l'API). */
export const MAX_NEEDS = 15;
export const NEED_MAX_LENGTH = 40;

export const MOMENTS = ["Matin", "Soir", "Les deux"] as const;

export const CONSERVATION_MODES = [
  "Température ambiante",
  "À l'abri de la lumière et de la chaleur",
  "Au réfrigérateur",
  "Au sec, flacon bien fermé",
] as const;

/** Durées après ouverture proposées d'un clic (le petit pot ouvert « 12M » des emballages). */
export const CONSERVATION_MONTHS = [3, 6, 12, 18, 24] as const;

export const STATUS_TABS = [
  { key: "all", label: "Tous" },
  { key: "ONLINE", label: "En ligne" },
  { key: "IN_REVIEW", label: "En vérification" },
  { key: "OUT_OF_STOCK", label: "Rupture" },
  { key: "DRAFT", label: "Brouillons" },
] as const;

export type StatusTabKey = (typeof STATUS_TABS)[number]["key"];

export const DESCRIPTION_MAX_LENGTH = 600;
export const MAX_PHOTOS = 5;

// Partagés avec la fiche produit de l'app cliente.
export { KEY_INGREDIENTS } from "@/lib/keyIngredients";

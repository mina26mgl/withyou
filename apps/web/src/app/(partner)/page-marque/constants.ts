export const COLOR_PRESETS = [
  { name: "Rose argile", bg: "#F6EEE9", text: "#3B2B28", accent: "#8E4B5A", card: "#FFFBF8" },
  { name: "Olivier", bg: "#EEF0E4", text: "#26301F", accent: "#56652B", card: "#FAFBF4" },
  { name: "Nuit d'Atlas", bg: "#1D2330", text: "#F1EEE8", accent: "#D9B26F", card: "#272F3F" },
  { name: "Sable", bg: "#F4ECDD", text: "#3A3226", accent: "#8C6524", card: "#FBF7EF" },
  { name: "Menthe", bg: "#E8F3EF", text: "#1E3A33", accent: "#2A7462", card: "#F6FBF9" },
] as const;

export const COMMITMENTS = [
  "Origine naturelle",
  "Rituels ancestraux",
  "Fait en Algérie",
  "Vegan",
  "Sans parfum ajouté",
  "Non testé sur les animaux",
  "Bio certifié",
  "Emballage recyclable",
] as const;

export const STORY_MAX_LENGTH = 800;
/** Engagements libres ajoutés par la marque (mêmes limites que l'API). */
export const COMMITMENT_MAX_LENGTH = 60;
export const COMMITMENTS_MAX = 20;

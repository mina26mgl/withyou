"use client";

/** Titre du profil cliente, d'après ce qu'elle fait dans l'app. */
export type ProfileTitle = "adventurer" | "explorer" | "renewer" | "regular";

export const PROFILE_TITLES: Record<ProfileTitle, { label: string; phrase: string; image: string }> = {
  adventurer: {
    label: "The Adventurer",
    phrase: "Every journey starts somewhere. Yours starts here.",
    image: "/profile3.png",
  },
  explorer: {
    label: "The Explorer",
    phrase: "Always searching. Always learning. Your skin journey is your own.",
    image: "/profile4.png",
  },
  renewer: {
    label: "The Renewer",
    phrase: "Treat yourself, renew yourself. Your glow is on its way.",
    image: "/profile1.png",
  },
  regular: {
    label: "The Regular",
    phrase: "Day after day, step by step. Consistency is your glow.",
    image: "/profile2.png",
  },
};

/** Fiches produit et pages marque distinctes à ouvrir pour devenir « The Explorer ». */
const EXPLORER_MIN = 3;
/** Commandes à partir desquelles une cliente qui a une routine devient « The Regular ». */
const REGULAR_MIN_ORDERS = 2;

const STORAGE_KEY = "withyou:explore";

function readExplored(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

/**
 * Note une fiche produit ou une page marque ouverte. Les événements analytics
 * sont anonymes : le compte est gardé sur l'appareil.
 */
export function recordExploration(key: string) {
  try {
    const seen = readExplored();
    if (seen.includes(key)) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...seen, key].slice(-50)));
  } catch {
    // Stockage indisponible : le titre restera « The Adventurer ».
  }
}

export function profileTitle({ commandes, routineActive }: { commandes: number; routineActive: boolean }): ProfileTitle {
  if (routineActive && commandes >= REGULAR_MIN_ORDERS) return "regular";
  if (commandes > 0) return "renewer";
  if (readExplored().length >= EXPLORER_MIN) return "explorer";
  return "adventurer";
}

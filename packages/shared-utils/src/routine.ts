/**
 * Routine proposée à la fin de l'onboarding cliente : relie les réponses du
 * quiz de peau au vocabulaire des fiches produit (SKIN_TYPES / NEEDS de
 * l'espace marque). Utilisé par l'API (routine enregistrée) et par l'app web
 * (badge « % adapté »).
 */

/** Réponses du quiz, telles qu'enregistrées sur le profil cliente. */
export interface RoutineAnswers {
  type_peau?: string[] | null;
  preoccupations?: string[] | null;
  sensibilite?: number | null;
}

/** Ce qu'il faut d'une fiche produit pour la placer dans une routine. */
export interface RoutineProductFit {
  skinTypes: string[];
  needs: string[];
  /** « Matin », « Soir », « Les deux » ou null (les deux). */
  moment: string | null;
}

/** Réponses de /quiz → types de peau des fiches produit. */
const SKIN_FROM_QUIZ: Record<string, string> = {
  brillante: 'Grasse',
  tendue: 'Sèche',
  mixte: 'Mixte',
  equilibree: 'Normale',
};

/**
 * Préoccupations de /quiz2 (« Qu'est-ce qui te dérange en ce moment ? ») → besoins des
 * fiches produit. « rien » n'en donne aucun. Les identifiants de l'ancienne question
 * (eclat, acne, secheresse) restent reconnus pour les profils déjà remplis.
 */
const NEED_FROM_QUIZ: Record<string, string> = {
  boutons: 'Imperfections',
  taches: 'Taches',
  ridules: 'Rides',
  pores: 'Pores dilatés',
  tiraillements: 'Hydratation',
  rougeurs: 'Rougeurs',
  eclat: 'Éclat',
  acne: 'Imperfections',
  secheresse: 'Hydratation',
};

/** À partir de « elle réagit assez souvent » sur le curseur de /quiz5. */
const SENSITIVE_FROM = 3;

export function wantedSkinTypes(answers: RoutineAnswers | null | undefined): string[] {
  const skins = (answers?.type_peau ?? []).map((id) => SKIN_FROM_QUIZ[id]).filter(Boolean);
  if ((answers?.sensibilite ?? 0) >= SENSITIVE_FROM) skins.push('Sensible');
  return skins;
}

export function wantedNeeds(answers: RoutineAnswers | null | undefined): string[] {
  return (answers?.preoccupations ?? []).map((id) => NEED_FROM_QUIZ[id]).filter(Boolean);
}

/**
 * « % adapté » : 60 points si le produit convient au type de peau (une fiche
 * sans type de peau convient à toutes), 40 points au prorata des préoccupations
 * couvertes. null sans réponses au quiz.
 */
export function fitScore(product: RoutineProductFit, answers: RoutineAnswers | null | undefined): number | null {
  const skins = wantedSkinTypes(answers);
  const needs = wantedNeeds(answers);
  if (!skins.length && !needs.length) return null;
  const skinOk = !skins.length || !product.skinTypes.length || product.skinTypes.some((s) => skins.includes(s));
  const needShare = needs.length ? needs.filter((n) => product.needs.includes(n)).length / needs.length : 1;
  return Math.round((skinOk ? 60 : 0) + 40 * needShare);
}

/** Phrase « Voici nos suggestions pour vous », tirée des réponses du quiz. */
export function routineSummary(answers: RoutineAnswers | null | undefined): string {
  const skins = wantedSkinTypes(answers).map((s) => s.toLowerCase());
  const needs = wantedNeeds(answers).map((n) => n.toLowerCase());
  const parts = [
    skins.length ? `Peau ${skins.join(', ')}.` : null,
    needs.length ? `Priorités : ${needs.join(', ')}.` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' ') : 'Une routine douce pour apprendre à connaître votre peau.';
}

/**
 * Routine matin / soir : chaque produit va dans le moment prévu par la marque
 * (sans moment : les deux), les mieux adaptés aux réponses en premier.
 */
export function buildRoutine<P extends RoutineProductFit>(
  products: P[],
  answers: RoutineAnswers | null | undefined,
): { morning: P[]; evening: P[] } {
  const ranked = [...products].sort((a, b) => (fitScore(b, answers) ?? 0) - (fitScore(a, answers) ?? 0));
  return {
    morning: ranked.filter((p) => p.moment !== 'Soir'),
    evening: ranked.filter((p) => p.moment !== 'Matin'),
  };
}

// Logique de routine partagée avec l'API (qui enregistre la routine proposée).
export { buildRoutine, fitScore, routineSummary } from "@withyou/shared-utils";

/** Prix au format des cartes produit : « 2800 ». */
export function formatPrice(prix: number): string {
  return String(Math.round(prix));
}

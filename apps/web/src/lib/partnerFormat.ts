import type { StatutProduit } from "@withyou/shared-types";
import type { StatusTone } from "@/components/partner/StatusPill";

/** Thousands separated with a space, no decimals: 186 400. */
export const fmtInt = (n: number): string => Math.round(n).toLocaleString("fr-FR");

/** One decimal with a comma: 4,7. */
export const fmtDecimal = (n: number): string => (Math.round(n * 10) / 10).toFixed(1).replace(".", ",");

export const signed = (n: number): string => (n > 0 ? `+${fmtInt(n)}` : fmtInt(n));

export type DisplayStatus = "ONLINE" | "OUT_OF_STOCK" | "IN_REVIEW" | "DRAFT" | "REJECTED";

/** "Rupture" is derived, never stored: an online product with no stock left. */
export function displayStatus(p: { statut: StatutProduit; stock: number }): DisplayStatus {
  if (p.statut === "ONLINE" && p.stock === 0) return "OUT_OF_STOCK";
  return p.statut;
}

export const STATUS_PILL: Record<DisplayStatus, { tone: StatusTone; label: string }> = {
  ONLINE: { tone: "ok", label: "En ligne" },
  OUT_OF_STOCK: { tone: "danger", label: "Rupture" },
  IN_REVIEW: { tone: "info", label: "En vérification" },
  DRAFT: { tone: "mute", label: "Brouillon" },
  REJECTED: { tone: "danger", label: "Rejeté" },
};

export function timeAgoFr(iso: string, now: number = Date.now()): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "à l'instant";
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.floor(hours / 24)} j`;
}

export function shortDateFr(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
}

export function longDateFr(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" });
}

/** "d'Alger" / "de Tizi Ouzou". */
export function dePlace(name: string): string {
  return /^[aeiouyhAEIOUYHÀÂÉÈÊÎÔÛ]/.test(name) ? `d'${name}` : `de ${name}`;
}

export function todayIso(offsetDays = 0): string {
  return new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

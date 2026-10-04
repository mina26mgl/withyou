/**
 * Numéro algérien : mobile (05, 06, 07 + 8 chiffres) ou fixe (02, 03, 04 + 7
 * chiffres), avec 0, +213 ou 00213 devant. Espaces, points et tirets ignorés.
 * Renvoie la forme nationale sans espaces (ex. « 0550123456 »), ou null.
 */
export function normalizeDzPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const compact = raw.replace(/[\s.\-()]/g, '');
  const m = /^(?:\+213|00213|0)([5-7]\d{8}|[2-4]\d{7})$/.exec(compact);
  return m ? `0${m[1]}` : null;
}

/** « 0550123456 » → « 0550 12 34 56 » pour l'affichage. */
export function formatDzPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const p = normalizeDzPhone(phone) ?? phone;
  return p.length === 10 ? `${p.slice(0, 4)} ${p.slice(4, 6)} ${p.slice(6, 8)} ${p.slice(8)}` : p.replace(/(\d{3})(?=\d)/g, '$1 ');
}

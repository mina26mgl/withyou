/** Formats a numeric amount as Algerian Dinar, e.g. formatPrice(2500) -> "2 500 DA" */
export function formatPrice(amount: number): string {
  const rounded = Math.round(amount);
  const withSpaces = rounded.toLocaleString('fr-FR').replace(/ /g, ' ');
  return `${withSpaces} DA`;
}

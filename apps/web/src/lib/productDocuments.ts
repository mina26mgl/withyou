import type { ProduitDocumentType } from "@withyou/shared-types";

/** Documents qu'une marque peut joindre à un produit (mêmes valeurs que l'API). */
export const DOCUMENT_TYPES: { key: ProduitDocumentType; label: string }[] = [
  { key: "FICHE_TECHNIQUE", label: "Fiche technique" },
  { key: "CERTIFICAT", label: "Certificat ou label" },
  { key: "ANALYSE", label: "Analyses de laboratoire" },
  { key: "AUTRE", label: "Autre document" },
];

export const DOCUMENT_LABEL = Object.fromEntries(DOCUMENT_TYPES.map((t) => [t.key, t.label])) as Record<ProduitDocumentType, string>;

export const MAX_DOCUMENTS = 6;
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const DOCUMENT_ACCEPT =
  "application/pdf,image/jpeg,image/png,image/webp,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** Type proposé d'après le nom du fichier ; la marque peut le changer. */
export function guessDocumentType(fileName: string): ProduitDocumentType {
  const n = fileName.toLowerCase();
  if (/fiche|technique|tds|fds|sds|msds/.test(n)) return "FICHE_TECHNIQUE";
  if (/certif|label|bio|halal|ecocert|cosmos|iso/.test(n)) return "CERTIFICAT";
  if (/analyse|labo|test|rapport|report/.test(n)) return "ANALYSE";
  return "AUTRE";
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
}

import type { BrandChecklistItem, BrandDocumentType } from '@withyou/shared-types';

export const BRAND_DOCUMENT_TYPES = ['REGISTRE_COMMERCE', 'CARTE_ARTISAN', 'CATALOGUE', 'AUTRE'] as const;
/** Registre du commerce ou carte d'artisan : l'un des deux suffit. */
export const LEGAL_DOCUMENT_TYPES: BrandDocumentType[] = ['REGISTRE_COMMERCE', 'CARTE_ARTISAN'];
export const MAX_BRAND_DOCUMENTS = 10;

/** Points vérifiés par withyou (mêmes clés que la console admin). */
export const WITHYOU_CHECKS = [
  { key: 'DOCUMENTS', label: 'Documents vérifiés par withyou' },
  { key: 'VISITE', label: "Visite ou appel vidéo de l'atelier" },
  { key: 'CHARTE', label: 'Produits conformes à la Charte Beauté Pure' },
  { key: 'CONTRAT', label: 'Contrat de commission signé' },
] as const;
export const WITHYOU_CHECK_KEYS: string[] = WITHYOU_CHECKS.map((c) => c.key);

export function hasLegalDocument(types: string[]): boolean {
  return types.some((t) => (LEGAL_DOCUMENT_TYPES as string[]).includes(t));
}

export function canSubmitDossier(types: string[]): boolean {
  return hasLegalDocument(types) && types.includes('CATALOGUE');
}

/** Checklist de validation vue par la marque, dans l'ordre du parcours. */
export function buildBrandChecklist(input: {
  documentTypes: string[];
  submitted: boolean;
  checks: string[];
  telephone: string | null;
}): BrandChecklistItem[] {
  const { documentTypes, submitted, checks, telephone } = input;
  return [
    { key: 'COMPTE', label: 'Compte créé', by: 'BRAND', done: true },
    {
      key: 'LEGAL',
      label: "Registre du commerce ou carte d'artisan",
      by: 'BRAND',
      done: hasLegalDocument(documentTypes),
      hint: 'Une copie lisible (PDF ou photo) du document à votre nom ou au nom de la marque.',
    },
    {
      key: 'CATALOGUE',
      label: 'Catalogue de tous vos produits',
      by: 'BRAND',
      done: documentTypes.includes('CATALOGUE'),
      hint: 'Noms, photos, contenances et prix de chaque produit (PDF, Excel ou Word).',
    },
    { key: 'ENVOI', label: 'Dossier envoyé à withyou', by: 'BRAND', done: submitted },
    ...WITHYOU_CHECKS.map((c) => ({
      key: c.key,
      label: c.label,
      by: 'WITHYOU' as const,
      done: checks.includes(c.key),
      ...(c.key === 'VISITE'
        ? { hint: telephone ? `L'équipe withyou vous appelle au ${telephone} pour fixer le rendez-vous.` : "L'équipe withyou vous contacte pour fixer le rendez-vous." }
        : {}),
    })),
  ];
}

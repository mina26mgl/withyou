export type StatutProduit = 'DRAFT' | 'IN_REVIEW' | 'ONLINE' | 'REJECTED';

export type Moment = 'Matin' | 'Soir' | 'Les deux';

export interface Categorie {
  id: string;
  nom: string;
  slug: string;
  parentId?: string | null;
}

export interface ProduitImage {
  id: string;
  url: string;
  ordre: number;
  isPrincipale: boolean;
  altText?: string | null;
}

/** Nature d'un document joint à un produit. */
export type ProduitDocumentType = 'FICHE_TECHNIQUE' | 'CERTIFICAT' | 'ANALYSE' | 'AUTRE';

/** Document joint par la marque (PDF ou image), consulté par withyou à la validation. */
export interface ProduitDocument {
  nom: string;
  url: string;
  type: ProduitDocumentType;
  /** Taille en octets. */
  taille?: number | null;
}

/**
 * Produit visible par les clientes : en ligne (validé par withyou) et vendu par
 * une marque dont la page est publiée et le compte actif.
 */
export interface PublicProduct {
  id: string;
  nom: string;
  description: string;
  ingredients: string[];
  prix: number;
  discount: number | null;
  size: string | null;
  moment: string | null;
  skinTypes: string[];
  needs: string[];
  imagesUrls: string[];
  marque: { nom: string; slug: string; logoUrl: string | null };
  /** Pack composé d'autres produits de la marque. */
  isPack: boolean;
}

/** Un produit dans un pack (espace marque, fiche produit, console admin). */
export interface PackItem {
  produitId: string;
  nom: string;
  quantite: number;
  /** Prix unitaire du produit vendu seul. */
  prix: number;
  imageUrl: string | null;
  statut?: StatutProduit;
}

/** Avis vérifié affiché sur la fiche produit. */
export interface PublicProductReview {
  id: string;
  auteur: string;
  stars: number;
  texte: string;
  skinType: string | null;
  /** Réponse publique de la marque. */
  reply: string | null;
  createdAt: string;
}

/** Fiche produit complète (page /produit/[id]). */
export interface PublicProductDetail extends PublicProduct {
  categorie: string | null;
  /** Modes de conservation (plusieurs possibles). */
  modesConservation: string[];
  /** Durée de conservation après ouverture, en jours. */
  dureeConservationJours: number | null;
  /** En stock ou non (la quantité exacte reste côté marque). */
  enStock: boolean;
  documents: { nom: string; url: string; type: ProduitDocumentType }[];
  avis: PublicProductReview[];
  avisStats: { average: number; count: number } | null;
  /** Contenu du pack (vide pour un produit simple). */
  packItems: PackItem[];
  /** Prix des produits du pack achetés séparément (null pour un produit simple). */
  packValeur: number | null;
}

export interface Produit {
  id: string;
  partenaireId: string;
  categorieId?: string | null;
  categorieNom?: string | null;
  nom: string;
  description: string;
  ingredients?: string | null;
  prix: number;
  stock: number;
  statut: StatutProduit;
  imagesUrls: string[];
  images?: ProduitImage[];
  documents?: ProduitDocument[];
  size?: string | null;
  skinTypes?: string[];
  needs?: string[];
  moment?: Moment | null;
  ventes30j?: number;
  fitScore?: number | null;
  modesConservation?: string[];
  /** Durée de conservation après ouverture, en jours. */
  dureeConservationJours?: number | null;
  /** Message de withyou quand le produit a été refusé (corrections demandées). */
  rejectionMessage?: string | null;
  /** Pack composé d'autres produits de la marque. */
  isPack?: boolean;
  packItems?: PackItem[];
  createdAt: string;
  updatedAt: string;
}

export interface Avis {
  id: string;
  consommateurId: string;
  produitId: string;
  note: number;
  commentaire?: string | null;
  isVerifiedAchat: boolean;
  statut: string;
  createdAt: string;
}

export interface Favori {
  id: string;
  consommateurId: string;
  produitId: string;
  createdAt: string;
}

/** Produit d'une routine proposée (instantané pris quand la routine a été créée). */
export interface RoutineItem {
  produitId: string;
  nom: string;
  marque: { nom: string; slug: string; logoUrl: string | null };
  imageUrl: string | null;
  prix: number;
  /** « % adapté » au moment de la proposition ; null sans réponses au quiz. */
  fitScore: number | null;
}

/** Routine proposée à la cliente à la fin de l'onboarding (collection MongoDB `routines`). */
export interface ConsumerRoutine {
  id: string;
  resume: string;
  matin: RoutineItem[];
  soir: RoutineItem[];
  createdAt: string;
}

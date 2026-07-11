export type StatutProduit = 'DRAFT' | 'PENDING' | 'ACTIVE' | 'REJECTED';

export interface Categorie {
  id: string;
  nom: string;
  slug: string;
  parentId?: string | null;
}

export interface Produit {
  id: string;
  partenaireId: string;
  categorieId?: string | null;
  nom: string;
  description: string;
  ingredients?: string | null;
  prix: number;
  stock: number;
  statut: StatutProduit;
  imagesUrls: string[];
  modeConservation?: string | null;
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

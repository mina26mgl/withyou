export type StatutCommande = 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export type ModePaiement = 'CIB' | 'SATIM' | 'CASH_LIVRAISON';

export type StatutPaiement = 'PENDING' | 'SUCCESS' | 'FAILED';

export interface LigneCommande {
  id: string;
  commandeId: string;
  produitId: string;
  quantite: number;
  prixUnitaire: number;
  commission: number;
}

export interface Paiement {
  id: string;
  commandeId: string;
  methode: ModePaiement;
  statut: StatutPaiement;
  montant: number;
  transactionRef?: string | null;
  createdAt: string;
}

export interface Livraison {
  id: string;
  commandeId: string;
  prestataire?: string | null;
  codeSuivi?: string | null;
  statut: string;
  adresseLivraison?: string | null;
  dateExpedition?: string | null;
  dateArrivee?: string | null;
  phoneCorrespondant?: string | null;
}

export interface Commande {
  id: string;
  consommateurId: string;
  statut: StatutCommande;
  montantTotal: number;
  montantCommission: number;
  modePaiement: ModePaiement;
  adresseLivraison: string;
  wilayaLivraison: string;
  codeSuivi?: string | null;
  createdAt: string;
  updatedAt: string;
  lignes?: LigneCommande[];
  paiement?: Paiement | null;
  livraison?: Livraison | null;
}

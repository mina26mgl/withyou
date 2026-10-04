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

/** Commande vue par la cliente sur /commandes (GET /commandes). */
export interface ConsumerOrder {
  id: string;
  /** Numéro lisible donné à la confirmation (order.code_suivi). */
  numero: string;
  /** order.status : « confirmee », « en_cours », « livree »… */
  statut: string;
  createdAt: string | null;
  total: number;
  lignes: {
    produitId: string;
    nom: string;
    imageUrl: string | null;
    prixUnitaire: number;
    quantite: number;
  }[];
}

import type { BrandRequestDocument } from './partner';
import type { PackItem, ProduitDocument } from './produit';

import type { BrandPageCandidates, BrandPageContent } from './marque';

/** Collaborateur withyou connecté à la console. */
/** OWNER = direction (gère les accès), OPERATIONS = équipe opérations. */
export type AdminRole = 'OWNER' | 'OPERATIONS';

export interface AdminMe {
  id: string;
  prenom: string;
  nom: string;
  roleAdmin: string;
  email: string;
  /** Photo de profil choisie dans la console (null : initiales). */
  photoUrl: string | null;
  telephone: string | null;
  poste: string | null;
  /** Membre de l'équipe depuis (ISO). */
  since: string;
}

export interface AdminProfileInput {
  prenom: string;
  nom: string;
  telephone: string | null;
  poste: string | null;
}

/** Membre de l'équipe vu depuis la page Profil (gestion des accès). */
export interface AdminAccessMember {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  photoUrl: string | null;
  roleAdmin: string;
  poste: string | null;
  actif: boolean;
  since: string;
  /** Dernière action enregistrée dans le journal (ISO), null s'il n'y en a pas. */
  lastActionAt: string | null;
  /** Nombre de marques qu'il suit. */
  brands: number;
}

/** Accès donné à une adresse e-mail, pas encore utilisé. */
export interface AdminInvitation {
  id: string;
  email: string;
  prenom: string;
  nom: string;
  roleAdmin: string;
  poste: string | null;
  createdAt: string;
  invitedBy: string;
}

export interface AdminInvitationInput {
  email: string;
  prenom: string;
  nom: string;
  roleAdmin: AdminRole;
  poste?: string | null;
}

/** Action du journal d'audit, pour « Mon activité ». */
export interface AdminActivity {
  id: string;
  action: string;
  targetType: string;
  /** Nom lisible de la cible quand le journal le contient (marque, produit…). */
  targetName: string | null;
  createdAt: string;
}

export interface AdminProfilePage {
  me: AdminMe;
  team: AdminAccessMember[];
  invitations: AdminInvitation[];
  activity: AdminActivity[];
}

export type AdminIncidentType = 'BRAND' | 'CLIENT' | 'PAYMENT' | 'QUALITY' | 'CARRIER';

/** Incident ouvert qui bloque une commande (table order_incident). */
export interface AdminIncident {
  id: string;
  orderId: string;
  orderCode: string;
  client: string | null;
  wilaya: string;
  carrier: string | null;
  type: AdminIncidentType;
  reason: string;
  openedAt: string;
}

export interface AdminOverview {
  /** Box en préparation la plus proche, et ses produits pas encore réunis. */
  box: { id: string; nom: string; manques: AdminBoxItem[] } | null;
  /** Demandes d'abonnement en attente d'activation. */
  pendingSubscriptions: number;
  /** Incidents ouverts, les plus anciens d'abord. */
  incidents: AdminIncident[];
  pendingPages: number;
  pendingBrandRequests: number;
  activeBrands: number;
  suspendedBrands: number;
  openIncidents: number;
  onlineProducts: number;
}

export type AdminValidationKind = 'page' | 'brand' | 'product';

/** Un élément de la file « Validations ». */
export interface AdminValidationItem {
  kind: AdminValidationKind;
  /** marqueId pour une page, id de demande_partenaire pour une nouvelle marque, id du produit. */
  id: string;
  brand: string;
  title: string;
  /** ISO — soumission de la page ou inscription de la marque (null si inconnue). */
  since: string | null;
  /** Nouvelle marque : e-mail du compte qui a fait la demande. */
  email?: string;
  /** Nouvelle marque : téléphone et nom saisis à l'inscription. */
  telephone?: string | null;
  contact?: string | null;
  /** Nouvelle marque : pièces du dossier et points de la checklist déjà cochés. */
  documents?: BrandRequestDocument[];
  checks?: string[];
  /** Logo de la marque (brouillon, sinon publié) ; null = initiales. */
  logoUrl: string | null;
}

/** Détail d'une page marque en validation : le brouillon soumis et ce qu'il affichera. */
export interface AdminPageReview {
  marqueId: string;
  slug: string;
  draft: BrandPageContent;
  candidates: BrandPageCandidates;
  contrast: { textRatio: number; accentRatio: number; ok: boolean };
  firstPublication: boolean;
}

/** Détail d'un produit envoyé en vérification, avec les contrôles automatiques de la Charte. */
export interface AdminProductReview {
  id: string;
  brand: string;
  nom: string;
  categorie: string | null;
  size: string | null;
  prix: number;
  stock: number;
  description: string;
  images: string[];
  ingredients: string[];
  skinTypes: string[];
  needs: string[];
  moment: string | null;
  modesConservation: string[];
  dureeConservationJours: number | null;
  /** Documents joints par la marque (fiche technique, certificat, analyses…). */
  documents: ProduitDocument[];
  /** Contenu du pack (vide pour un produit simple). */
  packItems: PackItem[];
  checks: {
    inciFilled: boolean;
    /** Ingrédients de la liste trouvés dans la liste d'exclusion Beauté Pure. */
    excludedFound: string[];
    targetingFilled: boolean;
  };
}

export type AdminBrandStatus = 'ACTIVE' | 'PENDING' | 'SUSPENDED';

export interface AdminBrandRow {
  id: string;
  name: string;
  slug: string;
  type: string;
  city: string;
  status: AdminBrandStatus;
  pageStatus: 'DRAFT' | 'IN_REVIEW' | 'LIVE';
  products: number;
  onlineProducts: number;
  commissionRate: number;
  rating: number | null;
  reviews: number;
  contact: string | null;
  suspendedReason: string | null;
  logoUrl: string | null;
  /** Collaborateur withyou qui suit la marque. */
  accountManager: { id: string; name: string } | null;
}

/** Étapes d'une commande, dans l'ordre (barre d'avancement de la console). */
export const ORDER_STEPS = [
  'Confirmée',
  'Collecte chez les marques',
  'Contrôle et emballage',
  'Chez le livreur',
  'Livrée',
] as const;

/** 0 = Confirmée … 4 = Livrée. */
export type OrderStep = 0 | 1 | 2 | 3 | 4;

export interface AdminOrderRow {
  id: string;
  code: string;
  client: string | null;
  wilaya: string;
  brands: string[];
  total: number;
  payment: string;
  carrier: string | null;
  step: OrderStep;
  /** Incident ouvert qui bloque la commande à son étape actuelle. */
  block: { type: AdminIncidentType; reason: string } | null;
  createdAt: string | null;
}

export interface AdminOrderDetail extends AdminOrderRow {
  commune: string;
  address: string;
  phone: string | null;
  paymentStatus: string | null;
  brandItems: { brand: string; received: boolean; items: { nom: string; quantite: number; prix: number }[] }[];
  timeline: { label: string; at: string | null; bad?: boolean }[];
}

/** Service de livraison et ses chiffres, calculés depuis les livraisons réelles. */
export interface AdminCarrier {
  id: string;
  nom: string;
  /** Vide = les 58 wilayas. */
  wilayas: string[];
  coutColis: number;
  delaiJours: number | null;
  telephone: string | null;
  email: string | null;
  actif: boolean;
  stats: {
    enCours: number;
    livres: number;
    /** Délai moyen constaté entre remise au transporteur et livraison, en jours. */
    delaiMoyenJours: number | null;
    anomalies: number;
  };
}

export type AdminTicketStatus = 'OUVERT' | 'REPONDU' | 'RESOLU';

/** Réclamation envoyée à un transporteur (suivi des tickets). */
export interface AdminTicket {
  id: string;
  orderId: string;
  orderCode: string;
  transporteur: string;
  codeSuivi: string | null;
  motif: string;
  message: string;
  statut: AdminTicketStatus;
  openedAt: string;
  openedBy: string;
  reponse: string | null;
  reponseAt: string | null;
  relances: number;
  derniereRelanceAt: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  /** Pas de réponse 24 h après l'ouverture ou la dernière relance. */
  aRelancer: boolean;
  /** Contact du transporteur, pour l'envoi par e-mail. */
  transporteurEmail: string | null;
}

export interface AdminDeliveries {
  carriers: AdminCarrier[];
  /** Colis bloqués chez un transporteur ou clientes injoignables. */
  anomalies: (AdminIncident & { ticketId: string | null })[];
  tickets: AdminTicket[];
}

export interface AdminCarrierInput {
  nom: string;
  wilayas: string[];
  coutColis: number;
  delaiJours?: number | null;
  telephone?: string | null;
  email?: string | null;
  actif?: boolean;
}

/** Informations fiscales et bancaires d'une marque (console admin uniquement). */
export interface AdminBrandLegal {
  nif: string | null;
  nis: string | null;
  rc: string | null;
  articleImposition: string | null;
  /** 20 chiffres : code banque (3), agence (5), compte (10), clé (2). */
  rib: string | null;
  banque: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

export type AdminBrandLegalInput = Omit<AdminBrandLegal, 'updatedAt' | 'updatedBy'>;

/** Collaborateur withyou (pour l'assignation des marques). */
export interface AdminTeamMember {
  id: string;
  prenom: string;
  nom: string;
  roleAdmin: string;
  /** Nombre de marques qu'il suit. */
  brands: number;
}

/* ------------------------------ Abonnements ------------------------------ */

export type PaidFeature = 'ANALYTICS' | 'PROMOTION';
export type SubscriptionPeriod = 'MENSUEL' | 'ANNUEL';
export type SubscriptionStatus = 'DEMANDE' | 'ACTIF' | 'EXPIRE' | 'REFUSE' | 'ANNULE';

/** Offre du catalogue (géré dans la console). */
export interface SubscriptionOffer {
  id: string;
  nom: string;
  description: string;
  fonctionnalite: PaidFeature | null;
  prixMensuel: number;
  prixAnnuel: number | null;
  actif: boolean;
}

export interface AdminOffer extends SubscriptionOffer {
  /** Abonnements actifs sur cette offre. */
  abonnesActifs: number;
}

export type AdminOfferInput = Omit<SubscriptionOffer, 'id'>;

/** Abonnement d'une marque, vu par la console. */
export interface AdminSubscription {
  id: string;
  marqueId: string;
  marque: string;
  logoUrl: string | null;
  offre: string;
  fonctionnalite: PaidFeature | null;
  periode: SubscriptionPeriod;
  prix: number;
  /** EXPIRE est calculé : actif mais date de fin passée. */
  statut: SubscriptionStatus;
  demandeAt: string;
  debut: string | null;
  fin: string | null;
  activePar: string | null;
  message: string | null;
}

/** Offre vue par la marque, avec son propre état. */
export interface PartnerOffer extends SubscriptionOffer {
  subscription: { id: string; statut: SubscriptionStatus; periode: SubscriptionPeriod; fin: string | null; message: string | null } | null;
}

/** Produit d'une marque vu par la console, avec sa commission propre. */
export interface AdminBrandProduct {
  id: string;
  nom: string;
  imageUrl: string | null;
  categorie: string | null;
  prix: number;
  stock: number;
  statut: 'DRAFT' | 'IN_REVIEW' | 'ONLINE' | 'REJECTED';
  /** Commission withyou sur ce produit, en %. */
  commission: number;
  /** Unités vendues sur 30 jours. */
  ventes30j: number;
}

/* --------------------------- Salons et spécialistes --------------------------- */

export interface AdminSalon {
  id: string;
  nom: string;
  type: string;
  wilaya: string;
  ville: string | null;
  /** Code donné aux clientes du salon (unique). */
  code: string;
  formee: boolean;
  active: boolean;
  telephone: string | null;
  /** Tests produits attribués au salon. */
  tests: number;
}

export interface AdminSalonInput {
  nom: string;
  type: string;
  wilaya: string;
  ville: string | null;
  /** Vide : généré à partir du nom (ex. LUMIERE10). */
  code: string | null;
  formee: boolean;
  active: boolean;
  telephone: string | null;
}

export type SpecialistCategory = 'EXPERT' | 'CREATRICE';

export interface AdminSpecialist {
  id: string;
  categorie: SpecialistCategory;
  prenom: string;
  nom: string;
  role: string;
  wilaya: string;
  description: string;
  disponibilites: string | null;
  audience: string | null;
  reseau: string | null;
  telephone: string | null;
  email: string | null;
  actif: boolean;
}

export type AdminSpecialistInput = Omit<AdminSpecialist, 'id'>;

/* --------------------------------- Box Rituel --------------------------------- */

export type BoxStatus = 'PREPARATION' | 'ASSEMBLEE' | 'EXPEDIEE';
/** réuni = stock confirmé suffisant ; manque = confirmé insuffisant ; attente = marque sans réponse. */
export type BoxItemState = 'REUNI' | 'MANQUE' | 'ATTENTE';

export interface AdminBoxSummary {
  id: string;
  nom: string;
  mois: string;
  statut: BoxStatus;
  demo: boolean;
}

export interface AdminBoxItem {
  id: string;
  idProduit: string | null;
  nom: string;
  marque: string;
  variantes: string[];
  besoin: number;
  confirme: number;
  etat: BoxItemState;
  relanceAt: string | null;
}

export interface AdminBoxDetail extends AdminBoxSummary {
  dateAssemblage: string;
  dateExpedition: string;
  variantes: { typePeau: string; abonnees: number }[];
  produits: AdminBoxItem[];
  candidatures: { id: string; marque: string; produit: string; variante: string; statut: 'NOUVELLE' | 'RETENUE' | 'REFUSEE' }[];
}

export interface AdminBoxInput {
  /** « 2026-11 » : le mois de la box (création seulement). */
  mois?: string;
  nom: string;
  dateAssemblage: string;
  dateExpedition: string;
  statut?: BoxStatus;
  variantes: { typePeau: string; abonnees: number }[];
}

export interface AdminBoxItemInput {
  /** Produit du catalogue ; sinon nom et marque saisis. */
  idProduit?: string | null;
  nom?: string;
  marque?: string;
  variantes: string[];
  quantiteConfirmee?: number;
  marqueARepondu?: boolean;
}

/** Produit du catalogue proposé à l'ajout dans une box. */
export interface AdminCatalogProduct {
  id: string;
  nom: string;
  marque: string;
  statut: string;
}

/* --------------------------------- Analyses --------------------------------- */

export interface AdminAnalytics {
  period: number;
  /** Début, milieu et fin de la période (ISO), pour l'axe du graphique. */
  axis: [string, string, string];
  kpis: {
    ventes: number;
    ventesPrev: number;
    /** Commissions + abonnements des marques. */
    revenu: number;
    revenuPrev: number;
    commandes: number;
    commandesPrev: number;
    panierMoyen: number;
    panierMoyenPrev: number;
  };
  /** Volume de ventes jour par jour. */
  series: number[];
  revenueSources: { label: string; montant: number; pct: number }[];
  funnel: { label: string; value: number }[];
  topSearches: { query: string; count: number }[];
  skinTypes: { label: string; pct: number }[];
  wilayas: { label: string; pct: number }[];
  topBrands: { marque: string; montant: number }[];
}

import type { StatutProduit } from './produit';

/** Lightweight data for the partner shell (sidebar identity + nav badges). */
export interface PartnerSummary {
  brandName: string;
  logoUrl: string | null;
  accentColor: string;
  contactFirstName: string | null;
  /** E-mail of the signed-in account, so it is obvious which login is active. */
  userEmail: string | null;
  unansweredReviews: number;
  /**
   * True while the brand page has never been submitted nor published (brand just
   * created, nothing prepared yet): the partner is sent to /page-marque first.
   */
  brandSetupPending: boolean;
  /** La page de la marque a été validée au moins une fois par un admin withyou. */
  verified: boolean;
  /** Chargé(e) de compte withyou qui suit la marque (prénom), s'il y en a un. */
  accountManager: string | null;
  /** Fonctionnalités payantes débloquées par un abonnement actif. */
  features: ('ANALYTICS' | 'PROMOTION')[];
  /** Avancement de la mise en ligne (page, produits), pour la checklist de l'accueil. */
  launch: PartnerLaunchChecklist;
}

export interface PartnerProductRow {
  id: string;
  nom: string;
  categorieNom: string | null;
  imageUrl: string | null;
  prix: number;
  stock: number;
  statut: StatutProduit;
  ventes30j: number;
  revenue30j: number;
  fitScore: number | null;
}

export interface HomeTodo {
  kind: 'OUT_OF_STOCK' | 'UNANSWERED_REVIEWS' | 'PAGE_INCOMPLETE';
  title: string;
  detail: string;
  href: string;
  cta: string;
  /** 0-100, only for PAGE_INCOMPLETE (shown as a progress ring). */
  progress?: number;
}

export interface PartnerHome {
  brandName: string;
  contactFirstName: string | null;
  periodStart: string;
  story: {
    keptThisWeek: number;
    keptDelta: number;
    pageViewsThisWeek: number;
    topSkinType: string | null;
    topWilayas: string[];
  };
  kpis: {
    revenue30d: number;
    revenueDeltaPct: number | null;
    unitsSold30d: number;
    unitsDelta: number;
    visits30d: number;
    visitsDeltaPct: number | null;
    ratingAvg: number | null;
    reviewCount: number;
  };
  revenueSeries: number[];
  todos: HomeTodo[];
  topProducts: PartnerProductRow[];
}

export type AnalyticsPeriod = 7 | 30 | 90;

/** Aggregates shown to brands never expose small groups (privacy floor). */
export type PrivacyRows =
  | { insufficient: false; rows: { label: string; pct: number }[] }
  | { insufficient: true; minimum: number };

export interface AnalyticsInsight {
  text: string;
  productId?: string;
  cta?: string;
}

export interface PartnerAnalytics {
  period: AnalyticsPeriod;
  kpis: {
    revenue: number;
    unitsSold: number;
    avgBasket: number;
    conversionRate: number | null;
  };
  series: number[];
  axisLabels: [string, string, string];
  funnel: { visits: number; opened: number; kept: number; purchases: number };
  skinTypes: PrivacyRows;
  wilayas: PrivacyRows;
  queries: { query: string; count: number }[];
  insights: AnalyticsInsight[];
}

export interface PartnerReview {
  id: string;
  auteur: string;
  stars: number;
  produitNom: string;
  skinType: string | null;
  texte: string;
  createdAt: string;
  reply: string | null;
  verified: boolean;
}

export type ReviewFilter = 'all' | 'open' | 'low';

export interface PartnerReviewsResponse {
  summary: {
    avg: number | null;
    count: number;
    distribution: { stars: number; pct: number }[];
  };
  unanswered: number;
  reviews: PartnerReview[];
}

export type PromotionStatus = 'ACTIVE' | 'SCHEDULED' | 'ENDED';

export interface PartnerPromotion {
  id: string;
  nom: string;
  reduction: number;
  produitsNoms: string[];
  dateDebut: string;
  dateFin: string;
  utilisations: number;
  status: PromotionStatus;
}

export type PlacementKind = 'ROUTINE' | 'HOME' | 'BOX' | 'INFLUENCE';

export type SalonTestStatus = 'PENDING' | 'RUNNING' | 'DONE';

export interface PartnerSalonTest {
  id: string;
  produitNom: string;
  salonNom: string | null;
  salonWilaya: string | null;
  status: SalonTestStatus;
  echantillons: number;
  testeuses: number;
  score: number | null;
  citation: string | null;
}

export interface PartnerSalonTestsResponse {
  summary: { tests: number; testeuses: number; satisfaction: number | null };
  tests: PartnerSalonTest[];
}

/* ------------------------------ Mon profil (équipe marque) ------------------------------ */

/** OWNER = responsable (gère l'équipe), MEMBER = membre de l'équipe. */
export type PartnerRole = 'OWNER' | 'MEMBER';

export interface PartnerTeamMember {
  id: string;
  prenom: string | null;
  nom: string | null;
  email: string;
  telephone: string | null;
  poste: string;
  role: string;
  since: string | null;
}

export interface PartnerInvitation {
  id: string;
  email: string;
  prenom: string | null;
  nom: string | null;
  poste: string | null;
  role: string;
  createdAt: string;
  expiresAt: string;
  invitedBy: string;
}

export interface PartnerProfilePage {
  brandName: string;
  me: PartnerTeamMember;
  team: PartnerTeamMember[];
  invitations: PartnerInvitation[];
}

export interface PartnerProfileInput {
  prenom: string;
  nom: string;
  telephone: string | null;
  poste: string;
}

export interface PartnerInvitationInput {
  email: string;
  prenom: string;
  nom: string;
  poste: string | null;
  role: PartnerRole;
}

/* ------------------------------ Dossier d'inscription d'une marque ------------------------------ */

/** Pièces du dossier : registre du commerce ou carte d'artisan, catalogue des produits. */
export type BrandDocumentType = 'REGISTRE_COMMERCE' | 'CARTE_ARTISAN' | 'CATALOGUE' | 'AUTRE';

export interface BrandRequestDocument {
  id: string;
  type: BrandDocumentType;
  nom: string;
  url: string;
  taille: number | null;
  createdAt: string;
}

/** Point de la checklist de validation : cochés par la marque (documents) ou par withyou. */
export interface BrandChecklistItem {
  key: string;
  label: string;
  /** Qui s'en occupe : la marque ou l'équipe withyou. */
  by: 'BRAND' | 'WITHYOU';
  done: boolean;
  hint?: string;
}

export interface BrandRequestState {
  id: string;
  nomMarque: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  /** Dossier envoyé à withyou (null = en préparation). */
  submittedAt: string | null;
  rejectionMessage: string | null;
  documents: BrandRequestDocument[];
  checklist: BrandChecklistItem[];
  /** Pièces obligatoires présentes : le dossier peut être envoyé. */
  canSubmit: boolean;
}

/** Checklist affichée dans l'espace marque tant que la marque n'est pas entièrement en ligne. */
export interface PartnerLaunchChecklist {
  pageStatus: 'DRAFT' | 'IN_REVIEW' | 'LIVE';
  productsOnline: number;
  productsInReview: number;
  productsTotal: number;
}

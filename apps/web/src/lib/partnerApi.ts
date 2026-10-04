import type {
  BrandDocumentType,
  BrandRequestState,
  ProduitDocument,
  PartnerInvitationInput,
  PartnerProfileInput,
  PartnerProfilePage,
  PartnerRole,
  BrandPageCandidates,
  PartnerOffer,
  AnalyticsPeriod,
  BrandPageState,
  Categorie,
  PartnerAnalytics,
  PartnerHome,
  PartnerPromotion,
  PartnerReview,
  PartnerReviewsResponse,
  PartnerSalonTest,
  PartnerSalonTestsResponse,
  PartnerSummary,
  PlacementKind,
  Produit,
  ReviewFilter,
} from '@withyou/shared-types';
import { api, ApiError } from './api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface UpsertProductPayload {
  nom: string;
  /** Absents pour un pack : l'API les calcule à partir de ses produits. */
  categorieId?: string;
  size?: string;
  prix: number;
  stock?: number;
  description: string;
  skinTypes: string[];
  needs: string[];
  moment?: 'Matin' | 'Soir' | 'Les deux';
  inci?: string;
  modesConservation?: string[];
  dureeConservationJours?: number;
  images?: { url: string; ordre: number; isPrincipale: boolean }[];
  documents?: ProduitDocument[];
  /** Création d'un pack et son contenu (au moins 2 produits de la marque). */
  isPack?: boolean;
  packItems?: { produitId: string; quantite: number }[];
  mode: 'draft' | 'review';
}

export const partnerApi = {
  getSummary: (token: string) => api.get<PartnerSummary>('/partner/summary', { token }),
  getHome: (token: string) => api.get<PartnerHome>('/partner/home', { token }),
  getAnalytics: (token: string, period: AnalyticsPeriod) =>
    api.get<PartnerAnalytics>(`/partner/analytics?period=${period}`, { token }),

  listReviews: (token: string, filter: ReviewFilter) =>
    api.get<PartnerReviewsResponse>(`/partner/reviews?filter=${filter}`, { token }),
  replyToReview: (token: string, id: string, text: string) =>
    api.post<PartnerReview>(`/partner/reviews/${id}/reply`, { text }, { token }),

  listPromotions: (token: string) => api.get<PartnerPromotion[]>('/partner/promotions', { token }),
  createPromotion: (
    token: string,
    dto: { nom: string; reduction: number; dateDebut: string; dateFin: string; produitIds: string[] },
  ) => api.post<PartnerPromotion>('/partner/promotions', dto, { token }),
  requestPlacement: (token: string, kind: PlacementKind) =>
    api.post<{ id: string }>('/partner/placements', { kind }, { token }),

  listSalonTests: (token: string) => api.get<PartnerSalonTestsResponse>('/partner/salon-tests', { token }),
  createSalonTest: (
    token: string,
    dto: { produitId: string; echantillons: number; wilaya?: string; question?: string },
  ) => api.post<PartnerSalonTest>('/partner/salon-tests', dto, { token }),

  listCategories: () => api.get<Categorie[]>('/categories'),

  listSubscriptions: (token: string) => api.get<PartnerOffer[]>('/partner/abonnements', { token }),
  requestSubscription: (token: string, offreId: string, periode: 'MENSUEL' | 'ANNUEL') =>
    api.post<{ id: string }>('/partner/abonnements', { offreId, periode }, { token }),
  cancelSubscriptionRequest: (token: string, id: string) => api.post<void>(`/partner/abonnements/${id}/annuler`, undefined, { token }),

  getBrandPage: (token: string) => api.get<BrandPageState>('/partner/brand/page', { token }),
  getBrandCandidates: (token: string) => api.get<BrandPageCandidates>('/partner/brand/page/extras', { token }),
  updateBrandDraft: (token: string, dto: Partial<BrandPageState['draft']>) =>
    api.patch<BrandPageState>('/partner/brand/page', dto, { token }),
  submitBrandPage: (token: string) => api.post<BrandPageState>('/partner/brand/page/submit', undefined, { token }),

  listProducts: (token: string) => api.get<Produit[]>('/partner/products', { token }),
  getProduct: (token: string, id: string) => api.get<Produit>(`/partner/products/${id}`, { token }),
  createProduct: (token: string, dto: UpsertProductPayload) =>
    api.post<Produit>('/partner/products', dto, { token }),
  updateProduct: (token: string, id: string, dto: UpsertProductPayload) =>
    api.patch<Produit>(`/partner/products/${id}`, dto, { token }),
  /** Description rédigée par l'IA (Gemini, côté serveur) d'après les ingrédients et les types de peau. */
  generateProductDescription: (
    token: string,
    dto: { nom: string; inci: string; skinTypes: string[]; needs: string[]; categorie?: string },
  ) => api.post<{ description: string }>('/partner/products/ai-description', dto, { token }),

  async uploadFile(token: string, file: File, kind: 'image' | 'audio' | 'video' | 'document'): Promise<{ url: string }> {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${API_BASE_URL}/partner/uploads?kind=${kind}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
      credentials: 'include',
    });
    if (!res.ok) {
      throw new ApiError(res.status, await res.text());
    }
    return res.json();
  },
};

/** Page « Mon profil » : mes informations et l'équipe de la marque. */
export const partnerProfileApi = {
  get: (token: string) => api.get<PartnerProfilePage>('/partner/profil', { token }),
  save: (token: string, dto: PartnerProfileInput) => api.put<void>('/partner/profil', dto, { token }),
  /** Recopie l'adresse principale vérifiée dans Clerk. */
  syncEmail: (token: string) => api.post<{ email: string }>('/partner/profil/email', undefined, { token }),
  invite: (token: string, dto: PartnerInvitationInput) =>
    api.post<{ id: string; existingAccount: boolean }>('/partner/equipe/invitations', dto, { token }),
  revokeInvitation: (token: string, id: string) => api.delete<void>(`/partner/equipe/invitations/${id}`, { token }),
  setRole: (token: string, id: string, role: PartnerRole) => api.patch<void>(`/partner/equipe/${id}`, { role }, { token }),
  remove: (token: string, id: string) => api.delete<void>(`/partner/equipe/${id}`, { token }),
};

/** Dossier d'inscription d'une marque en attente de validation. */
export const brandRequestApi = {
  get: (token: string) => api.get<BrandRequestState>('/demande-marque', { token }),
  async upload(token: string, file: File, type: BrandDocumentType): Promise<BrandRequestState> {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${API_BASE_URL}/demande-marque/documents?type=${type}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
      credentials: 'include',
    });
    if (!res.ok) throw new ApiError(res.status, await res.text());
    return res.json();
  },
  remove: (token: string, id: string) => api.delete<BrandRequestState>(`/demande-marque/documents/${id}`, { token }),
  submit: (token: string) => api.post<BrandRequestState>('/demande-marque/envoyer', undefined, { token }),
};

export const PARTNER_ROLE_LABEL: Record<string, string> = { OWNER: 'Responsable', MEMBER: 'Membre' };

/** NestJS error responses are JSON — unwrap the human-readable `message` field. */
export function apiErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    try {
      const parsed = JSON.parse(err.message) as { message?: string | string[] };
      if (typeof parsed.message === 'string') return parsed.message;
      // Erreurs de validation : Nest renvoie une liste, on affiche la première.
      if (Array.isArray(parsed.message) && parsed.message.length) return parsed.message[0];
    } catch {
      // fall through
    }
    return `${fallback} (erreur ${err.status})`;
  }
  // fetch rejeté : l'API ne répond pas (arrêtée, ou en train de redémarrer).
  if (err instanceof TypeError) return "Le serveur ne répond pas. Réessayez dans un instant.";
  return fallback;
}

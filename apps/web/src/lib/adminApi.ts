import type {
  AdminAnalytics,
  AdminInvitationInput,
  AdminProfileInput,
  AdminProfilePage,
  AdminRole,
  AdminBoxDetail,
  AdminBoxInput,
  AdminBoxItemInput,
  AdminCatalogProduct,
  AdminBoxSummary,
  AdminSalon,
  AdminSalonInput,
  AdminSpecialist,
  AdminSpecialistInput,
  AdminBrandLegal,
  AdminBrandProduct,
  AdminOffer,
  AdminOfferInput,
  AdminSubscription,
  AdminBrandLegalInput,
  AdminBrandRow,
  AdminCarrierInput,
  AdminDeliveries,
  AdminMe,
  AdminOrderDetail,
  AdminOrderRow,
  AdminOverview,
  AdminPageReview,
  AdminTeamMember,
  AdminProductReview,
  AdminValidationItem,
} from '@withyou/shared-types';
import { api, ApiError } from './api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export const adminApi = {
  me: (token: string) => api.get<AdminMe>('/admin/me', { token }),
  team: (token: string) => api.get<AdminTeamMember[]>('/admin/equipe', { token }),
  overview: (token: string) => api.get<AdminOverview>('/admin/overview', { token }),
  validations: (token: string) => api.get<AdminValidationItem[]>('/admin/validations', { token }),
  pageReview: (token: string, marqueId: string) => api.get<AdminPageReview>(`/admin/validations/page/${marqueId}`, { token }),
  approvePage: (token: string, marqueId: string) =>
    api.post<{ slug: string }>(`/admin/validations/page/${marqueId}/approve`, undefined, { token }),
  rejectPage: (token: string, marqueId: string, message: string) =>
    api.post<void>(`/admin/validations/page/${marqueId}/reject`, { message }, { token }),
  approveBrand: (token: string, demandeId: string) =>
    api.post<{ marqueId: string }>(`/admin/validations/brand/${demandeId}/approve`, undefined, { token }),
  brandChecks: (token: string, demandeId: string, checks: string[]) =>
    api.put<void>(`/admin/validations/brand/${demandeId}/checks`, { checks }, { token }),
  rejectBrand: (token: string, demandeId: string, message: string) =>
    api.post<void>(`/admin/validations/brand/${demandeId}/reject`, { message }, { token }),
  productReview: (token: string, id: string) => api.get<AdminProductReview>(`/admin/validations/product/${id}`, { token }),
  approveProduct: (token: string, id: string) => api.post<void>(`/admin/validations/product/${id}/approve`, undefined, { token }),
  rejectProduct: (token: string, id: string, message: string) =>
    api.post<void>(`/admin/validations/product/${id}/reject`, { message }, { token }),
  orders: (token: string) => api.get<AdminOrderRow[]>('/admin/commandes', { token }),
  order: (token: string, id: string) => api.get<AdminOrderDetail>(`/admin/commandes/${id}`, { token }),
  deliveries: (token: string) => api.get<AdminDeliveries>('/admin/livraisons', { token }),
  createCarrier: (token: string, dto: AdminCarrierInput) => api.post<{ id: string }>('/admin/transporteurs', dto, { token }),
  updateCarrier: (token: string, id: string, dto: AdminCarrierInput) => api.patch<void>(`/admin/transporteurs/${id}`, dto, { token }),
  offers: (token: string) => api.get<AdminOffer[]>('/admin/offres', { token }),
  createOffer: (token: string, dto: AdminOfferInput) => api.post<{ id: string }>('/admin/offres', dto, { token }),
  updateOffer: (token: string, id: string, dto: AdminOfferInput) => api.patch<void>(`/admin/offres/${id}`, dto, { token }),
  subscriptions: (token: string) => api.get<AdminSubscription[]>('/admin/abonnements', { token }),
  subscriptionAction: (token: string, id: string, action: 'activer' | 'renouveler') =>
    api.post<void>(`/admin/abonnements/${id}/${action}`, undefined, { token }),
  subscriptionStop: (token: string, id: string, action: 'refuser' | 'arreter', message: string) =>
    api.post<void>(`/admin/abonnements/${id}/${action}`, { message }, { token }),
  brandProducts: (token: string, marqueId: string) => api.get<AdminBrandProduct[]>(`/admin/marques/${marqueId}/produits`, { token }),
  setProductCommission: (token: string, produitId: string, commission: number) =>
    api.patch<void>(`/admin/produits/${produitId}/commission`, { commission }, { token }),
  salons: (token: string) => api.get<AdminSalon[]>('/admin/salons', { token }),
  createSalon: (token: string, dto: AdminSalonInput) => api.post<{ id: string; code: string }>('/admin/salons', dto, { token }),
  updateSalon: (token: string, id: string, dto: AdminSalonInput) => api.patch<void>(`/admin/salons/${id}`, dto, { token }),
  specialists: (token: string) => api.get<AdminSpecialist[]>('/admin/specialistes', { token }),
  createSpecialist: (token: string, dto: AdminSpecialistInput) => api.post<{ id: string }>('/admin/specialistes', dto, { token }),
  updateSpecialist: (token: string, id: string, dto: AdminSpecialistInput) => api.patch<void>(`/admin/specialistes/${id}`, dto, { token }),
  boxes: (token: string) => api.get<AdminBoxSummary[]>('/admin/box', { token }),
  box: (token: string, id: string | null) => api.get<AdminBoxDetail | null>(id ? `/admin/box/${id}` : '/admin/box/courante', { token }),
  createBox: (token: string, dto: AdminBoxInput) => api.post<{ id: string }>('/admin/box', dto, { token }),
  updateBox: (token: string, id: string, dto: AdminBoxInput) => api.patch<void>(`/admin/box/${id}`, dto, { token }),
  boxCatalogue: (token: string) => api.get<AdminCatalogProduct[]>('/admin/box/catalogue', { token }),
  addBoxItem: (token: string, boxId: string, dto: AdminBoxItemInput) => api.post<{ id: string }>(`/admin/box/${boxId}/produits`, dto, { token }),
  updateBoxItem: (token: string, id: string, dto: AdminBoxItemInput) => api.patch<void>(`/admin/box/produits/${id}`, dto, { token }),
  removeBoxItem: (token: string, id: string) => api.delete<void>(`/admin/box/produits/${id}`, { token }),
  boxRelance: (token: string, itemId: string) => api.post<void>(`/admin/box/produits/${itemId}/relance`, undefined, { token }),
  boxDecide: (token: string, candidatureId: string, statut: 'RETENUE' | 'REFUSEE') =>
    api.post<void>(`/admin/box/candidatures/${candidatureId}`, { statut }, { token }),
  analytics: (token: string, period: number) => api.get<AdminAnalytics>(`/admin/analyses?period=${period}`, { token }),
  brands: (token: string) => api.get<AdminBrandRow[]>('/admin/marques', { token }),
  updateBrand: (
    token: string,
    id: string,
    dto: {
      commissionRate?: number;
      status?: 'ACTIVE' | 'SUSPENDED';
      suspendedReason?: string;
      accountManagerId?: string | null;
      applyToProducts?: boolean;
    },
  ) => api.patch<void>(`/admin/marques/${id}`, dto, { token }),
};

/** « il y a 3 h », « il y a 2 j » — comme dans le prototype. */
export function sinceLabel(iso: string | null): string {
  if (!iso) return 'date inconnue';
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 60) return minutes <= 1 ? "à l'instant" : `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.round(hours / 24)} j`;
}

export const adminTicketsApi = {
  open: (token: string, dto: { orderId: string; motif: string; message: string }) =>
    api.post<{ id: string }>('/admin/tickets', dto, { token }),
  relance: (token: string, id: string) => api.post<void>(`/admin/tickets/${id}/relance`, undefined, { token }),
  reply: (token: string, id: string, reponse: string) => api.post<void>(`/admin/tickets/${id}/reponse`, { reponse }, { token }),
  resolve: (token: string, id: string) => api.post<void>(`/admin/tickets/${id}/resoudre`, undefined, { token }),
};

/** Mêmes motifs que l'API (TICKET_MOTIFS). */
export const TICKET_MOTIFS = [
  'Colis immobile',
  'Retard de livraison',
  'Nouvelle tentative de livraison',
  'Colis abîmé',
  'Colis perdu',
  'Autre',
] as const;

/** Page Profil : mon identité, ma photo, l'équipe et ses accès. */
export const adminProfileApi = {
  get: (token: string) => api.get<AdminProfilePage>('/admin/profil', { token }),
  save: (token: string, dto: AdminProfileInput) => api.put<void>('/admin/profil', dto, { token }),
  async uploadPhoto(token: string, file: File): Promise<{ url: string }> {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${API_BASE_URL}/admin/profil/photo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
      credentials: 'include',
    });
    if (!res.ok) throw new ApiError(res.status, await res.text());
    return res.json();
  },
  removePhoto: (token: string) => api.delete<void>('/admin/profil/photo', { token }),
  invite: (token: string, dto: AdminInvitationInput) =>
    api.post<{ id: string; existingAccount: boolean }>('/admin/acces/invitations', dto, { token }),
  revokeInvitation: (token: string, id: string) => api.delete<void>(`/admin/acces/invitations/${id}`, { token }),
  updateMember: (token: string, id: string, dto: { roleAdmin?: AdminRole; actif?: boolean }) =>
    api.patch<{ brandsUnassigned: number }>(`/admin/acces/${id}`, dto, { token }),
};

export const ADMIN_ROLE_LABEL: Record<string, string> = { OWNER: 'Direction', OPERATIONS: 'Opérations' };

export const adminLegalApi = {
  get: (token: string, marqueId: string) => api.get<AdminBrandLegal>(`/admin/marques/${marqueId}/legal`, { token }),
  save: (token: string, marqueId: string, dto: AdminBrandLegalInput) =>
    api.put<AdminBrandLegal>(`/admin/marques/${marqueId}/legal`, dto, { token }),
};

/** Mêmes banques que l'API (BANQUES dans admin.dto.ts). */
export const BANQUES = [
  'BNA – Banque Nationale d’Algérie',
  'BEA – Banque Extérieure d’Algérie',
  'CPA – Crédit Populaire d’Algérie',
  'BADR – Banque de l’Agriculture et du Développement Rural',
  'BDL – Banque de Développement Local',
  'CNEP-Banque',
  'Algérie Poste (CCP)',
  'AGB – Gulf Bank Algeria',
  'Al Baraka Banque Algérie',
  'Al Salam Bank Algeria',
  'BNP Paribas El Djazaïr',
  'Société Générale Algérie',
  'Natixis Algérie',
  'Trust Bank Algeria',
  'Housing Bank',
  'Fransabank Algérie',
  'Arab Bank',
  'ABC Bank',
] as const;

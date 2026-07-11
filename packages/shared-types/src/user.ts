export type Role = 'CONSUMER' | 'PARTNER' | 'ADMIN';

export type StatutPartenaire = 'PENDING' | 'ACTIVE' | 'REJECTED';

export interface User {
  id: string;
  email: string;
  role: Role;
  isVerified: boolean;
  lastLogin?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Consommateur {
  id: string;
  userId: string;
  nom: string;
  prenom: string;
  dateNaissance?: string | null;
  phone?: string | null;
  adresse?: string | null;
  wilaya?: string | null;
  pointsFidelite: number;
  onboardingDone: boolean;
  skinProfile?: SkinProfile | null;
}

export interface Partenaire {
  id: string;
  userId: string;
  nomEntreprise: string;
  nomFondateur: string;
  prenomFondateur: string;
  type: string;
  statut: StatutPartenaire;
  NIF?: string | null;
  NIC?: string | null;
  RC?: string | null;
  AI?: string | null;
  urlInstagram?: string | null;
  wilaya?: string | null;
  commissionRate: number;
}

export interface SkinProfile {
  id: string;
  consommateurId: string;
  skinType?: string | null;
  concerns?: Record<string, unknown> | null;
  routinePreferee?: string | null;
}

export interface SkinScan {
  id: string;
  consommateurId: string;
  resultatJson?: Record<string, unknown> | null;
  produitsRecommandes: string[];
  routineJson?: Record<string, unknown> | null;
  scanImageUrl?: string | null;
  source: string;
  createdAt: string;
}

export type PageStatus = 'DRAFT' | 'IN_REVIEW' | 'LIVE';

export type TitleFont = 'serif' | 'sans';

export interface Founder {
  name: string;
  role: string;
  /** Portrait envoyé depuis l'éditeur de page marque (colonne visage.photo_url une fois publiée). */
  photoUrl?: string | null;
}

/** Everything an "espace marque" user can edit on their brand page. */
export interface BrandPageContent {
  name: string;
  since: string;
  /** Lieu d'origine affiché (ville, village ou wilaya), choisi dans la recherche de lieux. */
  city: string;
  /** Coordonnées du lieu d'origine, pour centrer la carte « D'où vient la marque ». */
  cityLat: number | null;
  cityLng: number | null;
  story: string;
  origin: string;
  bgColor: string;
  textColor: string;
  accentColor: string;
  /** Fond des cartes de section (histoire, visages, engagements…). */
  cardColor: string;
  titleFont: TitleFont;
  /** Couverture : image ou courte vidéo (MP4/WebM). */
  coverUrl: string | null;
  /**
   * Image de couverture, obligatoire quand la couverture est une vidéo :
   * affichée pendant le chargement ou en mauvaise connexion, et sur la carte
   * « Marques du jour » de l'app.
   */
  coverImageUrl: string | null;
  logoUrl: string | null;
  audioUrl: string | null;
  founders: Founder[];
  commitments: string[];
  /** « Pour quels besoins ? » : besoins choisis par la marque, avec une photo chacun. */
  needs: BrandNeed[];
  /** « Leurs produits » : produits mis en avant, dans l'ordre. Vide = tous les produits en ligne. */
  featuredProductIds: string[];
  /** « Ce que disent les clientes » : avis choisis. Vide = les mieux notés automatiquement. */
  featuredReviewIds: string[];
}

export interface BrandNeed {
  label: string;
  /** Photo choisie par la marque ; à défaut, celle d'un produit qui répond au besoin. */
  imageUrl: string | null;
}

/** Response shape for GET /partner/brand/page: published data plus the working draft. */
export interface BrandPageState {
  marqueId: string;
  slug: string;
  pageStatus: PageStatus;
  published: BrandPageContent;
  draft: BrandPageContent;
  /** Dernière demande de corrections de withyou, tant que la page n'est pas resoumise. */
  lastRejection: { message: string; at: string } | null;
}

export interface PublicBrandProduct {
  id: string;
  nom: string;
  prix: number;
  imageUrl: string | null;
  fitScore: number | null;
  /** Besoins de peau auxquels le produit répond (sert au filtre « Pour quels besoins ? »). */
  needs: string[];
}

/** Un besoin couvert par la marque, déduit de ses produits en ligne. */
export interface PublicBrandNeed {
  label: string;
  /** Image d'un produit de la marque qui répond à ce besoin. */
  imageUrl: string | null;
  productCount: number;
}

/** Avis client affiché sur la page marque (« Ce que disent les clientes »). */
export interface PublicBrandReview {
  id: string;
  auteur: string;
  stars: number;
  texte: string;
  createdAt: string;
}

/**
 * Tous les produits en ligne et les avis vérifiés d'une marque : la matière dans
 * laquelle la marque choisit ce qu'elle affiche (voir selectBrandSections).
 */
export interface BrandPageCandidates {
  produits: PublicBrandProduct[];
  avis: PublicBrandReview[];
  avisStats: { average: number; count: number } | null;
}

/** Ce que la page affiche réellement dans les sections besoins, produits et avis. */
export interface BrandPageExtras {
  produits: PublicBrandProduct[];
  needs: PublicBrandNeed[];
  avis: PublicBrandReview[];
  avisStats: { average: number; count: number } | null;
}

/** Carte d'une marque publiée (slider « Marques du jour » de l'app cliente). */
export interface PublicBrandCard {
  slug: string;
  name: string;
  /** Image de couverture (jamais une vidéo : l'image fournie avec une couverture vidéo). */
  imageUrl: string | null;
  logoUrl: string | null;
}

/** Public shape for GET /marques/:slug — published content and online products only. */
export interface PublicBrandPage extends BrandPageExtras {
  slug: string;
  content: BrandPageContent;
  produits: PublicBrandProduct[];
}

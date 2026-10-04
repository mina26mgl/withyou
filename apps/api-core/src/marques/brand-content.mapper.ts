import { Prisma } from '@prisma/client';
import type { BrandPageContent, TitleFont } from '@withyou/shared-types';

export const DEFAULT_BRAND_CONTENT: BrandPageContent = {
  name: '',
  since: '',
  city: '',
  cityLat: null,
  cityLng: null,
  story: '',
  origin: '',
  bgColor: '#FAFCFD',
  textColor: '#1F2B24',
  accentColor: '#173A24',
  cardColor: '#FFFFFF',
  titleFont: 'serif',
  coverUrl: null,
  coverImageUrl: null,
  logoUrl: null,
  audioUrl: null,
  founders: [],
  commitments: [],
  needs: [],
  featuredProductIds: [],
  featuredReviewIds: [],
};

export const marqueWithBrandContent = Prisma.validator<Prisma.marqueDefaultArgs>()({
  include: {
    identity_marque: true,
    marque_visage: { include: { visage: true } },
  },
});
export type MarqueWithBrandContent = Prisma.marqueGetPayload<typeof marqueWithBrandContent>;

/** Published section choices, tolerant of a missing or partial JSON value. */
function readSections(json: Prisma.JsonValue | null): Pick<BrandPageContent, 'needs' | 'featuredProductIds' | 'featuredReviewIds'> {
  const s = (json && typeof json === 'object' && !Array.isArray(json) ? json : {}) as Record<string, unknown>;
  const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
  const needs = Array.isArray(s.needs)
    ? (s.needs as { label?: unknown; imageUrl?: unknown }[])
        .filter((n) => typeof n?.label === 'string')
        .map((n) => ({ label: n.label as string, imageUrl: typeof n.imageUrl === 'string' ? n.imageUrl : null }))
    : [];
  return { needs, featuredProductIds: strings(s.featuredProductIds), featuredReviewIds: strings(s.featuredReviewIds) };
}

/** Maps the published (non-draft) DB columns to the shared BrandPageContent shape. */
export function toPublishedBrandContent(marque: MarqueWithBrandContent): BrandPageContent {
  const identity = marque.identity_marque;
  return {
    name: marque.nom_marque,
    since: String(marque.date_creation.getUTCFullYear()),
    city: marque.wilaya_marque,
    cityLat: marque.origin_lat,
    cityLng: marque.origin_lng,
    story: marque.histoire_marque,
    origin: marque.origin ?? '',
    bgColor: identity?.couleur_principale ?? DEFAULT_BRAND_CONTENT.bgColor,
    textColor: identity?.couleur_text ?? DEFAULT_BRAND_CONTENT.textColor,
    accentColor: identity?.couleur_titre ?? DEFAULT_BRAND_CONTENT.accentColor,
    cardColor: identity?.couleur_secondaire ?? DEFAULT_BRAND_CONTENT.cardColor,
    titleFont: (identity?.title_font as TitleFont | undefined) ?? DEFAULT_BRAND_CONTENT.titleFont,
    coverUrl: identity?.banner_url ?? null,
    coverImageUrl: identity?.banner_poster_url ?? null,
    logoUrl: identity?.logo_url ?? null,
    audioUrl: identity?.audio_url ?? null,
    founders: marque.marque_visage.map((mv) => ({
      name: `${mv.visage.prenom} ${mv.visage.nom}`.trim(),
      role: mv.role,
      photoUrl: mv.visage.photo_url,
    })),
    commitments: marque.engagement,
    ...readSections(marque.sections),
  };
}

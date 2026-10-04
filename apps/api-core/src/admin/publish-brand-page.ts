import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import type { BrandPageContent } from '@withyou/shared-types';
import { isVideoUrl, slugify } from '@withyou/shared-utils';

type Tx = Prisma.TransactionClient;

/** Un slug libre dérivé du nom (ajoute -2, -3… si déjà pris par une autre marque). */
export async function uniqueBrandSlug(tx: Tx, name: string, exceptMarqueId?: string): Promise<string> {
  const base = slugify(name) || 'marque';
  for (let i = 1; ; i++) {
    const candidate = i === 1 ? base : `${base}-${i}`;
    const taken = await tx.marque.findFirst({
      where: { slug: candidate, ...(exceptMarqueId ? { NOT: { id_marque: exceptMarqueId } } : {}) },
      select: { id_marque: true },
    });
    if (!taken) return candidate;
  }
}

/** « Saloi Djedid » → prénom « Saloi », nom « Djedid ». */
function splitName(full: string): { prenom: string; nom: string } {
  const parts = full.trim().split(/\s+/);
  return { prenom: parts[0] ?? '', nom: parts.slice(1).join(' ') };
}

/**
 * Publie le brouillon validé : recopie chaque champ dans les vraies colonnes
 * (marque, identity_marque, visage/marque_visage) et met la page en ligne.
 * À appeler dans une transaction.
 */
export async function publishBrandPage(
  tx: Tx,
  marqueId: string,
  draft: BrandPageContent,
  { firstPublication }: { firstPublication: boolean },
): Promise<{ slug: string }> {
  const year = /^\d{4}$/.test(draft.since) ? Number(draft.since) : null;

  // À la première mise en ligne, l'adresse de la page suit le vrai nom de la marque
  // (le nom provisoire donné à l'inscription n'a jamais été public). Ensuite elle ne
  // change plus, pour ne pas casser les liens partagés.
  const slug = firstPublication ? await uniqueBrandSlug(tx, draft.name, marqueId) : undefined;

  const marque = await tx.marque.update({
    where: { id_marque: marqueId },
    data: {
      nom_marque: draft.name.trim(),
      ...(slug ? { slug } : {}),
      ...(year ? { date_creation: new Date(Date.UTC(year, 0, 1)) } : {}),
      wilaya_marque: draft.city,
      origin_lat: draft.cityLat,
      origin_lng: draft.cityLng,
      histoire_marque: draft.story,
      origin: draft.origin || null,
      engagement: draft.commitments,
      besoin: draft.needs.map((n) => n.label),
      sections: {
        needs: draft.needs,
        featuredProductIds: draft.featuredProductIds,
        featuredReviewIds: draft.featuredReviewIds,
      } as unknown as Prisma.InputJsonValue,
      page_status: 'LIVE',
    },
  });

  const identity = {
    couleur_principale: draft.bgColor,
    couleur_secondaire: draft.cardColor,
    couleur_titre: draft.accentColor,
    couleur_text: draft.textColor,
    logo_url: draft.logoUrl,
    banner_url: draft.coverUrl,
    // L'image n'a de sens qu'avec une couverture vidéo (une couverture image est sa propre image).
    banner_poster_url: isVideoUrl(draft.coverUrl) ? draft.coverImageUrl : null,
    audio_url: draft.audioUrl,
    title_font: draft.titleFont,
  };
  await tx.identity_marque.upsert({
    where: { id_marque: marqueId },
    update: identity,
    create: { id_identity: randomUUID(), id_marque: marqueId, ...identity },
  });

  // Visages : on remplace l'équipe publiée par celle du brouillon.
  const previous = await tx.marque_visage.findMany({ where: { id_marque: marqueId }, select: { id_visage: true } });
  await tx.marque_visage.deleteMany({ where: { id_marque: marqueId } });
  if (previous.length) {
    await tx.visage.deleteMany({ where: { id_visage: { in: previous.map((v) => v.id_visage) }, marque_visage: { none: {} } } });
  }
  for (const founder of draft.founders.filter((f) => f.name.trim())) {
    const id = randomUUID();
    await tx.visage.create({ data: { id_visage: id, ...splitName(founder.name), photo_url: founder.photoUrl ?? null } });
    await tx.marque_visage.create({ data: { id_marque: marqueId, id_visage: id, role: founder.role } });
  }

  return { slug: marque.slug };
}

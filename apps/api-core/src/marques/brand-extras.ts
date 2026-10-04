import type { BrandPageCandidates, BrandPageContent, BrandPageExtras } from '@withyou/shared-types';
import { selectBrandSections } from '@withyou/shared-utils';
import type { PrismaService } from '../prisma/prisma.service';

/** Avis proposés à la marque pour sa page (les plus récents). */
const REVIEW_CANDIDATES = 50;

/**
 * Tous les produits en ligne et les avis vérifiés récents d'une marque : ce parmi
 * quoi elle choisit ce que sa page affiche. L'aperçu de l'espace marque les reçoit
 * tels quels pour appliquer le brouillon en direct.
 */
export async function loadBrandCandidates(prisma: PrismaService, marqueId: string): Promise<BrandPageCandidates> {
  const [produits, avis, stats] = await Promise.all([
    prisma.produit.findMany({
      where: { id_marque: marqueId, status: 'ONLINE' },
      include: { produit_image: { orderBy: { ordre: 'asc' }, take: 1 } },
      orderBy: { created_at: 'desc' },
    }),
    prisma.avis.findMany({
      where: { id_marque: marqueId, verified: true },
      orderBy: { created_at: 'desc' },
      take: REVIEW_CANDIDATES,
    }),
    prisma.avis.aggregate({ where: { id_marque: marqueId, verified: true }, _avg: { stars: true }, _count: true }),
  ]);

  return {
    produits: produits.map((p) => ({
      id: p.id_product,
      nom: p.nom,
      prix: Number(p.prix),
      imageUrl: p.produit_image[0]?.url ?? null,
      // No AI adaptation-score pipeline exists yet.
      fitScore: null,
      needs: p.needs,
    })),
    avis: avis.map((a) => ({
      id: a.id_avis,
      auteur: a.auteur,
      stars: a.stars,
      texte: a.texte,
      createdAt: a.created_at.toISOString(),
    })),
    avisStats: stats._count ? { average: Number(stats._avg.stars ?? 0), count: stats._count } : null,
  };
}

/** Ce que la page publique affiche, d'après les choix publiés de la marque. */
export async function loadBrandExtras(
  prisma: PrismaService,
  marqueId: string,
  content: BrandPageContent,
): Promise<BrandPageExtras> {
  const candidates = await loadBrandCandidates(prisma, marqueId);
  return { ...selectBrandSections(content, candidates), avisStats: candidates.avisStats };
}

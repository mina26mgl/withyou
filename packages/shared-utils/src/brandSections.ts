/**
 * Applique les choix de la marque (besoins, produits et avis mis en avant) aux
 * produits en ligne et aux avis disponibles. Utilisé à l'identique par la page
 * publique (API) et par l'aperçu de l'espace marque (navigateur).
 *
 * Types structurels volontairement locaux : ce paquet ne dépend pas de shared-types.
 */

/** Avis affichés quand la marque n'en a choisi aucun. */
export const DEFAULT_REVIEWS_SHOWN = 3;

interface SectionProduct {
  id: string;
  imageUrl: string | null;
  needs: string[];
}
interface SectionReview {
  id: string;
  stars: number;
  createdAt: string;
}
interface SectionChoices {
  needs: { label: string; imageUrl: string | null }[];
  featuredProductIds: string[];
  featuredReviewIds: string[];
}

export function selectBrandSections<P extends SectionProduct, R extends SectionReview>(
  choices: Partial<SectionChoices>,
  candidates: { produits: P[]; avis: R[] },
): { produits: P[]; needs: { label: string; imageUrl: string | null; productCount: number }[]; avis: R[] } {
  const featuredProducts = choices.featuredProductIds ?? [];
  const featuredReviews = choices.featuredReviewIds ?? [];

  // Produits : ceux choisis, dans l'ordre choisi (un produit repassé hors ligne disparaît).
  const byId = new Map(candidates.produits.map((p) => [p.id, p]));
  const produits = featuredProducts.length
    ? featuredProducts.map((id) => byId.get(id)).filter((p): p is P => !!p)
    : candidates.produits;

  // Besoins : ceux choisis ; photo de la marque, sinon celle d'un produit qui y répond.
  const needs = (choices.needs ?? []).map((need) => {
    const matching = candidates.produits.filter((p) => p.needs.includes(need.label));
    return {
      label: need.label,
      imageUrl: need.imageUrl ?? matching.find((p) => p.imageUrl)?.imageUrl ?? null,
      productCount: matching.length,
    };
  });

  // Avis : ceux choisis, sinon les mieux notés puis les plus récents.
  const reviewById = new Map(candidates.avis.map((a) => [a.id, a]));
  const avis = featuredReviews.length
    ? featuredReviews.map((id) => reviewById.get(id)).filter((a): a is R => !!a)
    : [...candidates.avis]
        .sort((a, b) => b.stars - a.stars || b.createdAt.localeCompare(a.createdAt))
        .slice(0, DEFAULT_REVIEWS_SHOWN);

  return { produits, needs, avis };
}

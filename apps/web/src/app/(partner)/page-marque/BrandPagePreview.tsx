import type { BrandPageCandidates, BrandPageContent } from "@withyou/shared-types";
import { selectBrandSections } from "@withyou/shared-utils";
import MarqueView from "@/app/(consumer)/marque/[slug]/MarqueView";
import { PHONE_SCREEN_WIDTH } from "@/components/partner/PhonePreview";

/** Largeur réelle d'un téléphone pour laquelle la page cliente est dessinée. */
const PHONE_WIDTH = 390;

/**
 * Aperçu du brouillon : c'est la vraie page marque de l'app cliente (MarqueView),
 * rendue à la largeur d'un téléphone puis réduite pour tenir dans le cadre —
 * le rendu est donc identique à ce que verront les clientes.
 */
const NO_CANDIDATES: BrandPageCandidates = { produits: [], avis: [], avisStats: null };

export function BrandPagePreview({
  slug,
  content,
  candidates,
}: {
  slug: string;
  content: BrandPageContent;
  candidates?: BrandPageCandidates | null;
}) {
  // Même sélection que la page publique, appliquée au brouillon en direct.
  const available = candidates ?? NO_CANDIDATES;
  const sections = selectBrandSections(content, available);
  return (
    <div style={{ width: PHONE_WIDTH, zoom: PHONE_SCREEN_WIDTH / PHONE_WIDTH, minHeight: "100%" }}>
      <MarqueView
        slug={slug}
        preview
        data={{ slug, content: { ...content, name: content.name || "Votre marque" }, ...sections, avisStats: available.avisStats }}
      />
    </div>
  );
}

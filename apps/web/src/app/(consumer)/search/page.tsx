import type { Metadata } from "next";
import type { PublicProduct } from "@withyou/shared-types";
import Link from "next/link";
import { api } from "@/lib/api";
import SearchBar from "@/components/search/SearchBar";
import ProductGrid from "@/components/product/ProductGrid";
import SiteFooter from "@/components/layout/SiteFooter";
import BrandSlider from "@/components/brand/BrandSlider";
import SkinFilters, { findSkinFilter, matchesSkinFilter } from "@/components/search/SkinFilters";

export const metadata: Metadata = {
  title: "Recherche — WithYou",
};

/** Minuscules sans accents : « sérum » trouve « serum » et inversement. */
function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Tous les mots de la recherche doivent apparaître dans la fiche du produit. */
function matches(p: PublicProduct, q: string): boolean {
  const haystack = normalize(
    [p.nom, p.marque.nom, p.description, ...p.ingredients, ...p.needs, ...p.skinTypes].join(" "),
  );
  return normalize(q).split(/\s+/).filter(Boolean).every((word) => haystack.includes(word));
}

/** Produits affichés avant « Load more », puis ajoutés à chaque clic. */
const PAGE_SIZE = 20;

/** Recherche dans le catalogue client : uniquement les produits en ligne. */
async function searchProducts(q: string): Promise<PublicProduct[]> {
  const catalogue = await api.get<PublicProduct[]>("/produits", { cache: "no-store" });
  return catalogue.filter((p) => matches(p, q));
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; besoin?: string }>;
}) {
  const { q = "", besoin } = await searchParams;

  if (!q) {
    const filter = findSkinFilter(besoin);
    // Avec un filtre : les produits qui y répondent ; sinon tout le catalogue.
    const suggestions = await api
      .get<PublicProduct[]>("/produits", { cache: "no-store" })
      .then((list) => (filter ? list.filter((p) => matchesSkinFilter(p, filter)) : list))
      .catch(() => []);

    return (
      <div className="flex flex-col" style={{ minHeight: "100dvh" }}>
        {/* Barre de recherche en haut */}
        <div className="flex flex-col items-center px-4 pt-12 pb-6">
          <p
            className="font-bold mb-6 text-center"
            style={{ fontFamily: "var(--font-averia), serif", fontSize: "24px", color: "#07320D", letterSpacing: "-0.04em" }}
          >
            Chercher un produit
          </p>
          <SearchBar aiMode />
        </div>

        <SkinFilters active={filter?.id} />

        <h2
          className="px-4 mt-8 mb-4"
          style={{ fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: "22px", color: "#07320D" }}
        >
          Les marques du jour
        </h2>
        <BrandSlider shape="rounded" />

        {/* Produits du filtre choisi, ou quelques produits du catalogue */}
        {(filter || suggestions.length > 0) && (
          <>
            <h2
              className="px-4 pt-8 pb-4"
              style={{ fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: "22px", color: "#07320D" }}
            >
              {filter ? filter.label : "Tous les produits"}
            </h2>
            <ProductGrid key={filter?.id ?? "tous"} produits={suggestions} pageSize={PAGE_SIZE} />
          </>
        )}

        <SiteFooter />
      </div>
    );
  }

  const produits = await searchProducts(q);

  return (
    <div className="flex flex-col pb-28">

      {/* Header */}
      <div className="px-4 pt-12 pb-5">
        <Link
          href="/search"
          className="flex items-center gap-1 mb-5"
          style={{
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            fontSize: "14px",
            fontWeight: 400,
            color: "#4A6E4F",
            textDecoration: "none",
          }}
        >
          <svg
            width="16" height="16" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Retour
        </Link>

        <h1
          className="font-playfair font-bold"
          style={{
            fontSize: "26px",
            color: "#07320D",
            lineHeight: "1.1",
            letterSpacing: "-0.04em",
          }}
        >
          Produits pour{" "}
          <span style={{ fontStyle: "italic" }}>{q}</span>
        </h1>

        {produits.length > 0 && (
          <p
            className="mt-1"
            style={{
              fontFamily: "var(--font-inter), system-ui, sans-serif",
              fontSize: "13px",
              color: "#667085",
            }}
          >
            {produits.length} résultat{produits.length > 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Grille de produits */}
      <ProductGrid produits={produits} />
    </div>
  );
}
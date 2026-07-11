import type { Metadata } from "next";
import type { Produit } from "@withyou/shared-types";
import Link from "next/link";
import { PRODUCTS } from "@/lib/productsData";
import SearchBar from "@/components/search/SearchBar";
import ProductGrid from "@/components/product/ProductGrid";

export const metadata: Metadata = {
  title: "Recherche — WithYou",
};

type SearchResults = { produits: Produit[]; scores: Record<string, number> };

function getMockResults(): SearchResults {
  const produits: Produit[] = PRODUCTS.map((p) => ({
    id: String(p.id),
    partenaireId: "mock",
    nom: p.name,
    description: p.description,
    ingredients: p.ingredients ?? null,
    prix: Number(p.price),
    stock: 99,
    statut: "ACTIVE" as const,
    imagesUrls: [p.image],
    modeConservation: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  const scores: Record<string, number> = Object.fromEntries(
    PRODUCTS.map((p) => [String(p.id), p.fit / 100])
  );

  return { produits, scores };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;

  if (!q) {
    return (
      <div
        className="flex flex-col items-center justify-center px-4 pb-28"
        style={{ minHeight: "100dvh" }}
      >
        <p
          className="font-playfair font-bold mb-8 text-center"
          style={{ fontSize: "24px", color: "#07320D", letterSpacing: "-0.04em" }}
        >
          Que recherchez-vous ?
        </p>
        <SearchBar aiMode />
      </div>
    );
  }

  const { produits, scores } = getMockResults();

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
      <ProductGrid produits={produits} scores={scores} />
    </div>
  );
}
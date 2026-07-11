import type { Produit } from "@withyou/shared-types";
import ProductCard from "./ProductCard";

export default function ProductGrid({
  produits,
  scores,
}: {
  produits: Produit[];
  scores?: Record<string, number>;
}) {
  if (produits.length === 0) {
    return (
      <p
        className="px-4 py-8 text-center text-sm"
        style={{ color: "#667085", fontFamily: "var(--font-inter), system-ui, sans-serif" }}
      >
        Aucun produit trouvé.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 px-4" style={{ gap: "12px" }}>
      {produits.map((produit) => (
        <ProductCard
          key={produit.id}
          produit={produit}
          score={scores?.[produit.id]}
        />
      ))}
    </div>
  );
}
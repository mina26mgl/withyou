"use client";
import { useState } from "react";
import type { PublicProduct } from "@withyou/shared-types";
import { useOnboardingStep } from "@/lib/onboarding";
import { fitScore } from "@/lib/routine";
import ProductCard from "./ProductCard";

/** Grille de produits ; avec pageSize, n'en montre que pageSize puis « Load more » en ajoute autant. */
export default function ProductGrid({ produits, pageSize }: { produits: PublicProduct[]; pageSize?: number }) {
  // Profil lu une fois pour toute la grille : le « % Fit » de chaque carte en découle.
  const { saved: profile } = useOnboardingStep();
  const [visible, setVisible] = useState(pageSize ?? produits.length);
  const shown = pageSize ? produits.slice(0, visible) : produits;

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
    <>
      <div className="grid grid-cols-2 px-4" style={{ gap: "12px" }}>
        {shown.map((produit) => (
          <ProductCard key={produit.id} produit={produit} fit={fitScore(produit, profile)} />
        ))}
      </div>
      {shown.length < produits.length && pageSize && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
          <button
            type="button"
            onClick={() => setVisible((v) => v + pageSize)}
            style={{
              fontFamily: "var(--font-playfair)",
              fontSize: 15,
              fontWeight: 600,
              color: "#07320D",
              background: "#FFFFFF",
              border: "1px solid #D5D7DA",
              borderRadius: 12,
              padding: "8px 14px",
              cursor: "pointer",
              boxShadow: "0px 1px 2px 0px rgba(16,24,40,0.05), 0px -2px 0px 0px rgba(16,24,40,0.05) inset",
            }}
          >
            Load more
          </button>
        </div>
      )}
    </>
  );
}

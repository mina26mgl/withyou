"use client";
import { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { getProductById } from "@/lib/productsData";
import BottomNav from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Star, ShoppingBag } from "lucide-react";
import PanierPage from "../../panier/page";
const TABS = ["Pour qui c'est", "Aperçu", "Ingrédients", "Avis"] as const;
type Tab = (typeof TABS)[number];

function AzulImage({ src }: { src: string }) {
  return (
    <div
      style={{
        position: "relative",
        width: 40,
        height: 40,
        borderRadius: 12,
        overflow: "hidden",
        border: "0.2px solid rgba(0,0,0,0.1)",
        filter:
          "drop-shadow(0.11px 0.11px 0.34px rgba(0,0,0,0.04)) drop-shadow(0.45px 0.45px 0.68px rgba(0,0,0,0.03)) drop-shadow(1.01px 1.01px 0.9px rgba(0,0,0,0.02))",
        flexShrink: 0,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
      <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(255,255,255,0.3)", pointerEvents: "none" }} />
    </div>
  );
}

export default function ProduitPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("Pour qui c'est");
  const [showConfirmation, setShowConfirmation] = useState(false);

  const pourQuiRef = useRef<HTMLDivElement>(null);
  const apercuRef = useRef<HTMLDivElement>(null);
  const ingredientsRef = useRef<HTMLDivElement>(null);
  const avisRef = useRef<HTMLDivElement>(null);

  const product = getProductById(id);

  const scrollToSection = (tab: Tab) => {
    setActiveTab(tab);
    const map: Record<Tab, React.RefObject<HTMLDivElement | null>> = {
      "Pour qui c'est": pourQuiRef,
      "Aperçu": apercuRef,
      "Ingrédients": ingredientsRef,
      "Avis": avisRef,
    };
    map[tab].current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p style={{ fontFamily: "Inter, sans-serif", color: "#667085" }}>Produit introuvable.</p>
        <button
          onClick={() => router.back()}
          style={{ fontFamily: "Inter, sans-serif", color: "#07320D", fontWeight: 600 }}
        >
          ← Retour
        </button>
      </div>
    );
  }

  return (
    <div
      className="relative w-full max-w-[430px] mx-auto bg-[#FCFFFD] flex flex-col"
      style={{ height: "100dvh" }}
    >
      <div
        className="flex-1 overflow-y-auto"
        style={{ scrollbarWidth: "none", paddingBottom: 80 } as React.CSSProperties}
      >
        {/* Header retour */}
        <div style={{ padding: "20px 16px 0 16px", display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => router.back()}
            style={{
              background: "transparent",
              border: "none",
              padding: 0,
              display: "flex",
              alignItems: "center",
              cursor: "pointer",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8L10 4" stroke="#07320D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 500, color: "#07320D" }}>
            Retour
          </span>
        </div>

        {/* Card supérieure */}
        <div
          style={{
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: 24,
            padding: 12,
            margin: "16px 16px 0 16px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {/* Marque + cachet */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {product.brandLogo && (
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    overflow: "hidden",
                    border: "0.5px solid rgba(0,0,0,0.08)",
                    flexShrink: 0,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={product.brandLogo}
                    alt={product.brand}
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  />
                </div>
              )}
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 400, color: "#07320D" }}>
                {product.brand}
              </span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/cachet.png"
              alt=""
              style={{
                width: 28,
                height: 28,
                filter:
                  "drop-shadow(0.77px 0.77px 1.54px rgba(0,0,0,0.19)) drop-shadow(2.31px 2.31px 3.08px rgba(0,0,0,0.17))",
              }}
            />
          </div>

          {/* Nom */}
          <h1
            style={{
              fontFamily: "var(--font-playfair)",
              fontSize: 20,
              fontWeight: 600,
              color: "rgba(7,50,13,1)",
              margin: 0,
              lineHeight: "26px",
            }}
          >
            {product.name}
          </h1>

          {/* Image principale */}
          <div
            style={{
              borderRadius: 24,
              overflow: "hidden",
              height: 300,
              border: "2.82px solid rgba(0,0,0,0.1)",
              position: "relative",
              boxShadow: "1px 1px 3px 1px rgba(0,0,0,0.04), 4px 4px 6px 0px rgba(0,0,0,0.03)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.image}
              alt={product.name}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
            <div
              className="absolute pointer-events-none"
              style={{
                top: 3,
                left: "2.22px",
                right: "2.22px",
                bottom: 0,
                borderRadius: 20,
                borderTop: "1.5px solid #FFFFFF",
                borderRight: "1.5px solid #FFFFFF",
                borderBottom: "none",
                borderLeft: "1.5px solid #FFFFFF",
              }}
            />
          </div>

          {/* Vignettes */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.image}
              alt=""
              style={{ width: 40, height: 40, borderRadius: 12, border: "0.2px solid rgba(0,0,0,0.1)", objectFit: "contain", flexShrink: 0 }}
            />
            <AzulImage src="/azul1.png" />
            <AzulImage src="/azul2.png" />
            <AzulImage src="/azul3.png" />
            <AzulImage src="/azul4.png" />
            <AzulImage src="/azul5.png" />
          </div>
        </div>

        {/* Tab bar — sticky */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            backgroundColor: "#FCFFFD",
            padding: "12px 16px 8px 16px",
          }}
        >
          <div
            style={{
              height: 36,
              borderRadius: 8,
              border: "1px solid rgba(234,236,240,1)",
              background: "rgba(249,250,251,1)",
              padding: 4,
              display: "flex",
              gap: 4,
              boxSizing: "border-box",
            }}
          >
            {TABS.map((tab) => {
              const active = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => scrollToSection(tab)}
                  style={{
                    flex: 1,
                    height: 28,
                    borderRadius: 6,
                    border: active ? "0.5px solid rgba(208,213,221,1)" : "none",
                    padding: "4px 6px",
                    background: active ? "rgba(255,255,255,1)" : "transparent",
                    boxShadow: active
                      ? "0px 1px 2px 0px rgba(16,24,40,0.06), 0px 1px 3px 0px rgba(16,24,40,0.1)"
                      : "none",
                    fontFamily: "Inter, sans-serif",
                    fontSize: 11,
                    fontWeight: active ? 600 : 400,
                    color: active ? "#101828" : "#667085",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {tab}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section: Pour qui c'est */}
        <div ref={pourQuiRef} style={{ scrollMarginTop: 56, position: "relative", padding: "16px 16px 16px 16px", border: "1px solid rgba(0, 0, 0, 0.08)", borderRadius: 24 }}>

          <h2 style={{ fontFamily: "var(--font-playfair)", fontSize: 14, fontWeight: 600, color: "#101828", margin: "0 0 8px 0" }}>
            Pour qui c&apos;est
          </h2>
          <div className="absolute pointer-events-none" style={{ right: 20, bottom: 320, width: 33, height: 55, transform: "rotate(240.0deg)", transformOrigin: "center center" }}>
            <img src="/rose.png" alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 400, color: "#667085", lineHeight: "20px", margin: 0 }}>
            For skin that gets oily by midday but still feels tight around the cheeks.
          </p>
          <div style={{ display: "flex", alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
            <div style={{ gap: 8, borderRadius: 24, border: "1px solid rgba(0,0,0,0.08)", height: 119, width: 105.66666412353516, padding: 12 }}>
              <p
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 14,
                  fontWeight: 400,
                  color: "rgba(3, 26, 6, 1)",
                  lineHeight: "20px",
                  margin: 0,
                  // AJOUTS POUR L'ELLIPSIS :
                  whiteSpace: "nowrap",      // Empêche le texte de s'écrire sur plusieurs lignes
                  overflow: "hidden",        // Cache le texte qui dépasse de la div de 105px
                  textOverflow: "ellipsis",  // Ajoute les fameux "..." à la fin
                  width: "100%",             // Force le paragraphe à prendre la largeur de son parent
                }}
              >
                Sensitive Skin
              </p>
              <img
                src="/sensetiv.png"
                alt=""
                style={{ width: 81.67, height: 70, borderRadius: 12, border: "0.2px solid rgba(0,0,0,0.1)", objectFit: "contain", flexShrink: 0, backgroundColor: "rgba(246, 250, 247, 1)", boxShadow: "1px 1px 3px 0px rgba(0, 0, 0, 0.04), 4px 4px 6px 0px rgba(0, 0, 0, 0.03),9px 9px 8px 0px rgba(0, 0, 0, 0.02),16px 17px 9px 0px rgba(0, 0, 0, 0.01),24px 26px 10px 0px rgba(0, 0, 0, 0)" }}
              />
            </div>
            <div style={{ gap: 8, borderRadius: 24, border: "1px solid rgba(0,0,0,0.08)", height: 119, width: 105.66666412353516, padding: 12 }}>
              <p
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 14,
                  fontWeight: 400,
                  color: "rgba(3, 26, 6, 1)",
                  lineHeight: "20px",
                  margin: 0,
                  // AJOUTS POUR L'ELLIPSIS :
                  whiteSpace: "nowrap",      // Empêche le texte de s'écrire sur plusieurs lignes
                  overflow: "hidden",        // Cache le texte qui dépasse de la div de 105px
                  textOverflow: "ellipsis",  // Ajoute les fameux "..." à la fin
                  width: "100%",             // Force le paragraphe à prendre la largeur de son parent
                }}
              >
                Oily Skin
              </p>
              <img
                src="/oily-skin.png"
                alt=""
                style={{ width: 81.67, height: 70, borderRadius: 12, border: "0.2px solid rgba(0,0,0,0.1)", objectFit: "contain", flexShrink: 0, backgroundColor: "rgba(246, 250, 247, 1)", boxShadow: "1px 1px 3px 0px rgba(0, 0, 0, 0.04), 4px 4px 6px 0px rgba(0, 0, 0, 0.03),9px 9px 8px 0px rgba(0, 0, 0, 0.02),16px 17px 9px 0px rgba(0, 0, 0, 0.01),24px 26px 10px 0px rgba(0, 0, 0, 0)" }}
              />
            </div>
            <div style={{ gap: 8, borderRadius: 24, border: "1px solid rgba(0,0,0,0.08)", height: 119, width: 105.66666412353516, padding: 12 }}>
              <p
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 14,
                  fontWeight: 400,
                  color: "rgba(3, 26, 6, 1)",
                  lineHeight: "20px",
                  margin: 0,
                  // AJOUTS POUR L'ELLIPSIS :
                  whiteSpace: "nowrap",      // Empêche le texte de s'écrire sur plusieurs lignes
                  overflow: "hidden",        // Cache le texte qui dépasse de la div de 105px
                  textOverflow: "ellipsis",  // Ajoute les fameux "..." à la fin
                  width: "100%",             // Force le paragraphe à prendre la largeur de son parent
                }}
              >
                Acne-Prone Skin
              </p>
              <img
                src="/acne-skin.png"
                alt=""
                style={{ width: 81.67, height: 70, borderRadius: 12, border: "0.2px solid rgba(0,0,0,0.1)", objectFit: "contain", flexShrink: 0, backgroundColor: "rgba(246, 250, 247, 1)", boxShadow: "1px 1px 3px 0px rgba(0, 0, 0, 0.04), 4px 4px 6px 0px rgba(0, 0, 0, 0.03),9px 9px 8px 0px rgba(0, 0, 0, 0.02),16px 17px 9px 0px rgba(0, 0, 0, 0.01),24px 26px 10px 0px rgba(0, 0, 0, 0)" }}
              />
            </div>
            <div style={{ gap: 8, borderRadius: 24, border: "1px solid rgba(0,0,0,0.08)", height: 119, width: 105.66666412353516, padding: 12 }}>
              <p
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 14,
                  fontWeight: 400,
                  color: "rgba(3, 26, 6, 1)",
                  lineHeight: "20px",
                  margin: 0,
                  // AJOUTS POUR L'ELLIPSIS :
                  whiteSpace: "nowrap",      // Empêche le texte de s'écrire sur plusieurs lignes
                  overflow: "hidden",        // Cache le texte qui dépasse de la div de 105px
                  textOverflow: "ellipsis",  // Ajoute les fameux "..." à la fin
                  width: "100%",             // Force le paragraphe à prendre la largeur de son parent
                }}
              >
                Mixed Skin
              </p>
              <img
                src="/mixte.png"
                alt=""
                style={{ width: 81.67, height: 70, borderRadius: 12, border: "0.2px solid rgba(0,0,0,0.1)", objectFit: "contain", flexShrink: 0, backgroundColor: "rgba(246, 250, 247, 1)", boxShadow: "1px 1px 3px 0px rgba(0, 0, 0, 0.04), 4px 4px 6px 0px rgba(0, 0, 0, 0.03),9px 9px 8px 0px rgba(0, 0, 0, 0.02),16px 17px 9px 0px rgba(0, 0, 0, 0.01),24px 26px 10px 0px rgba(0, 0, 0, 0)" }}
              />
            </div>
          </div>
        </div>

        {/* Section: Aperçu */}
        <div ref={apercuRef} style={{ scrollMarginTop: 56, marginTop: 12, padding: "16px 16px 16px 16px", border: "1px solid rgba(0, 0, 0, 0.08)", borderRadius: 24 }}>
          <h2 style={{ fontFamily: "var(--font-playfair)", fontSize: 14, fontWeight: 600, color: "#101828", margin: "0 0 12px 0" }}>
            Aperçu
          </h2>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 400, color: "#667085", lineHeight: "20px", margin: 0 }}>
            {product.description}
          </p>

        </div>

        {/* Section: Ingrédients */}
        <div ref={ingredientsRef} style={{ scrollMarginTop: 56, marginTop: 12, padding: "16px 16px 16px 16px", border: "1px solid rgba(0, 0, 0, 0.08)", borderRadius: 24 }}>
          <h2 style={{ fontFamily: "var(--font-playfair)", fontSize: 14, fontWeight: 600, color: "#101828", margin: "0 0 8px 0" }}>
            Ingrédients
          </h2>
          <div style={{ display: "flex", alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
            <div style={{ gap: 8, borderRadius: 24, border: "1px solid rgba(0,0,0,0.08)", height: 119, width: 105.66666412353516, padding: 12 }}>
              <p
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 14,
                  fontWeight: 400,
                  color: "rgba(3, 26, 6, 1)",
                  lineHeight: "20px",
                  margin: 0,
                  // AJOUTS POUR L'ELLIPSIS :
                  whiteSpace: "nowrap",      // Empêche le texte de s'écrire sur plusieurs lignes
                  overflow: "hidden",        // Cache le texte qui dépasse de la div de 105px
                  textOverflow: "ellipsis",  // Ajoute les fameux "..." à la fin
                  width: "100%",             // Force le paragraphe à prendre la largeur de son parent
                }}
              >
                Miel
              </p>
              <img
                src="/honey.png"
                alt=""
                style={{ width: 81.67, height: 70, borderRadius: 12, border: "0.2px solid rgba(0,0,0,0.1)", objectFit: "contain", flexShrink: 0, backgroundColor: "rgba(246, 250, 247, 1)", boxShadow: "1px 1px 3px 0px rgba(0, 0, 0, 0.04), 4px 4px 6px 0px rgba(0, 0, 0, 0.03),9px 9px 8px 0px rgba(0, 0, 0, 0.02),16px 17px 9px 0px rgba(0, 0, 0, 0.01),24px 26px 10px 0px rgba(0, 0, 0, 0)" }}
              />
            </div>
            <div style={{ gap: 8, borderRadius: 24, border: "1px solid rgba(0,0,0,0.08)", height: 119, width: 105.66666412353516, padding: 12 }}>
              <p
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 14,
                  fontWeight: 400,
                  color: "rgba(3, 26, 6, 1)",
                  lineHeight: "20px",
                  margin: 0,
                  // AJOUTS POUR L'ELLIPSIS :
                  whiteSpace: "nowrap",      // Empêche le texte de s'écrire sur plusieurs lignes
                  overflow: "hidden",        // Cache le texte qui dépasse de la div de 105px
                  textOverflow: "ellipsis",  // Ajoute les fameux "..." à la fin
                  width: "100%",             // Force le paragraphe à prendre la largeur de son parent
                }}
              >
                Acide glycolic
              </p>
              <img
                src="/glycolic.png"
                alt=""
                style={{ width: 81.67, height: 70, borderRadius: 12, border: "0.2px solid rgba(0,0,0,0.1)", objectFit: "contain", flexShrink: 0, backgroundColor: "rgba(246, 250, 247, 1)", boxShadow: "1px 1px 3px 0px rgba(0, 0, 0, 0.04), 4px 4px 6px 0px rgba(0, 0, 0, 0.03),9px 9px 8px 0px rgba(0, 0, 0, 0.02),16px 17px 9px 0px rgba(0, 0, 0, 0.01),24px 26px 10px 0px rgba(0, 0, 0, 0)" }}
              />
            </div>
            <div style={{ gap: 8, borderRadius: 24, border: "1px solid rgba(0,0,0,0.08)", height: 119, width: 105.66666412353516, padding: 12 }}>
              <p
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 14,
                  fontWeight: 400,
                  color: "rgba(3, 26, 6, 1)",
                  lineHeight: "20px",
                  margin: 0,
                  // AJOUTS POUR L'ELLIPSIS :
                  whiteSpace: "nowrap",      // Empêche le texte de s'écrire sur plusieurs lignes
                  overflow: "hidden",        // Cache le texte qui dépasse de la div de 105px
                  textOverflow: "ellipsis",  // Ajoute les fameux "..." à la fin
                  width: "100%",             // Force le paragraphe à prendre la largeur de son parent
                }}
              >
                Aloe Vera
              </p>
              <img
                src="/aloevera.png"
                alt=""
                style={{ width: 81.67, height: 70, borderRadius: 12, border: "0.2px solid rgba(0,0,0,0.1)", objectFit: "contain", flexShrink: 0, backgroundColor: "rgba(246, 250, 247, 1)", boxShadow: "1px 1px 3px 0px rgba(0, 0, 0, 0.04), 4px 4px 6px 0px rgba(0, 0, 0, 0.03),9px 9px 8px 0px rgba(0, 0, 0, 0.02),16px 17px 9px 0px rgba(0, 0, 0, 0.01),24px 26px 10px 0px rgba(0, 0, 0, 0)" }}
              />
            </div>
            <div style={{ gap: 8, borderRadius: 24, border: "1px solid rgba(0,0,0,0.08)", height: 119, width: 105.66666412353516, padding: 12 }}>
              <p
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 14,
                  fontWeight: 400,
                  color: "rgba(3, 26, 6, 1)",
                  lineHeight: "20px",
                  margin: 0,
                  // AJOUTS POUR L'ELLIPSIS :
                  whiteSpace: "nowrap",      // Empêche le texte de s'écrire sur plusieurs lignes
                  overflow: "hidden",        // Cache le texte qui dépasse de la div de 105px
                  textOverflow: "ellipsis",  // Ajoute les fameux "..." à la fin
                  width: "100%",             // Force le paragraphe à prendre la largeur de son parent
                }}
              >
                Lavender
              </p>
              <img
                src="/lavendre.png"
                alt=""
                style={{ width: 81.67, height: 70, borderRadius: 12, border: "0.2px solid rgba(0,0,0,0.1)", objectFit: "contain", flexShrink: 0, backgroundColor: "rgba(246, 250, 247, 1)", boxShadow: "1px 1px 3px 0px rgba(0, 0, 0, 0.04), 4px 4px 6px 0px rgba(0, 0, 0, 0.03),9px 9px 8px 0px rgba(0, 0, 0, 0.02),16px 17px 9px 0px rgba(0, 0, 0, 0.01),24px 26px 10px 0px rgba(0, 0, 0, 0)" }}
              />
            </div>
            <div style={{ gap: 8, borderRadius: 24, border: "1px solid rgba(0,0,0,0.08)", height: 119, width: 105.66666412353516, padding: 12 }}>
              <p
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 14,
                  fontWeight: 400,
                  color: "rgba(3, 26, 6, 1)",
                  lineHeight: "20px",
                  margin: 0,
                  // AJOUTS POUR L'ELLIPSIS :
                  whiteSpace: "nowrap",      // Empêche le texte de s'écrire sur plusieurs lignes
                  overflow: "hidden",        // Cache le texte qui dépasse de la div de 105px
                  textOverflow: "ellipsis",  // Ajoute les fameux "..." à la fin
                  width: "100%",             // Force le paragraphe à prendre la largeur de son parent
                }}
              >
                Grain de café
              </p>
              <img
                src="/coffee.png"
                alt=""
                style={{ width: 81.67, height: 70, borderRadius: 12, border: "0.2px solid rgba(0,0,0,0.1)", objectFit: "contain", flexShrink: 0, backgroundColor: "rgba(246, 250, 247, 1)", boxShadow: "1px 1px 3px 0px rgba(0, 0, 0, 0.04), 4px 4px 6px 0px rgba(0, 0, 0, 0.03),9px 9px 8px 0px rgba(0, 0, 0, 0.02),16px 17px 9px 0px rgba(0, 0, 0, 0.01),24px 26px 10px 0px rgba(0, 0, 0, 0)" }}
              />
            </div>
            <div style={{ gap: 8, borderRadius: 24, border: "1px solid rgba(0,0,0,0.08)", height: 119, width: 105.66666412353516, padding: 12 }}>
              <p
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 14,
                  fontWeight: 400,
                  color: "rgba(3, 26, 6, 1)",
                  lineHeight: "20px",
                  margin: 0,
                  // AJOUTS POUR L'ELLIPSIS :
                  whiteSpace: "nowrap",      // Empêche le texte de s'écrire sur plusieurs lignes
                  overflow: "hidden",        // Cache le texte qui dépasse de la div de 105px
                  textOverflow: "ellipsis",  // Ajoute les fameux "..." à la fin
                  width: "100%",             // Force le paragraphe à prendre la largeur de son parent
                }}
              >
                Prickly seed
              </p>
              <img
                src="/prickly.png"
                alt=""
                style={{ width: 81.67, height: 70, borderRadius: 12, border: "0.2px solid rgba(0,0,0,0.1)", objectFit: "contain", flexShrink: 0, backgroundColor: "rgba(246, 250, 247, 1)", boxShadow: "1px 1px 3px 0px rgba(0, 0, 0, 0.04), 4px 4px 6px 0px rgba(0, 0, 0, 0.03),9px 9px 8px 0px rgba(0, 0, 0, 0.02),16px 17px 9px 0px rgba(0, 0, 0, 0.01),24px 26px 10px 0px rgba(0, 0, 0, 0)" }}
              />
            </div>
            <div style={{ gap: 8, borderRadius: 24, border: "1px solid rgba(0,0,0,0.08)", height: 119, width: 105.66666412353516, padding: 12 }}>
              <p
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 14,
                  fontWeight: 400,
                  color: "rgba(3, 26, 6, 1)",
                  lineHeight: "20px",
                  margin: 0,
                  // AJOUTS POUR L'ELLIPSIS :
                  whiteSpace: "nowrap",      // Empêche le texte de s'écrire sur plusieurs lignes
                  overflow: "hidden",        // Cache le texte qui dépasse de la div de 105px
                  textOverflow: "ellipsis",  // Ajoute les fameux "..." à la fin
                  width: "100%",             // Force le paragraphe à prendre la largeur de son parent
                }}
              >
                Huile d'olive
              </p>
              <img
                src="/huileolive.png"
                alt=""
                style={{ width: 81.67, height: 70, borderRadius: 12, border: "0.2px solid rgba(0,0,0,0.1)", objectFit: "contain", flexShrink: 0, backgroundColor: "rgba(246, 250, 247, 1)", boxShadow: "1px 1px 3px 0px rgba(0, 0, 0, 0.04), 4px 4px 6px 0px rgba(0, 0, 0, 0.03),9px 9px 8px 0px rgba(0, 0, 0, 0.02),16px 17px 9px 0px rgba(0, 0, 0, 0.01),24px 26px 10px 0px rgba(0, 0, 0, 0)" }}
              />
            </div>
            <div style={{ gap: 8, borderRadius: 24, border: "1px solid rgba(0,0,0,0.08)", height: 119, width: 105.66666412353516, padding: 12 }}>
              <p
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 14,
                  fontWeight: 400,
                  color: "rgba(3, 26, 6, 1)",
                  lineHeight: "20px",
                  margin: 0,
                  // AJOUTS POUR L'ELLIPSIS :
                  whiteSpace: "nowrap",      // Empêche le texte de s'écrire sur plusieurs lignes
                  overflow: "hidden",        // Cache le texte qui dépasse de la div de 105px
                  textOverflow: "ellipsis",  // Ajoute les fameux "..." à la fin
                  width: "100%",             // Force le paragraphe à prendre la largeur de son parent
                }}
              >
                Jasmine
              </p>
              <img
                src="/jasmine.png"
                alt=""
                style={{ width: 81.67, height: 70, borderRadius: 12, border: "0.2px solid rgba(0,0,0,0.1)", objectFit: "contain", flexShrink: 0, backgroundColor: "rgba(246, 250, 247, 1)", boxShadow: "1px 1px 3px 0px rgba(0, 0, 0, 0.04), 4px 4px 6px 0px rgba(0, 0, 0, 0.03),9px 9px 8px 0px rgba(0, 0, 0, 0.02),16px 17px 9px 0px rgba(0, 0, 0, 0.01),24px 26px 10px 0px rgba(0, 0, 0, 0)" }}
              />
            </div>
          </div>
        </div>

        {/* Section: Avis */}
        <div ref={avisRef} style={{ scrollMarginTop: 56, marginTop: 12, padding: "16px", border: "1px solid rgba(0, 0, 0, 0.08)", borderRadius: 24 }}>
          <h2 style={{ fontFamily: "var(--font-playfair)", fontSize: 14, fontWeight: 600, color: "#101828", margin: "0 0 8px 0" }}>
            Avis
          </h2>

          <div style={{ display: "flex", flexDirection: "column", marginTop: 12, padding: "16px", border: "1px solid rgba(0, 0, 0, 0.08)", borderRadius: 24 }}>

            {/* CONTENEUR PRINCIPAL EN LIGNE (Avatar à gauche, tout le reste à droite) */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>

              {/* 1. L'Avatar à gauche */}
              <div style={{ width: 72, height: 72, borderRadius: "12px", overflow: "hidden", border: "1.07px solid rgba(255, 255, 255, 1)", flexShrink: 0 }}>
                <img src="/Avatar.png" alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>

              {/* 2. Tout le bloc de droite (Nom + Étoiles ET Commentaire) */}
              <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, gap: 6 }}>

                {/* Ligne du haut : Nom + Étoiles */}
                <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: "#101828", margin: 0 }}>
                    Asma Khe
                  </p>
                  <div style={{ display: "flex", gap: 4 }}>
                    <Star className="w-4 h-4 fill-[#4CA30D] stroke-[#4CA30D]" />
                    <Star className="w-4 h-4 fill-[#4CA30D] stroke-[#4CA30D]" />
                    <Star className="w-4 h-4 fill-[#4CA30D] stroke-[#4CA30D]" />
                    <Star className="w-4 h-4 fill-[#4CA30D] stroke-[#4CA30D]" />
                    <Star className="w-4 h-4 stroke-[#4CA30D]" />
                  </div>
                </div>

                {/* Le commentaire est maintenant ici, juste en dessous du nom, mais TOUJOURS à côté de l'avatar */}
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 400, color: "rgba(77, 101, 81, 1)", lineHeight: "20px", margin: 0 }}>
                  J&apos;ai adoré ce produit ! Il a vraiment amélioré l&apos;aspect de ma peau et je le recommande vivement.
                </p>

              </div>

            </div>

          </div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 12, padding: "16px", border: "1px solid rgba(0, 0, 0, 0.08)", borderRadius: 24 }}>

            {/* CONTENEUR PRINCIPAL EN LIGNE (Avatar à gauche, tout le reste à droite) */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>

              {/* 1. L'Avatar à gauche */}
              <div style={{ width: 72, height: 72, borderRadius: "12px", overflow: "hidden", border: "1.07px solid rgba(255, 255, 255, 1)", flexShrink: 0 }}>
                <img src="/Avatar.png" alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>

              {/* 2. Tout le bloc de droite (Nom + Étoiles ET Commentaire) */}
              <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, gap: 6 }}>

                {/* Ligne du haut : Nom + Étoiles */}
                <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: "#101828", margin: 0 }}>
                    Asma Khe
                  </p>
                  <div style={{ display: "flex", gap: 4 }}>
                    <Star className="w-4 h-4 fill-[#4CA30D] stroke-[#4CA30D]" />
                    <Star className="w-4 h-4 fill-[#4CA30D] stroke-[#4CA30D]" />
                    <Star className="w-4 h-4 fill-[#4CA30D] stroke-[#4CA30D]" />
                    <Star className="w-4 h-4 fill-[#4CA30D] stroke-[#4CA30D]" />
                    <Star className="w-4 h-4 stroke-[#4CA30D]" />
                  </div>
                </div>

                {/* Le commentaire est maintenant ici, juste en dessous du nom, mais TOUJOURS à côté de l'avatar */}
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 400, color: "rgba(77, 101, 81, 1)", lineHeight: "20px", margin: 0 }}>
                  J&apos;ai adoré ce produit ! Il a vraiment amélioré l&apos;aspect de ma peau et je le recommande vivement.
                </p>

              </div>

            </div>

          </div>
        </div>

        {/* CTA */}
        {/* CONTENEUR PRINCIPAL : Changé en flexDirection "row" et aligné verticalement au centre */}
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 12, border: "1px solid rgba(0, 0, 0, 0.08)", borderRadius: 24, padding: "16px" }}>

          {/* BLOC PRIX : Supprimé le marginTop inutile et flexShrink pour bloquer sa taille */}
          <div style={{ flexShrink: 0, borderRadius: 16, border: "0.5px solid #00000014", padding: "8px 16px" }}>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, fontWeight: 400, color: "#101828", margin: 0, whiteSpace: "nowrap" }}>
              2800 Dzd
            </p>
          </div>
          <button
            onClick={() => setShowConfirmation(true)}
            style={{
              flexGrow: 1,
              height: 48,
              borderRadius: 16,
              border: "2px solid rgba(255,255,255,0.12)",
              background: "rgba(7,50,13,1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              cursor: "pointer",
              fontFamily: "Inter, sans-serif",
              fontWeight: 600,
              fontSize: 15,
              color: "#FFFFFF",
              letterSpacing: "-0.03em",
              boxShadow:
                "0px 1px 2px 0px rgba(16,24,40,0.05), 0px -2px 0px 0px rgba(16,24,40,0.05) inset, 0px 0px 0px 1px rgba(16,24,40,0.18) inset",
            }}
          >
            <ShoppingBag />
            Ajouter à ma trousse
          </button>



        </div>
      </div>

      <BottomNav />

      {/* Overlay confirmation ajout trousse */}
      {showConfirmation && (
        <div
          className="absolute inset-0 z-[100] flex flex-col overflow-hidden"
          style={{
            background: "rgba(255, 255, 255, 0.40)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          {/* Close button at top right */}
          <button
            onClick={() => setShowConfirmation(false)}
            style={{
              position: "absolute",
              top: 24,
              right: 24,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              zIndex: 110,
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6L18 18" stroke="#031A06" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Butterfly video in background/middle */}
          <div
            className="absolute top-[68%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-[393px] pointer-events-none"
            style={{
              maskImage: "radial-gradient(circle, black 0%, transparent 70%)",
              WebkitMaskImage: "radial-gradient(circle, black 0%, transparent 70%)",
              opacity: 1.0,
              zIndex: 5,
            }}
          >
            <video
              src="/papillon.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-contain"
            />
          </div>

          <div className="flex-1 flex flex-col items-center justify-center px-6">
            {/* Text centered in the middle of the screen, slightly lower */}
            <div className="text-center z-10" style={{ transform: "translateY(120px)" }}>
              <h2
                style={{
                  fontFamily: "var(--font-playfair)",
                  fontSize: 36,
                  fontWeight: 700,
                  color: "#031A06",
                  margin: 0,
                  lineHeight: "1.1",
                }}
              >
                Bonne trouvaille !
              </h2>
              <p
                style={{
                  fontFamily: "var(--font-playfair)",
                  fontSize: 30,
                  fontWeight: 400,
                  color: "#031A06",
                  marginTop: 4,
                  lineHeight: "1.1",
                }}
              >
                C&apos;est ajouté à votre sac
              </p>
            </div>
          </div>

          {/* Assets section (Flowers) above the button */}
          <div className="relative w-full h-[250px] pointer-events-none overflow-hidden mt-auto z-10">
            <img
              src="/background.png"
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "bottom",
                transform: "scale(3) translateY(30px)",
                transformOrigin: "bottom center",
              }}
            />
          </div>

          {/* Bottom Button Area with Gradient */}
          <div
            className="w-full px-6 pb-12 z-20 pt-28"
            style={{
              background: "linear-gradient(360deg, #FFFFFF 55%, rgba(255, 255, 255, 0) 100%)",
              marginTop: "-130px"
            }}
          >
            <button
              onClick={() => setShowConfirmation(false)}
              style={{
                width: "100%",
                height: 52,
                borderRadius: 20,
                background: "rgba(7,50,13,1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                cursor: "pointer",
                fontFamily: "Inter, sans-serif",
                fontWeight: 600,
                fontSize: 16,
                color: "#FFFFFF",
                border: "none",
                boxShadow: "0px 1px 2px rgba(16, 24, 40, 0.05)",
              }}
            >
              <span>Continuer</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 12L10 8L6 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

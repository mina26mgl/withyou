"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { PublicProduct } from "@withyou/shared-types";
import { api } from "@/lib/api";
import { useOnboardingStep, type ConsumerProfile } from "@/lib/onboarding";
import { fitScore, formatPrice } from "@/lib/routine";
import { addToTrousse } from "@/lib/trousse";

type Product = {
  id: string;
  brand: string;
  brandLogo: string | null;
  name: string;
  image: string | null;
  price: number;
  /** « % adapté » d'après le quiz ; null sans réponses (badge masqué). */
  match: number | null;
};

function toSlide(p: PublicProduct, profile: ConsumerProfile | null): Product {
  return {
    id: p.id,
    brand: p.marque.nom,
    brandLogo: p.marque.logoUrl,
    name: p.nom,
    image: p.imagesUrls[0] ?? null,
    price: p.prix,
    match: fitScore(p, profile),
  };
}

function BagIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M7 8V6a3 3 0 0 1 6 0v2" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2.5 8h15l-1.2 9.5A1.5 1.5 0 0 1 14.8 19H5.2a1.5 1.5 0 0 1-1.5-1.5L2.5 8z" fill="white" fillOpacity="0.2" stroke="white" strokeWidth="1.6" strokeLinejoin="round"/>
    </svg>
  );
}

const CARD_WIDTH = 193.5;
const GAP = 12;

export default function ProductSlider({ title, hideBrandRow, titleColor = "#07320D", cardColor, textColor = "#031A06", limit }: { title: string; hideBrandRow?: boolean; titleColor?: string; cardColor?: string; textColor?: string; /** Nombre maximum de produits affichés (tous par défaut). */ limit?: number }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  // Catalogue client : seulement les produits en ligne des marques publiées.
  const [catalogue, setCatalogue] = useState<PublicProduct[]>([]);
  const { saved: profile } = useOnboardingStep();
  const products = catalogue.map((p) => toSlide(p, profile));

  useEffect(() => {
    let cancelled = false;
    api
      .get<PublicProduct[]>("/produits")
      .then((list) => {
        if (!cancelled) setCatalogue(limit ? list.slice(0, limit) : list);
      })
      .catch((err) => console.error("Produits indisponibles:", err));
    return () => {
      cancelled = true;
    };
  }, [limit]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    setActiveIndex(Math.round(el.scrollLeft / (CARD_WIDTH + GAP)));
  }

  function scrollTo(index: number) {
    const el = scrollRef.current;
    if (el) el.scrollTo({ left: index * (CARD_WIDTH + GAP), behavior: "smooth" });
    setActiveIndex(index);
  }

  // Aucun produit en ligne : pas de section vide.
  if (products.length === 0) return null;

  return (
    <section className="mt-6">
      <h2
        className="font-playfair font-bold px-4 mb-4"
        style={{ fontSize: "22px", color: titleColor }}
      >
        {title}
      </h2>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto pb-2"
        style={{
          gap: `${GAP}px`,
          scrollSnapType: "x mandatory",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          paddingLeft: "20px",
          paddingRight: "20px",
        }}
      >
        {products.map((product, i) => (
          /* Carte – pas de shadow, pas de border */
          <div
            key={product.id}
            className="flex-shrink-0 flex flex-col"
            style={{
              width: `${CARD_WIDTH}px`,
              scrollSnapAlign: "start",
              gap: "12px",
            }}
          >

            {/* ── Div 1 : Marque ── 193.5 × 52 px */}
            {!hideBrandRow && (
            <div
              className="flex items-center"
              style={{
                width: "193.5px",
                height: "52px",
                background: "#FFFFFF",
                border: "0.5px solid #E5E7EB",
                borderRadius: "16px",
                padding: "6px 12px",
                gap: "8px",
                flexShrink: 0,
              }}
            >
              <div
                className="relative flex-shrink-0 overflow-hidden rounded-lg"
                style={{ width: "32px", height: "32px" }}
              >
                {product.brandLogo ? (
                  <Image
                    src={product.brandLogo}
                    alt={product.brand}
                    fill
                    className="object-contain"
                    sizes="32px"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-[#EAF6EE] text-xs font-semibold text-[#07320D]">
                    {product.brand.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <span
                className="flex-1 truncate"
                style={{
                  fontFamily: "var(--font-inter), system-ui, sans-serif",
                  fontWeight: 400,
                  fontSize: "14px",
                  lineHeight: "22px",
                  letterSpacing: "-0.07em",
                  color: "#031A06",
                  verticalAlign: "middle",
                }}
              >
                {product.brand}
              </span>
              <div className="relative flex-shrink-0" style={{ width: "28px", height: "28px" }}>
                <Image src="/cachet.png" alt="" fill className="object-contain" sizes="28px" />
              </div>
            </div>
            )}

            {/* ── Div 2 : Produit (nom + image) ── 193.5 × 317 px */}
            <Link
              href={`/produit/${product.id}`}
              className="flex flex-col overflow-hidden"
              style={{
                width: "193.5px",
                height: "317px",
                borderRadius: "24px",
                border: "1px solid #E5E7EB",
                padding: "12px",
                gap: "16px",
                backdropFilter: "blur(100px)",
                WebkitBackdropFilter: "blur(100px)",
                background: cardColor ?? "rgba(255,255,255,0.85)",
                flexShrink: 0,
              }}
            >
              {/* Nom du produit */}
              <p
                className="line-clamp-2"
                style={{
                  fontFamily: "var(--font-inter), system-ui, sans-serif",
                  fontWeight: 500,
                  fontSize: "14px",
                  lineHeight: "100%",
                  letterSpacing: "-0.03em",
                  color: textColor,
                  alignSelf: "flex-end",
                  flexShrink: 0,
                }}
              >
                {product.name}
              </p>
              {/* Image produit – 169.5 × 243 px */}
              <div
                className="relative overflow-hidden flex-shrink-0"
                style={{
                  width: "169.5px",
                  height: "243px",
                  borderRadius: "20px",
                  boxShadow: "1px 1px 3px 0px rgba(0,0,0,0.04), 4px 4px 6px 0px rgba(0,0,0,0.03), 9px 9px 8px 0px rgba(0,0,0,0.02), 16px 17px 9px 0px rgba(0,0,0,0.01), 24px 26px 10px 0px rgba(0,0,0,0)",
                }}
              >
                {product.image ? (
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    sizes="170px"
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-[#EAF6EE]" />
                )}
                {/* Overlay border blanc – positionné à l'intérieur de l'image */}
                <div
                  className="absolute pointer-events-none"
                  style={{
                    top: "1.77px",
                    left: "1.88px",
                    width: "166.56px",
                    height: "239.51px",
                    borderRadius: "20px",
                    borderTop: "1px solid #FFFFFF",
                    borderRight: "1px solid #FFFFFF",
                    borderBottom: "none",
                    borderLeft: "1px solid #FFFFFF",
                  }}
                />
              </div>
            </Link>

            {/* ── Div 3 : Prix + taux + bouton ── */}
            <div className="flex flex-col" style={{ gap: "8px" }}>

              {/* Partie 1 : deux chips côte à côte */}
              <div className="flex" style={{ gap: "2px" }}>

                {/* Chip Prix – 95.75 × 52 px */}
                <div
                  className="flex flex-col items-center justify-center"
                  style={{
                    width: "95.75px",
                    height: "52px",
                    borderRadius: "16px",
                    border: "0.5px solid #E5E7EB",
                    padding: "4px 12px",
                    gap: "2px",
                    background: cardColor ?? "#FFFFFF",
                    flexShrink: 0,
                  }}
                >
                  <span style={{
                    fontFamily: "var(--font-inter), system-ui, sans-serif",
                    fontSize: "18px", fontWeight: 700, color: textColor, letterSpacing: "-0.03em", lineHeight: 1, textAlign: "center",
                  }}>
                    {formatPrice(product.price)}
                  </span>
                  <span style={{
                    fontFamily: "var(--font-inter), system-ui, sans-serif",
                    fontSize: "11px", fontWeight: 500, color: "#4A6E4F", textAlign: "center",
                  }}>
                    Dzd
                  </span>
                </div>

                {/* Chip Taux – 95.75 × 52 px (affichée quand un score d'adaptation existe) */}
                {product.match != null && (
                <div
                  className="flex flex-col items-center justify-center"
                  style={{
                    width: "95.75px",
                    height: "52px",
                    borderRadius: "16px",
                    border: "0.5px solid #E5E7EB",
                    padding: "4px 12px",
                    gap: "8px",
                    background: cardColor ?? "#FFFFFF",
                    flexShrink: 0,
                  }}
                >
                  <span style={{
                    fontFamily: "var(--font-inter), system-ui, sans-serif",
                    fontSize: "11px", fontWeight: 500, color: textColor, lineHeight: "100%", letterSpacing: "-0.3px", whiteSpace: "nowrap", textAlign: "center",
                  }}>
                    {product.match} % adapté
                  </span>
                  {/* Barre de progression – 71.75 × 9 px */}
                  <div style={{
                    width: "71.75px", height: "9px",
                    borderRadius: "100px",
                    border: "0.45px solid #6CE9A6",
                    background: "#D1FADF",
                    padding: "1px 2px",
                    boxSizing: "border-box",
                    flexShrink: 0,
                  }}>
                    <div style={{
                      height: "100%",
                      borderRadius: "100px",
                      background: "#32D583",
                      width: `${product.match}%`,
                    }} />
                  </div>
                </div>
                )}
              </div>

              {/* Partie 2 : Bouton "Garder ce produit" – 193.5 × 44 px */}
              <button
                onClick={() => addToTrousse(catalogue[i])}
                className="flex items-center justify-center transition-opacity hover:opacity-90"
                style={{
                  width: "193.5px",
                  height: "44px",
                  borderRadius: "16px",
                  border: "2px solid transparent",
                  background: "linear-gradient(#07320D, #07320D) padding-box, linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 100%) border-box",
                  boxShadow: "0px 1px 2px 0px rgba(16,24,40,0.05), 0px -2px 0px 0px rgba(255,255,255,0.08) inset, 0px 0px 0px 1px rgba(255,255,255,0.12) inset",
                  gap: "8px",
                  fontFamily: "var(--font-inter), system-ui, sans-serif",
                  fontSize: "16px",
                  fontWeight: 500,
                  lineHeight: "100%",
                  letterSpacing: "-0.01em",
                  color: "white",
                  textAlign: "center",
                }}
              >
                Garder ce produit
                <BagIcon />
              </button>
            </div>

          </div>
        ))}
      </div>

      {/* Dots */}
      <div
        className="flex items-center justify-center mt-3"
        style={{
          width: "40px",
          height: "8px",
          gap: "2.67px",
          margin: "12px auto 0",
          boxShadow: "0.67px 0px 0.67px 0px rgba(0,0,0,0.01)",
        }}
      >
        {products.map((_, i) => (
          <button
            key={i}
            onClick={() => scrollTo(i)}
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "100px",
              flexShrink: 0,
              padding: 0,
              background: i === activeIndex ? "#07320D" : "#D8E2D9",
              border: i === activeIndex
                ? "0.2px solid rgba(137,109,89,0.10)"
                : "0.2px solid rgba(107,135,110,0.10)",
              transition: "background 0.25s ease",
            }}
          />
        ))}
      </div>
    </section>
  );
}

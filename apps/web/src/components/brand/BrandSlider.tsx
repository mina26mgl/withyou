"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { PublicBrandCard } from "@withyou/shared-types";
import { api } from "@/lib/api";

const GAP = 8;

/** Forme des cartes : « home » (accueil, page marque) ou « rounded » (/search). Le contenu est le même. */
const SHAPES = {
  home: {
    width: 355,
    height: 447,
    radius: 20,
    border: "2px solid rgba(0,0,0,0.08)",
    shadow: undefined,
    innerRadius: 18,
    frameRadius: 25,
    insetShadow: undefined,
    paddingBottom: 8,
  },
  rounded: {
    width: 320,
    height: 400,
    radius: 54.08,
    border: "1.61px solid #0000001A",
    shadow: [
      "0.9px 0.9px 2.7px 0px #0000000A",
      "3.61px 3.61px 5.41px 0px #00000008",
      "8.11px 8.11px 7.21px 0px #00000005",
      "14.42px 15.32px 8.11px 0px #00000003",
      "21.63px 23.44px 9.01px 0px #00000000",
    ].join(", "),
    innerRadius: 52,
    frameRadius: 54.08,
    insetShadow: "0px 0px 15.86px 8.11px #FFFFFF66 inset",
    // Laisse la place aux ombres portées sous les cartes (le défilement les couperait).
    paddingBottom: 28,
  },
} as const;

export type BrandSliderShape = keyof typeof SHAPES;

export default function BrandSlider({ excludeSlug, shape = "home" }: { excludeSlug?: string; shape?: BrandSliderShape } = {}) {
  const S = SHAPES[shape];
  const CARD_WIDTH = S.width;
  // Marques publiées (page validée par withyou) : chaque carte ouvre sa vraie page.
  const [published, setPublished] = useState<PublicBrandCard[]>([]);
  useEffect(() => {
    let cancelled = false;
    api
      .get<PublicBrandCard[]>("/marques")
      .then((list) => {
        if (!cancelled) setPublished(list);
      })
      .catch((err) => console.error("Marques indisponibles:", err));
    return () => {
      cancelled = true;
    };
  }, []);
  const brands = excludeSlug ? published.filter((b) => b.slug !== excludeSlug) : published;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

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

  // Aucune marque publiée : pas de section vide.
  if (brands.length === 0) return null;

  return (
    <section>
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex overflow-x-auto px-4 relative"
      style={{
        gap: "8px",
        paddingBottom: S.paddingBottom,
        scrollSnapType: "x mandatory",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
    >
      {brands.map((brand) => (
        <Link
          key={brand.slug}
          href={`/marque/${brand.slug}`}
          className="flex-shrink-0 relative cursor-pointer block"
          style={{
            width: S.width,
            height: S.height,
            borderRadius: S.radius,
            border: S.border,
            boxShadow: S.shadow,
            scrollSnapAlign: "start",
            overflow: "hidden",
            textDecoration: "none",
          }}
        >
          {/* Image de couverture – plein cadre (l'image fournie avec une couverture vidéo) */}
          {brand.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- images servies par l'API (http en local)
            <img src={brand.imageUrl} alt={brand.name} className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, #DCE8DF 0%, #4A6E4F 100%)" }} />
          )}

          {/* Halo blanc intérieur (forme « rounded ») : par-dessus la photo */}
          {S.insetShadow && (
            <div className="absolute inset-0 pointer-events-none z-10" style={{ borderRadius: S.radius, boxShadow: S.insetShadow }} />
          )}

          {/* Overlay border blanc – tous les côtés */}
          <div
            className="absolute pointer-events-none z-10"
            style={{
              inset: "1.77px 1.88px 1.77px 1.88px",
              borderRadius: S.innerRadius,
              border: "1px solid #FFFFFF",
             
            }}
          />

          {/* Frame bas – nom + tagline */}
          <div
            className="absolute z-20 flex flex-col items-center justify-end"
            style={{
              height: "123px",
              bottom: 0,
              left: "-3px",
              right: "-3px",
              borderRadius: `0px 0px ${S.frameRadius}px ${S.frameRadius}px`,
              border: "1px solid rgba(255,255,255,0.1)",
              overflow: "hidden",
              paddingTop: "16px",
              paddingBottom: "16px",
              gap: "8px",
              background: "linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.01) 100%)",
              backdropFilter: "blur(30px)",
              WebkitBackdropFilter: "blur(30px)",
              maskImage: "linear-gradient(to bottom, transparent 0%, black 35%, black 100%)",
              WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 45%, black 100%)",
            }}
          >
            {/* Nom de la marque – EB Garamond */}
            <span
              style={{
                fontFamily: "var(--font-eb-garamond), Georgia, serif",
                fontWeight: 400,
                fontSize: "32px",
                lineHeight: "100%",
                letterSpacing: "-0.03em",
                textAlign: "center",
                color: "#FFFFFF",
                display: "block",
                width: "100%",
              }}
            >
              {brand.name}
            </span>

            {/* Tagline – "Told by Withyou" */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0px" }}>
              <span
                style={{
                  fontFamily: "var(--font-inter), system-ui, sans-serif",
                  fontWeight: 400,
                  fontSize: "16px",
                  lineHeight: "100%",
                  letterSpacing: "-0.07em",
                  textAlign: "center",
                  color: "rgba(255,255,255,0.9)",
                }}
              >
                raconté par
              </span>
              <span
                style={{
                  fontFamily: "var(--font-playfair), Georgia, serif",
                  fontWeight: 700,
                  fontSize: "24px",
                  lineHeight: "100%",
                  letterSpacing: "-0.03em",
                  textAlign: "center",
                  color: "#FFFFFF",
                }}
              >
                Withyou
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>

    {/* Dots */}
    <div
      className="flex items-center justify-center"
      style={{
        width: "40px",
        height: "8px",
        gap: "2.67px",
        margin: "12px auto 0",
        boxShadow: "0.67px 0px 0.67px 0px rgba(0,0,0,0.01)",
      }}
    >
      {brands.map((_, i) => (
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
            cursor: "pointer",
          }}
        />
      ))}
    </div>
    </section>
  );
}

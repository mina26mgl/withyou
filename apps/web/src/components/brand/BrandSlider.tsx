"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type Brand = {
  id: number;
  name: string;
  slug: string;
  image: string;
  tagline: string;
};

const MOCK_BRANDS: Brand[] = [
  {
    id: 1,
    name: "Azul Cosmetique Story",
    slug: "azul-cosmetique-story",
    image: "/marque-jour-azul.jpg",
    tagline: "raconté par",
  },
  {
    id: 2,
    name: "Dihya Story",
    slug: "dihya-story",
    image: "/marque-jour-dihya.png",
    tagline: "raconté par",
  },
  {
    id: 3,
    name: "Namira Story",
    slug: "namira-story",
    image: "/marque-jour-namira.jpg",
    tagline: "raconté par",
  },
];

const CARD_WIDTH = 355;
const GAP = 8;

export default function BrandSlider({ excludeSlug }: { excludeSlug?: string } = {}) {
  const brands = excludeSlug ? MOCK_BRANDS.filter((b) => b.slug !== excludeSlug) : MOCK_BRANDS;
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

  return (
    <section>
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex overflow-x-auto px-4 pb-2 relative"
      style={{
        gap: "8px",
        scrollSnapType: "x mandatory",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
    >
      {brands.map((brand) => (
        <Link
          key={brand.id}
          href={`/marque/${brand.slug}`}
          className="flex-shrink-0 relative cursor-pointer block"
          style={{
            width: "355px",
            height: "447px",
            borderRadius: "20px",
            border: "2px solid rgba(0,0,0,0.08)",
            scrollSnapAlign: "start",
            overflow: "hidden",
            textDecoration: "none",
          }}
        >
          {/* Image de fond – plein cadre */}
          <Image
            src={brand.image}
            alt={brand.name}
            fill
            sizes="355px"
            className="object-cover"
          />

          {/* Overlay border blanc – tous les côtés */}
          <div
            className="absolute pointer-events-none z-10"
            style={{
              inset: "1.77px 1.88px 1.77px 1.88px",
              borderRadius: "18px",
              border: "1px solid #FFFFFF",
             
            }}
          />

          {/* Frame bas – nom + tagline */}
          <div
            className="absolute z-20 flex flex-col items-center justify-end"
            style={{
              width: "358px",
              height: "123px",
              top: "322px",
              left: "-3px",
              borderRadius: "0px 0px 25px 25px",
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
                {brand.tagline}
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

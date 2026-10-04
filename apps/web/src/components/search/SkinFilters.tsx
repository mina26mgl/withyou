import Image from "next/image";
import Link from "next/link";
import type { PublicProduct } from "@withyou/shared-types";

/** Filtres « Par besoin » de /search, reliés au vocabulaire des fiches produit (SKIN_TYPES / NEEDS). */
export const SKIN_FILTERS = [
  { id: "seche", label: "Peau sèche", image: "/peau%20seche.png", skinType: "Sèche" },
  { id: "sensible", label: "Peau sensible", image: "/peau%20sensible.png", skinType: "Sensible" },
  { id: "taches", label: "Taches", image: "/taches.png", need: "Taches" },
  { id: "anti-age", label: "Anti-âge", image: "/anti%20age.png", need: "Rides" },
  { id: "boutons", label: "Boutons", image: "/boutton.png", need: "Imperfections" },
  { id: "grasse", label: "Peau grasse", image: "/peau%20grasse.png", skinType: "Grasse" },
] as const satisfies readonly { id: string; label: string; image: string; skinType?: string; need?: string }[];

export type SkinFilter = (typeof SKIN_FILTERS)[number];

export function findSkinFilter(id: string | undefined): SkinFilter | undefined {
  return SKIN_FILTERS.find((f) => f.id === id);
}

export function matchesSkinFilter(p: PublicProduct, filter: SkinFilter): boolean {
  return "skinType" in filter ? p.skinTypes.includes(filter.skinType) : p.needs.includes(filter.need);
}

const IMAGE_SHADOW = [
  "0.36px 0.36px 1.07px 0px #0000000A",
  "1.42px 1.42px 2.13px 0px #00000008",
  "3.2px 3.2px 2.84px 0px #00000005",
  "5.68px 6.04px 3.2px 0px #00000003",
  "8.52px 9.23px 3.55px 0px #00000000",
].join(", ");

/** Grille de filtres ; le filtre actif renvoie vers /search sans filtre pour le retirer. */
export default function SkinFilters({ active }: { active?: string }) {
  return (
    <div className="px-4">
      <p style={{ fontFamily: "var(--font-playfair)", fontSize: 16, fontWeight: 700, color: "#07320D", margin: "0 0 12px" }}>
        Par besoin
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {SKIN_FILTERS.map((f) => {
          const selected = f.id === active;
          return (
            <Link
              key={f.id}
              href={selected ? "/search" : `/search?besoin=${f.id}`}
              scroll={false}
              aria-pressed={selected}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                minHeight: 71.78,
                padding: 4,
                borderRadius: 16,
                border: selected ? "1px solid #07320D" : "1px solid #0000000D",
                background: selected ? "#F6FAF7" : "#FFFFFF",
                boxSizing: "border-box",
                textDecoration: "none",
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: 60,
                  height: 61.78,
                  flexShrink: 0,
                  borderRadius: 10.65,
                  border: "0.36px solid #00000005",
                  overflow: "hidden",
                  boxShadow: IMAGE_SHADOW,
                }}
              >
                <Image src={f.image} alt="" fill sizes="60px" style={{ objectFit: "cover" }} />
                {/* Voile blanc intérieur par-dessus la photo */}
                <div style={{ position: "absolute", inset: 0, borderRadius: 10.65, boxShadow: "0px 0px 6.25px 3.2px #FFFFFFCC inset", pointerEvents: "none" }} />
              </div>
              <span style={{ fontFamily: "var(--font-playfair)", fontSize: 14, fontWeight: 600, color: "#07320D", lineHeight: "18px" }}>
                {f.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

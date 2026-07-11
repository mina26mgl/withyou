"use client";
import Image from "next/image";
import Link from "next/link";
import type { Produit } from "@withyou/shared-types";

function BagIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M7 8V6a3 3 0 0 1 6 0v2" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2.5 8h15l-1.2 9.5A1.5 1.5 0 0 1 14.8 19H5.2a1.5 1.5 0 0 1-1.5-1.5L2.5 8z" fill="white" fillOpacity="0.2" stroke="white" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export default function ProductCard({
  produit,
  score,
}: {
  produit: Produit;
  score?: number;
}) {
  const imageUrl = produit.imagesUrls[0];
  const fitPct = score != null ? Math.round(score * 100) : null;

  return (
    <div className="flex flex-col" style={{ gap: "8px" }}>

      {/* Carte : nom + image */}
      <Link
        href={`/produit/${produit.id}`}
        className="flex flex-col overflow-hidden"
        style={{
          borderRadius: "24px",
          border: "1px solid #E5E7EB",
          padding: "12px",
          gap: "16px",
          backdropFilter: "blur(100px)",
          WebkitBackdropFilter: "blur(100px)",
          background: "rgba(255,255,255,0.85)",
        }}
      >
        <p
          className="line-clamp-2"
          style={{
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            fontWeight: 500,
            fontSize: "14px",
            lineHeight: "1.2",
            letterSpacing: "-0.03em",
            color: "#031A06",
          }}
        >
          {produit.nom}
        </p>

        <div
          className="relative w-full overflow-hidden flex-shrink-0"
          style={{
            aspectRatio: "169.5 / 243",
            borderRadius: "20px",
            boxShadow: "1px 1px 3px 0px rgba(0,0,0,0.04), 4px 4px 6px 0px rgba(0,0,0,0.03), 9px 9px 8px 0px rgba(0,0,0,0.02)",
          }}
        >
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={produit.nom}
              fill
              sizes="(max-width: 430px) 50vw, 200px"
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-100" />
          )}
          <div
            className="absolute pointer-events-none inset-0"
            style={{
              borderRadius: "20px",
              borderTop: "1px solid #FFFFFF",
              borderRight: "1px solid #FFFFFF",
              borderLeft: "1px solid #FFFFFF",
            }}
          />
        </div>
      </Link>

      {/* Chips prix + taux */}
      <div className="flex" style={{ gap: "2px" }}>
        <div
          className="flex flex-col items-center justify-center flex-1"
          style={{
            height: "52px",
            borderRadius: "16px",
            border: "0.5px solid #E5E7EB",
            padding: "4px 12px",
            gap: "2px",
            background: "#FFFFFF",
          }}
        >
          <span style={{
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            fontSize: "18px", fontWeight: 700, color: "#031A06",
            letterSpacing: "-0.03em", lineHeight: 1, textAlign: "center",
          }}>
            {produit.prix.toLocaleString("fr-DZ")}
          </span>
          <span style={{
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            fontSize: "11px", fontWeight: 500, color: "#4A6E4F", textAlign: "center",
          }}>
            Dzd
          </span>
        </div>

        {fitPct != null && (
          <div
            className="flex flex-col items-center justify-center flex-1"
            style={{
              height: "52px",
              borderRadius: "16px",
              border: "0.5px solid #E5E7EB",
              padding: "4px 12px",
              gap: "8px",
              background: "#FFFFFF",
            }}
          >
            <span style={{
              fontFamily: "var(--font-inter), system-ui, sans-serif",
              fontSize: "11px", fontWeight: 500, color: "#031A06",
              lineHeight: "100%", letterSpacing: "-0.3px", whiteSpace: "nowrap", textAlign: "center",
            }}>
              {fitPct}% adapté
            </span>
            <div style={{
              width: "100%", height: "9px", borderRadius: "100px",
              border: "0.45px solid #6CE9A6", background: "#D1FADF",
              padding: "1px 2px", boxSizing: "border-box",
            }}>
              <div style={{ height: "100%", borderRadius: "100px", background: "#32D583", width: `${fitPct}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Bouton */}
      <button
        className="flex items-center justify-center w-full transition-opacity hover:opacity-90"
        style={{
          height: "44px",
          borderRadius: "16px",
          border: "2px solid transparent",
          background: "linear-gradient(#07320D, #07320D) padding-box, linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 100%) border-box",
          boxShadow: "0px 1px 2px 0px rgba(16,24,40,0.05), 0px -2px 0px 0px rgba(255,255,255,0.08) inset, 0px 0px 0px 1px rgba(255,255,255,0.12) inset",
          gap: "8px",
          fontFamily: "var(--font-inter), system-ui, sans-serif",
          fontSize: "14px", fontWeight: 500, color: "white",
          cursor: "pointer",
        }}
      >
        Garder ce produit
        <BagIcon />
      </button>
    </div>
  );
}
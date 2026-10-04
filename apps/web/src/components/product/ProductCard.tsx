"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Heart, ShoppingBag } from "lucide-react";
import type { PublicProduct } from "@withyou/shared-types";
import { useFavoris } from "@/lib/favoris";
import { addToTrousse } from "@/lib/trousse";

const INTER: React.CSSProperties = { fontFamily: "var(--font-inter), system-ui, sans-serif" };

const BOX: React.CSSProperties = {
  borderRadius: 20,
  border: "1px solid rgba(0,0,0,0.08)",
  background: "#FFFFFF",
  boxSizing: "border-box",
};

const IMAGE_SHADOW = [
  "1px 1px 3px 0px #0000000A",
  "4px 4px 6px 0px #00000008",
  "9px 9px 8px 0px #00000005",
  "16px 17px 9px 0px #00000003",
].join(", ");

const PILL: React.CSSProperties = {
  ...BOX,
  borderRadius: 16,
  flex: 1,
  minWidth: 0,
  height: 52,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  padding: "4px 8px",
};

const ACTION: React.CSSProperties = {
  flex: 1,
  height: 44,
  borderRadius: 16,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  boxSizing: "border-box",
};

/** Carte produit des grilles (/search) : marque, photo, prix, % Fit, ajout à la trousse et favori. */
export default function ProductCard({ produit, fit }: { produit: PublicProduct; fit: number | null }) {
  const favoris = useFavoris();
  const isFavori = favoris.ids.includes(produit.id);
  const [added, setAdded] = useState(false);
  const imageUrl = produit.imagesUrls[0];

  useEffect(() => {
    if (!added) return;
    const t = window.setTimeout(() => setAdded(false), 1200);
    return () => window.clearTimeout(t);
  }, [added]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
      {/* Marque + cachet */}
      <Link
        href={`/marque/${produit.marque.slug}`}
        style={{ ...BOX, display: "flex", alignItems: "center", gap: 8, padding: 6, textDecoration: "none" }}
      >
        <div style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 12, overflow: "hidden", border: "0.5px solid rgba(0,0,0,0.08)", background: "#FFFFFF" }}>
          {produit.marque.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- logos servis par l'API
            <img src={produit.marque.logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          ) : (
            <span style={{ ...INTER, display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: "#07320D" }}>
              {produit.marque.nom.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
        <span style={{ ...INTER, flex: 1, minWidth: 0, fontSize: 14, color: "#031A06", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {produit.marque.nom}
        </span>
        <Image
          src="/cachet.png"
          alt=""
          width={26}
          height={26}
          style={{ flexShrink: 0, filter: "drop-shadow(0.77px 0.77px 1.54px rgba(0,0,0,0.19)) drop-shadow(2.31px 2.31px 3.08px rgba(0,0,0,0.17))" }}
        />
      </Link>

      {/* Nom + photo */}
      <Link
        href={`/produit/${produit.id}`}
        style={{ ...BOX, borderRadius: 24, display: "flex", flexDirection: "column", gap: 16, padding: 12, textDecoration: "none" }}
      >
        <p
          className="line-clamp-2"
          style={{ ...INTER, fontSize: 15, fontWeight: 500, lineHeight: "20px", letterSpacing: "-0.02em", color: "#031A06", margin: 0, minHeight: 40 }}
        >
          {produit.nom}
        </p>
        <div
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "169.5 / 243",
            borderRadius: 24,
            overflow: "hidden",
            background: "#F6FAF7",
            border: "1px solid rgba(0,0,0,0.06)",
            boxShadow: IMAGE_SHADOW,
          }}
        >
          {imageUrl && <Image src={imageUrl} alt={produit.nom} fill sizes="(max-width: 430px) 50vw, 200px" style={{ objectFit: "cover" }} />}
          {/* Halo blanc intérieur par-dessus la photo */}
          <div style={{ position: "absolute", inset: 0, borderRadius: 24, boxShadow: "0px 0px 17.6px 9px #FFFFFFCC inset", pointerEvents: "none" }} />
          {/* Liseré blanc intérieur, décollé du bord comme les photos produit de /routine */}
          <div
            style={{
              position: "absolute",
              top: 1.77,
              left: 1.88,
              right: 1.88,
              bottom: 1.77,
              borderRadius: 22,
              borderTop: "1px solid #FFFFFF",
              borderRight: "1px solid #FFFFFF",
              borderLeft: "1px solid #FFFFFF",
              borderBottom: "none",
              pointerEvents: "none",
            }}
          />
        </div>
      </Link>

      {/* Prix + Fit */}
      <div style={{ display: "flex", gap: 4 }}>
        <div style={PILL}>
          <span style={{ ...INTER, fontSize: 15, color: "#07320D", lineHeight: 1 }}>{produit.prix.toLocaleString("fr-DZ")}</span>
          <span style={{ ...INTER, fontSize: 13, color: "#4A6E4F", lineHeight: 1 }}>Dzd</span>
        </div>
        {fit != null && (
          <div style={PILL}>
            <span style={{ ...INTER, fontSize: 15, color: "#07320D", lineHeight: 1, whiteSpace: "nowrap" }}>{fit}% Fit</span>
            <div style={{ width: "85%", height: 9, borderRadius: 100, border: "0.45px solid #6CE9A6", background: "#D1FADF", padding: "1px 2px", boxSizing: "border-box" }}>
              <div style={{ height: "100%", width: `${fit}%`, borderRadius: 100, background: "#32D583" }} />
            </div>
          </div>
        )}
      </div>

      {/* Ajouter à la trousse + favori */}
      <div style={{ display: "flex", gap: 4 }}>
        <button
          type="button"
          onClick={() => {
            addToTrousse(produit);
            setAdded(true);
          }}
          aria-label={`Garder ${produit.nom} dans ma trousse`}
          style={{
            ...ACTION,
            border: "2px solid transparent",
            background:
              "linear-gradient(#07320D, #07320D) padding-box, linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 100%) border-box",
            boxShadow:
              "0px 1px 2px 0px rgba(16,24,40,0.05), 0px -2px 0px 0px rgba(16,24,40,0.05) inset, 0px 0px 0px 1px rgba(16,24,40,0.18) inset",
          }}
        >
          {added ? <Check size={18} color="#FFFFFF" /> : <ShoppingBag size={18} color="#FFFFFF" strokeWidth={1.8} />}
        </button>
        <button
          type="button"
          onClick={() => favoris.toggle(produit.id)}
          aria-pressed={isFavori}
          aria-label={isFavori ? `Retirer ${produit.nom} des favoris` : `Ajouter ${produit.nom} aux favoris`}
          style={{
            ...ACTION,
            border: "1px solid #D5D7DA",
            background: "#FFFFFF",
            boxShadow: "0px 1px 2px 0px rgba(16,24,40,0.05), 0px -2px 0px 0px rgba(16,24,40,0.05) inset",
          }}
        >
          <Heart size={18} color={isFavori ? "#F04438" : "#031A06"} fill={isFavori ? "#F04438" : "none"} strokeWidth={1.8} />
        </button>
      </div>
    </div>
  );
}

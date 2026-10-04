"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2, ChevronRight } from "lucide-react";
import { useOnboardingStep } from "@/lib/onboarding";
import { fitScore } from "@/lib/routine";
import { removeFromTrousse, setTrousseQuantite, useTrousse, type TrousseItem } from "@/lib/trousse";

const INTER: React.CSSProperties = { fontFamily: "Inter, sans-serif" };

const IMAGE_SHADOW = [
  "1px 1px 3px 0px #0000000A",
  "4px 4px 6px 0px #00000008",
  "9px 9px 8px 0px #00000005",
  "16px 17px 9px 0px #00000003",
  "24px 26px 10px 0px #00000000",
].join(", ");

const PILL: React.CSSProperties = {
  flex: 1,
  borderRadius: 16,
  border: "0.5px solid #00000014",
  padding: "8px 6px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 6,
  background: "#FFFFFF",
};

function formatDzd(value: number) {
  return value.toLocaleString("fr-DZ");
}

function QuantityButton({ onClick, disabled, label, children }: { onClick: () => void; disabled?: boolean; label: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      style={{
        width: 32,
        height: 32,
        borderRadius: 999,
        border: "0.5px solid #00000014",
        background: "#FFFFFF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.4 : 1,
        boxShadow: "0px 1px 2px 0px rgba(16,24,40,0.08)",
      }}
    >
      {children}
    </button>
  );
}

function TrousseCard({ item, fit }: { item: TrousseItem; fit: number | null }) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 361,
        minHeight: 254,
        borderRadius: 24,
        border: "1px solid rgba(0,0,0,0.08)",
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        background: "#FFFFFF",
        boxSizing: "border-box",
      }}
    >
      {/* Marque + cachet, suppression à droite */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {item.marque.logoUrl && (
          <div style={{ width: 36, height: 36, borderRadius: 10, overflow: "hidden", border: "0.5px solid rgba(0,0,0,0.08)", flexShrink: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.marque.logoUrl} alt={item.marque.nom} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
        )}
        <span style={{ ...INTER, fontSize: 14, fontWeight: 400, color: "#07320D", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {item.marque.nom}
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/cachet.png"
          alt=""
          style={{
            width: 28,
            height: 28,
            flexShrink: 0,
            filter: "drop-shadow(0.77px 0.77px 1.54px rgba(0,0,0,0.19)) drop-shadow(2.31px 2.31px 3.08px rgba(0,0,0,0.17))",
          }}
        />
        <button
          onClick={() => removeFromTrousse(item.id)}
          aria-label={`Retirer ${item.nom} de ma trousse`}
          style={{ marginLeft: "auto", background: "transparent", border: "none", padding: 4, cursor: "pointer", display: "flex" }}
        >
          <Trash2 size={20} color="#F04438" strokeWidth={1.8} />
        </button>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        {/* Photo produit */}
        <div
          style={{
            width: 169,
            height: 174,
            flexShrink: 0,
            borderRadius: 30,
            border: "1px solid rgba(0,0,0,0.08)",
            overflow: "hidden",
            position: "relative",
            background: "#F6FAF7",
            boxShadow: IMAGE_SHADOW,
          }}
        >
          {item.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.imageUrl} alt={item.nom} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          )}
          {/* Voile blanc intérieur par-dessus la photo */}
          <div style={{ position: "absolute", inset: 0, borderRadius: 30, boxShadow: "0px 0px 17.6px 9px #FFFFFFCC inset", pointerEvents: "none" }} />
        </div>

        {/* Nom, prix, fit, quantité */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          <p
            style={{
              fontFamily: "var(--font-playfair)",
              fontSize: 15,
              fontWeight: 600,
              lineHeight: "20px",
              color: "#031A06",
              margin: 0,
              display: "-webkit-box",
              WebkitLineClamp: 4,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {item.nom}
          </p>

          <div style={{ display: "flex", gap: 6 }}>
            <div style={PILL}>
              <span style={{ ...INTER, fontSize: 14, color: "#07320D", lineHeight: "16px" }}>{formatDzd(item.prix)}</span>
              <span style={{ ...INTER, fontSize: 13, color: "#4A6E4F", lineHeight: "16px" }}>Dzd</span>
            </div>
            {fit != null && (
              <div style={PILL}>
                <span style={{ ...INTER, fontSize: 14, color: "#101828", lineHeight: "16px", whiteSpace: "nowrap" }}>{fit}% Fit</span>
                <div style={{ width: "85%", height: 8, borderRadius: 100, background: "#ECFDF3", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${fit}%`, borderRadius: 100, background: "#32D583" }} />
                </div>
              </div>
            )}
          </div>

          {/* Quantité */}
          <div
            style={{
              marginTop: "auto",
              borderRadius: 999,
              border: "0.5px solid #00000014",
              padding: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <QuantityButton label="Diminuer la quantité" disabled={item.quantite <= 1} onClick={() => setTrousseQuantite(item.id, item.quantite - 1)}>
              <Minus size={16} color="#031A06" />
            </QuantityButton>
            <span style={{ ...INTER, fontSize: 15, color: "#031A06" }}>{item.quantite}</span>
            <QuantityButton label="Augmenter la quantité" onClick={() => setTrousseQuantite(item.id, item.quantite + 1)}>
              <Plus size={16} color="#031A06" />
            </QuantityButton>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PanierPage() {
  const router = useRouter();
  const items = useTrousse();
  const { saved: profile } = useOnboardingStep();
  const total = items.reduce((sum, i) => sum + i.prix * i.quantite, 0);

  return (
    <div className="relative w-full max-w-[430px] mx-auto bg-[#FCFFFD]" style={{ minHeight: "100dvh", paddingBottom: items.length ? 190 : 100 }}>
      {/* Ciel en haut de la trousse vide, fondu vers le fond de page */}
      {items.length === 0 && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 260,
            backgroundImage: "url('/nuage_inscription.png')",
            backgroundSize: "cover",
            backgroundPosition: "center top",
            opacity: 0.55,
            maskImage: "linear-gradient(to bottom, black 35%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 35%, transparent 100%)",
          }}
        />
      )}

      {/* Retour */}
      <div style={{ position: "relative", padding: "20px 16px 0 16px" }}>
        <button
          onClick={() => router.back()}
          style={{ background: "transparent", border: "none", padding: 0, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8L10 4" stroke="#07320D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ ...INTER, fontSize: 14, fontWeight: 500, color: "#07320D" }}>Retour</span>
        </button>
      </div>

      <h1
        style={{
          fontFamily: "var(--font-averia), serif",
          fontWeight: 700,
          fontSize: 28,
          lineHeight: "100%",
          letterSpacing: "-0.09em",
          textAlign: "center",
          color: "#031A06",
          margin: "24px 0 20px",
          position: "relative",
        }}
      >
        Ma trousse
      </h1>

      {items.length === 0 ? (
        <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 12, padding: "64px 16px 0" }}>
          <Image
            src="/trousse.png"
            alt="Trousse vide"
            width={300}
            height={200}
            priority
            style={{ width: 240, height: "auto", mixBlendMode: "multiply" }}
          />
          <h2 style={{ fontFamily: "var(--font-averia), serif", fontWeight: 700, fontSize: 28, lineHeight: "100%", letterSpacing: "-0.09em", color: "#031A06", margin: "8px 0 0" }}>
            Ta trousse est vide
          </h2>
          <p style={{ ...INTER, fontSize: 14, lineHeight: "20px", color: "#4A6E4F", margin: 0 }}>
            Ta routine t&apos;attend. Tu peux acheter directement ce qui te manque.
          </p>
          <button
            onClick={() => router.push("/search")}
            style={{
              ...INTER,
              marginTop: 12,
              width: "100%",
              height: 44,
              padding: "12px 12px",
              boxSizing: "border-box",
              borderRadius: 16,
              border: "2px solid transparent",
              background:
                "linear-gradient(#07320D, #07320D) padding-box, linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 100%) border-box",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              cursor: "pointer",
              fontWeight: 500,
              fontSize: 16,
              color: "#FFFFFF",
              letterSpacing: "-0.03em",
              boxShadow:
                "0px 1px 2px 0px rgba(16,24,40,0.05), 0px -2px 0px 0px rgba(16,24,40,0.05) inset, 0px 0px 0px 1px rgba(16,24,40,0.18) inset",
            }}
          >
            Parcourir les produits
            <ChevronRight size={18} />
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "0 16px" }}>
          {items.map((item) => (
            <TrousseCard key={item.id} item={item} fit={fitScore(item, profile)} />
          ))}
        </div>
      )}

      {/* Sous-total + étape suivante, posés au-dessus de la barre de navigation */}
      {items.length > 0 && (
        <div className="fixed left-1/2 -translate-x-1/2 z-40 w-full max-w-[430px]" style={{ bottom: 86, padding: "0 16px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: 8,
              borderRadius: 24,
              border: "1px solid rgba(0,0,0,0.08)",
              background: "rgba(255,255,255,0.9)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              boxShadow: "0px 8px 24px 0px rgba(0,0,0,0.04)",
            }}
          >
            <div
              style={{
                flexShrink: 0,
                borderRadius: 18,
                border: "0.5px solid #00000014",
                padding: "8px 14px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
              }}
            >
              <span style={{ ...INTER, fontSize: 16, color: "#07320D", whiteSpace: "nowrap" }}>{formatDzd(total)} DZD</span>
              <span style={{ ...INTER, fontSize: 13, color: "#4A6E4F" }}>Sous Total</span>
            </div>
            <button
              onClick={() => router.push("/checkout")}
              style={{
                flex: "1 1 259px",
                minWidth: 0,
                height: 44,
                padding: "12px 12px",
                boxSizing: "border-box",
                borderRadius: 16,
                // Bordure en dégradé : border-image ignore border-radius, d'où le double fond.
                border: "2px solid transparent",
                background:
                  "linear-gradient(#07320D, #07320D) padding-box, linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 100%) border-box",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                cursor: "pointer",
                ...INTER,
                fontWeight: 500,
                fontSize: 16,
                color: "#FFFFFF",
                letterSpacing: "-0.03em",
                boxShadow:
                  "0px 1px 2px 0px rgba(16,24,40,0.05), 0px -2px 0px 0px rgba(16,24,40,0.05) inset, 0px 0px 0px 1px rgba(16,24,40,0.18) inset",
              }}
            >
              Next Step
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";
import { useState } from "react";
import Link from "next/link";
import BottomNav from "@/components/layout/BottomNav";
import { useOnlineProducts } from "@/lib/useOnlineProducts";
import { useOnboardingStep } from "@/lib/onboarding";
import { fitScore, formatPrice } from "@/lib/routine";
import { addToTrousse } from "@/lib/trousse";

const TABS = ["Aperçu", "Symptômes", "Traitements", "Routine"] as const;
type Tab = (typeof TABS)[number];
const CHIP_BASE: React.CSSProperties = {
  width: 72,
  height: 80,
  borderRadius: 20,
  border: "0.77px solid rgba(0,0,0,0.08)",
  backdropFilter: "blur(7.73px)",
  WebkitBackdropFilter: "blur(7.73px)",
  padding: 9.27,
  background: "rgba(255,255,255,1)",
  boxShadow:
    "0.77px 1.55px 3.86px 0px rgba(0,0,0,0.05), 2.32px 6.96px 7.73px 0px rgba(0,0,0,0.04), 5.41px 15.46px 10.05px 0px rgba(0,0,0,0.02), 10.05px 27.82px 11.59px 0px rgba(0,0,0,0.01), 15.46px 43.28px 13.14px 0px rgba(0,0,0,0)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 6.18,
  boxSizing: "border-box",
};

const CHIP_IMG: React.CSSProperties = {
  width: 52,
  height: 40,
  borderRadius: 5,
  border: "0.23px solid rgba(0,0,0,0.1)",
  objectFit: "cover",
  display: "block",
  flexShrink: 0,
  boxShadow:
    "0.13px 0.13px 0.38px 0px rgba(0,0,0,0.04), 0.51px 0.51px 0.76px 0px rgba(0,0,0,0.03), 1.15px 1.15px 1.02px 0px rgba(0,0,0,0.02), 2.04px 2.16px 1.15px 0px rgba(0,0,0,0.01)",
};

function ScanChip({ src, label }: { src: string; label: string }) {
  return (
    <div style={CHIP_BASE}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={label} style={CHIP_IMG} />
      <span
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 9,
          fontWeight: 500,
          color: "#07320D",
          textAlign: "center",
          lineHeight: 1,
        }}
      >
        {label}
      </span>
    </div>
  );
}

const GAUGE_CFGS = [
  {
    track: "rgba(209,250,223,1)",
    trackBorder: "rgba(108,233,166,1)",
    fill: "rgba(50,213,131,1)",
    fillShadow: "drop-shadow(0px 1px 2px rgba(64,201,123,0.46)) drop-shadow(0px 3px 3px rgba(64,201,123,0.40)) drop-shadow(0px 7px 4px rgba(64,201,123,0.23))",
  },
  {
    track: "rgba(254,228,226,1)",
    trackBorder: "rgba(253,162,155,1)",
    fill: "rgba(249,112,102,1)",
    fillShadow: "drop-shadow(0px 1px 2px rgba(240,68,56,0.46)) drop-shadow(0px 3px 3px rgba(240,68,56,0.40)) drop-shadow(0px 7px 4px rgba(240,68,56,0.23))",
  },
  {
    track: "rgba(254,240,199,1)",
    trackBorder: "rgba(254,200,75,1)",
    fill: "rgba(253,176,34,1)",
    fillShadow: "drop-shadow(0px 1px 2px rgba(247,144,9,0.46)) drop-shadow(0px 3px 3px rgba(247,144,9,0.40)) drop-shadow(0px 7px 4px rgba(247,144,9,0.23))",
  },
] as const;

type GaugeCfg = typeof GAUGE_CFGS[number];

function HalfGauge({ pct, cfg }: { pct: number; cfg: GaugeCfg }) {
  const r = 30, cx = 40, cy = 34, sw = 9;
  const lx = cx - r; // 10
  const rx = cx + r; // 70

  // Progress endpoint: angle goes π (left) → 0 (right) as pct goes 0 → 100
  const ang = Math.PI * (1 - pct / 100);
  const epx = +(cx + r * Math.cos(ang)).toFixed(2);
  const epy = +(cy - r * Math.sin(ang)).toFixed(2);

  // Track: full upper semicircle (sweep=1 in SVG = counter-clockwise visually = goes through top)
  const trackPath = `M ${lx} ${cy} A ${r} ${r} 0 0 1 ${rx} ${cy}`;
  // Remplace simplement cette ligne :
  const fillPath = pct > 0
  ? `M ${lx} ${cy} A ${r} ${r} 0 0 1 ${epx} ${epy}` // Le flag est forcé à 0 ici
  : null;

  return (
    <svg width={80} height={52} viewBox="0 0 80 52" style={{ overflow: "visible" }}>
      {/* Track (background arc) */}
      <path d={trackPath} fill="none" stroke={cfg.track}       strokeWidth={sw + 2} strokeLinecap="round" />
      <path d={trackPath} fill="none" stroke={cfg.trackBorder} strokeWidth={sw + 2} strokeLinecap="round" opacity={0.45} />

      {/* Progress arc */}
      {fillPath && (
        <g style={{ filter: cfg.fillShadow }}>
          <path d={fillPath} fill="none" stroke={cfg.fill} strokeWidth={sw} strokeLinecap="round" />
        </g>
      )}

      {/* Percentage */}
      <text
        x={cx} y={cy + 16}
        textAnchor="middle"
        fontSize={13} fontWeight={700}
        fill={cfg.fill}
        fontFamily="Inter, sans-serif"
      >
        {pct}%
      </text>
    </svg>
  );
}

function ScoreCard({
  title,
  sub,
  pct,
  gaugeIdx,
}: {
  title: string;
  sub: string;
  pct: number;
  gaugeIdx: 0 | 1 | 2;
}) {
  return (
    <div
      style={{
        width: 107,
        minHeight: 142,
        borderRadius: 16,
        border: "1px solid rgba(234,236,240,1)",
        padding: "16px 8px",
        background: "rgba(255,255,255,1)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        boxSizing: "border-box",
      }}
    >
      <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: "#101828", textAlign: "center" }}>
        {title}
      </span>
      <span style={{ fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 400, color: "#667085", textAlign: "center", lineHeight: "14px" }}>
        {sub}
      </span>
      <HalfGauge pct={pct} cfg={GAUGE_CFGS[gaugeIdx]} />
    </div>
  );
}

export default function ResultatPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Aperçu");
  // Produits en ligne uniquement, « % adapté » d'après les réponses au quiz.
  const { saved: profile } = useOnboardingStep();
  const morningProducts = useOnlineProducts().map((p) => ({
    id: p.id,
    brand: p.marque.nom,
    brandLogo: p.marque.logoUrl,
    brandInitials: p.marque.nom.slice(0, 2).toUpperCase(),
    name: p.nom,
    image: p.imagesUrls[0],
    price: formatPrice(p.prix),
    fit: fitScore(p, profile),
    source: p,
  }));

  return (
    <div
  className="relative w-full max-w-[430px] mx-auto bg-[#FCFFFD] flex flex-col h-screen overflow-hidden"
  style={{ height: "100dvh" }}
>
  {/* 1. Zone de contenu principal qui prend tout l'espace disponible et défile */}
  <div
    className="flex-1 min-h-0 overflow-y-auto"
    style={{ scrollbarWidth: "none", paddingBottom: 24 } as React.CSSProperties} // J'ai réduit à 24px car le menu ne la cachera plus !
  >
    {/* Header */}
    <div style={{ padding: "20px 16px 12px 16px" }}>
      <h1
        style={{
          fontFamily: "var(--font-playfair)",
          fontSize: 26,
          fontWeight: 700,
          color: "rgba(7,50,13,1)",
          margin: 0,
          lineHeight: "32px",
        }}
      >
        Voici ce que nous avons vu
      </h1>
      <p
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 12,
          color: "#667085",
          margin: "6px 0 0 0",
          lineHeight: "18px",
        }}
      >
        Scan terminé en 8 secondes. Vos données ne quittent jamais votre appareil.
      </p>
    </div>

        {/* Image zone */}
        <div style={{ position: "relative", width: "100%", height: 390, flexShrink: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/resultat.png"
            alt="Résultat scan"
            style={{
              position: "absolute",
              top: 0,
              left: 55,
              width: 293,
              height: 390,
              objectFit: "cover",
              display: "block",
            }}
          />

          {/* Gradient fade at bottom of photo */}
          <div
            style={{
              position: "absolute",
              top: 209,
              left: 55,
              width: 294,
              height: 86,
              background:
                "linear-gradient(180deg, rgba(252,255,253,0) 0%, #FCFFFD 100%)",
              pointerEvents: "none",
            }}
          />

          {/* Chip Wrinkles — top-left */}
          <div style={{ position: "absolute", top: 30, left: 30 }}>
            <ScanChip src="/ride.png" label="Wrinkles" />
          </div>

          {/* Chip Acne — top-right */}
          <div style={{ position: "absolute", top: 30, right: 50 }}>
            <ScanChip src="/acne.png" label="Acne" />
          </div>

          {/* Chip Oily skin — right lower */}
          <div style={{ position: "absolute", top: 128, right: 50 }}>
            <ScanChip src="/oily.png" label="Oily skin" />
          </div>
        </div>

        {/* Tab section */}
        <div style={{ padding: "12px 16px 0 16px",position: "relative",top:-100,                  // Ajuste cette valeur pour la placer où tu veux sur l'image (ex: top: 20, ou bottom: 20)
    left: 0,
    right: 0,
    zIndex: 10, backgroundColor: "white" }}>
          {/* Tab bar */}
          <div
            style={{
              width: 361,
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
                  onClick={() => setActiveTab(tab)}
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

          {/* Aperçu content */}
          {activeTab === "Aperçu" && (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: "flex", gap: 8, margin:12 }}>
                <ScoreCard title="Hydratation" sub="Bon niveau"          pct={90} gaugeIdx={0} />
                <ScoreCard title="Sébum"       sub="À surveiller"        pct={23} gaugeIdx={1} />
                <ScoreCard title="Texture"     sub="Peut être amélioré"  pct={59} gaugeIdx={2} />
              </div>
              <p
                style={{
                  marginTop: 12,
                  fontFamily: "Inter, sans-serif",
                  fontSize: 12,
                  color: "#667085",
                  lineHeight: "18px",
                  margin: "12px 0 0 0",
                }}
              >
                Votre peau retient bien l&apos;hydratation, mais une légère brillance et des
                pores plus visibles ont été détectés au niveau de la zone T et des joues.
                Une routine ciblée matin et soir devrait équilibrer cela en quelques semaines.
              </p>
            </div>
          )}

          {activeTab !== "Aperçu" && (
            <div style={{ marginTop: 24, textAlign: "center" }}>
              
            </div>
          )}
          {activeTab === "Traitements" && (
            <div>
            <div className="relative overflow-hidden" style={{ marginTop: 12, border:"1px solid rgba(0, 0, 0, 0.08)", borderRadius:"24px",padding:"12px",background:"rgba(255, 255, 255, 1)",gap:"16px"}}>
              <h2 style={{ fontFamily: "var(--font-playfair)", fontSize: 16,fontWeight: 700,color: "rgba(3, 26, 6, 1)", margin: "0 0 12px 0" }}>
                Vitamine C
              </h2>
              {/* Rose décorative */}
              <div className="absolute pointer-events-none" style={{ right: 10, top: -17, width: 33, height: 55, transform: "rotate(240.0deg)", transformOrigin: "center center" }}>
               <img src="/rose.png" alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              </div>
             <p
                style={{
                  marginTop: 12,
                  fontFamily: "Inter, sans-serif",
                  fontWeight:400,
                  fontSize: 14,
                  color: "rgba(77, 101, 81, 1)",
                  lineHeight: "22px",
                  margin: "12px 0 0 0",
                }}
              >
               éclaire la peau terne, réduit les taches sombres et stimule la production de collagène
             </p>
              <div
             style={{
              display: "flex",
              flexWrap: "nowrap",
              gap: 12,
              overflowX: "auto",
              paddingBottom: 4,
              paddingRight: 12,
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              WebkitOverflowScrolling: "touch",
             } as React.CSSProperties}
             >
             {morningProducts.map((product) => (
              <div key={product.id} className="flex-shrink-0" style={{ width: 193, display: "flex", flexDirection: "column", gap: 8 }}>
                <Link href={`/produit/${product.id}`} style={{ display: "flex", flexDirection: "column", gap: 8, textDecoration: "none" }}>
                {/* Card marque */}
                <div style={{
                  height: 52,
                  borderRadius: 16,
                  border: "0.5px solid rgba(0,0,0,0.08)",
                  padding: "6px 12px",
                  background: "rgba(255,255,255,1)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  boxSizing: "border-box",
                }}>
                  {product.brandLogo ? (
                    <div className="relative flex-shrink-0 overflow-hidden" style={{ width: 32, height: 32, borderRadius: 8 }}>
                      <img src={product.brandLogo} alt={product.brand} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
                      <div className="absolute pointer-events-none" style={{
                        top: 0, left: 0, right: 0, bottom: 0,
                        borderRadius: 8,
                        borderTop: "1px solid rgba(255,255,255,1)",
                        borderRight: "1px solid rgba(255,255,255,1)",
                        borderBottom: "none",
                        borderLeft: "1px solid rgba(255,255,255,1)",
                      }} />
                      <div className="absolute pointer-events-none" style={{
                        top: "0.5px", left: "0.5px", right: "0.5px", bottom: 0,
                        borderRadius: 8,
                        borderTop: "0.11px solid rgba(255,255,255,1)",
                        borderRight: "0.11px solid rgba(255,255,255,1)",
                        borderBottom: "none",
                        borderLeft: "0.11px solid rgba(255,255,255,1)",
                      }} />
                    </div>
                  ) : (
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#E8F5E9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#07320D", flexShrink: 0 }}>
                      {product.brandInitials}
                    </div>
                  )}
                  <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 500, fontSize: 13, color: "#07320D", letterSpacing: "-0.03em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {product.brand}
                  </span>
                </div>

                {/* Card produit */}
                <div style={{
                  height: 248,
                  borderRadius: 24,
                  border: "1px solid rgba(0,0,0,0.08)",
                  padding: 12,
                  background: "rgba(255,255,255,1)",
                  backdropFilter: "blur(100px)",
                  WebkitBackdropFilter: "blur(100px)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  boxSizing: "border-box",
                  overflow: "hidden",
                }}>
                  <div style={{
                    position: "relative",
                    flex: 1,
                    borderRadius: 20,
                    overflow: "hidden",
                    minHeight: 0,
                  }}>
                    <img src={product.image} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    <div className="absolute pointer-events-none" style={{
                      top: "1.77px",
                      left: "1.88px",
                      right: "1.88px",
                      bottom: 0,
                      borderRadius: 20,
                      borderTop: "1px solid #FFFFFF",
                      borderRight: "1px solid #FFFFFF",
                      borderBottom: "none",
                      borderLeft: "1px solid #FFFFFF",
                    }} />
                  </div>
                  <p style={{
                    fontFamily: "Inter, sans-serif",
                    fontWeight: 400,
                    fontSize: 13,
                    color: "#07320D",
                    margin: 0,
                    letterSpacing: "-0.03em",
                    lineHeight: "1.3",
                    flexShrink: 0,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  } as React.CSSProperties}>
                    {product.name}
                  </p>
                </div>
                </Link>

                {/* Prix + Fit */}
                <div className="flex" style={{ gap: 2 }}>
                  {/* Chip Prix */}
                  <div className="flex flex-col items-center justify-center" style={{
                    width: "95.75px", height: 52, borderRadius: 16,
                    border: "0.5px solid #E5E7EB", padding: "4px 12px", gap: 2,
                    background: "#FFFFFF", flexShrink: 0,
                  }}>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 700, color: "#031A06", letterSpacing: "-0.03em", lineHeight: 1, textAlign: "center" }}>
                      {product.price}
                    </span>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 500, color: "#4A6E4F", textAlign: "center" }}>
                      Dzd
                    </span>
                  </div>
                  {/* Chip Taux */}
                  {product.fit != null && (
                  <div className="flex flex-col items-center justify-center" style={{
                    width: "95.75px", height: 52, borderRadius: 16,
                    border: "0.5px solid #E5E7EB", padding: "4px 12px", gap: 8,
                    background: "#FFFFFF", flexShrink: 0,
                  }}>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 500, color: "#031A06", lineHeight: "100%", letterSpacing: "-0.3px", whiteSpace: "nowrap", textAlign: "center" }}>
                      {product.fit}% adapté
                    </span>
                    <div style={{ width: 71.75, height: 9, borderRadius: 100, border: "0.45px solid #6CE9A6", background: "#D1FADF", padding: "1px 2px", boxSizing: "border-box", flexShrink: 0 }}>
                      <div style={{ height: "100%", borderRadius: 100, background: "#32D583", width: `${product.fit}%` }} />
                    </div>
                  </div>
                  )}
                </div>
                <button onClick={() => addToTrousse(product.source)} style={{
                  width: 193.5, height: 36,
                  borderRadius: 16,
                  border: "2px solid rgba(255,255,255,0.12)",
                     padding: "8px 16px", boxSizing: "border-box",
                  background: "rgba(7,50,13,1)",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  alignSelf: "center", flexShrink: 0,
                  cursor: "pointer", fontFamily: "Inter, sans-serif", fontWeight: 500, fontSize: 14,
                    color: "#FFFFFF", letterSpacing: "-0.03em", whiteSpace: "nowrap",
                  boxShadow: "0px 1px 2px 0px rgba(16,24,40,0.05), 0px -2px 0px 0px rgba(16,24,40,0.05) inset, 0px 0px 0px 1px rgba(16,24,40,0.18) inset",
             }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                 <path d="M4 2H12C12.5523 2 13 2.44772 13 3V14L8 11L3 14V3C3 2.44772 3.44772 2 4 2Z" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                 Garder ce produit
                  </button>
              </div>
              
             ))}
                 </div>
             
            </div>
            <div className="relative overflow-hidden" style={{ marginTop: 12, border:"1px solid rgba(0, 0, 0, 0.08)", borderRadius:"24px",padding:"12px",background:"rgba(255, 255, 255, 1)",gap:"16px"}}>
              <h2 style={{ fontFamily: "var(--font-playfair)", fontSize: 16,fontWeight: 700,color: "rgba(3, 26, 6, 1)", margin: "0 0 12px 0" }}>
                Vitamine C
              </h2>
              {/* Rose décorative */}
              <div className="absolute pointer-events-none" style={{ right: 10, top: -17, width: 33, height: 55, transform: "rotate(240.0deg)", transformOrigin: "center center" }}>
               <img src="/rose.png" alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              </div>
             <p
                style={{
                  marginTop: 12,
                  fontFamily: "Inter, sans-serif",
                  fontWeight:400,
                  fontSize: 14,
                  color: "rgba(77, 101, 81, 1)",
                  lineHeight: "22px",
                  margin: "12px 0 0 0",
                }}
              >
               éclaire la peau terne, réduit les taches sombres et stimule la production de collagène
             </p>
              <div
             style={{
              display: "flex",
              flexWrap: "nowrap",
              gap: 12,
              overflowX: "auto",
              paddingBottom: 4,
              paddingRight: 12,
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              WebkitOverflowScrolling: "touch",
             } as React.CSSProperties}
             >
             {morningProducts.map((product) => (
              <div key={product.id} className="flex-shrink-0" style={{ width: 193, display: "flex", flexDirection: "column", gap: 8 }}>
                <Link href={`/produit/${product.id}`} style={{ display: "flex", flexDirection: "column", gap: 8, textDecoration: "none" }}>
                {/* Card marque */}
                <div style={{
                  height: 52,
                  borderRadius: 16,
                  border: "0.5px solid rgba(0,0,0,0.08)",
                  padding: "6px 12px",
                  background: "rgba(255,255,255,1)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  boxSizing: "border-box",
                }}>
                  {product.brandLogo ? (
                    <div className="relative flex-shrink-0 overflow-hidden" style={{ width: 32, height: 32, borderRadius: 8 }}>
                      <img src={product.brandLogo} alt={product.brand} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
                      <div className="absolute pointer-events-none" style={{
                        top: 0, left: 0, right: 0, bottom: 0,
                        borderRadius: 8,
                        borderTop: "1px solid rgba(255,255,255,1)",
                        borderRight: "1px solid rgba(255,255,255,1)",
                        borderBottom: "none",
                        borderLeft: "1px solid rgba(255,255,255,1)",
                      }} />
                      <div className="absolute pointer-events-none" style={{
                        top: "0.5px", left: "0.5px", right: "0.5px", bottom: 0,
                        borderRadius: 8,
                        borderTop: "0.11px solid rgba(255,255,255,1)",
                        borderRight: "0.11px solid rgba(255,255,255,1)",
                        borderBottom: "none",
                        borderLeft: "0.11px solid rgba(255,255,255,1)",
                      }} />
                    </div>
                  ) : (
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#E8F5E9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#07320D", flexShrink: 0 }}>
                      {product.brandInitials}
                    </div>
                  )}
                  <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 500, fontSize: 13, color: "#07320D", letterSpacing: "-0.03em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {product.brand}
                  </span>
                </div>

                {/* Card produit */}
                <div style={{
                  height: 248,
                  borderRadius: 24,
                  border: "1px solid rgba(0,0,0,0.08)",
                  padding: 12,
                  background: "rgba(255,255,255,1)",
                  backdropFilter: "blur(100px)",
                  WebkitBackdropFilter: "blur(100px)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  boxSizing: "border-box",
                  overflow: "hidden",
                }}>
                  <div style={{
                    position: "relative",
                    flex: 1,
                    borderRadius: 20,
                    overflow: "hidden",
                    minHeight: 0,
                  }}>
                    <img src={product.image} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    <div className="absolute pointer-events-none" style={{
                      top: "1.77px",
                      left: "1.88px",
                      right: "1.88px",
                      bottom: 0,
                      borderRadius: 20,
                      borderTop: "1px solid #FFFFFF",
                      borderRight: "1px solid #FFFFFF",
                      borderBottom: "none",
                      borderLeft: "1px solid #FFFFFF",
                    }} />
                  </div>
                  <p style={{
                    fontFamily: "Inter, sans-serif",
                    fontWeight: 400,
                    fontSize: 13,
                    color: "#07320D",
                    margin: 0,
                    letterSpacing: "-0.03em",
                    lineHeight: "1.3",
                    flexShrink: 0,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  } as React.CSSProperties}>
                    {product.name}
                  </p>
                </div>
                </Link>

                {/* Prix + Fit */}
                <div className="flex" style={{ gap: 2 }}>
                  {/* Chip Prix */}
                  <div className="flex flex-col items-center justify-center" style={{
                    width: "95.75px", height: 52, borderRadius: 16,
                    border: "0.5px solid #E5E7EB", padding: "4px 12px", gap: 2,
                    background: "#FFFFFF", flexShrink: 0,
                  }}>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 700, color: "#031A06", letterSpacing: "-0.03em", lineHeight: 1, textAlign: "center" }}>
                      {product.price}
                    </span>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 500, color: "#4A6E4F", textAlign: "center" }}>
                      Dzd
                    </span>
                  </div>
                  {/* Chip Taux */}
                  {product.fit != null && (
                  <div className="flex flex-col items-center justify-center" style={{
                    width: "95.75px", height: 52, borderRadius: 16,
                    border: "0.5px solid #E5E7EB", padding: "4px 12px", gap: 8,
                    background: "#FFFFFF", flexShrink: 0,
                  }}>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 500, color: "#031A06", lineHeight: "100%", letterSpacing: "-0.3px", whiteSpace: "nowrap", textAlign: "center" }}>
                      {product.fit}% adapté
                    </span>
                    <div style={{ width: 71.75, height: 9, borderRadius: 100, border: "0.45px solid #6CE9A6", background: "#D1FADF", padding: "1px 2px", boxSizing: "border-box", flexShrink: 0 }}>
                      <div style={{ height: "100%", borderRadius: 100, background: "#32D583", width: `${product.fit}%` }} />
                    </div>
                  </div>
                  )}
                </div>
                <button onClick={() => addToTrousse(product.source)} style={{
                  width: 193.5, height: 36,
                  borderRadius: 16,
                  border: "2px solid rgba(255,255,255,0.12)",
                     padding: "8px 16px", boxSizing: "border-box",
                  background: "rgba(7,50,13,1)",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  alignSelf: "center", flexShrink: 0,
                  cursor: "pointer", fontFamily: "Inter, sans-serif", fontWeight: 500, fontSize: 14,
                    color: "#FFFFFF", letterSpacing: "-0.03em", whiteSpace: "nowrap",
                  boxShadow: "0px 1px 2px 0px rgba(16,24,40,0.05), 0px -2px 0px 0px rgba(16,24,40,0.05) inset, 0px 0px 0px 1px rgba(16,24,40,0.18) inset",
             }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                 <path d="M4 2H12C12.5523 2 13 2.44772 13 3V14L8 11L3 14V3C3 2.44772 3.44772 2 4 2Z" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                 Garder ce produit
                  </button>
              </div>
              
             ))}
                 </div>
             
            </div>
            </div>
          )}

          {activeTab !== "Aperçu" && (
            <div style={{ marginTop: 24, textAlign: "center" }}>
              <p
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 13,
                  color: "#667085",
                }}
              >
               
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <p
          style={{
            textAlign: "center",
            fontFamily: "Inter, sans-serif",
            fontSize: 11,
            color: "#D0D5DD",
            marginTop: 28,
          }}
        >
          withyou.app
        </p>
      </div>
      <BottomNav />
    </div>
  );
}
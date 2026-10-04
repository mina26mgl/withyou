"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";

const INTER: React.CSSProperties = { fontFamily: "Inter, sans-serif" };

/** Un produit tombe toutes les STAGGER ms ; chaque chute dure DROP ms. */
const STAGGER = 650;
const DROP = 1000;
/** Au-delà, le carton serait trop long à remplir : les suivants sont déjà dedans. */
const MAX_DROPS = 6;

const BOX_WIDTH = 290;
const BOX_HEIGHT = Math.round((BOX_WIDTH * 1716) / 1964);
/** Bord haut du rabat avant du carton ouvert, en part de sa hauteur. */
const OPENING = 0.19;

/**
 * Carton withyou ouvert qui se remplit des produits commandés (un par la droite,
 * un par la gauche), se ferme, puis affiche le numéro de commande.
 */
export default function OrderConfirmation({ numero, images }: { numero: string; images: (string | null)[] }) {
  const router = useRouter();
  const drops = images.slice(0, MAX_DROPS);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const delay = reduced ? 0 : (drops.length - 1) * STAGGER + DROP + 250;
    const t = window.setTimeout(() => setClosed(true), Math.max(delay, 0));
    return () => window.clearTimeout(t);
  }, [drops.length]);

  return (
    <div className="relative w-full max-w-[430px] mx-auto bg-[#FCFFFD] flex flex-col items-center overflow-hidden" style={{ minHeight: "100dvh", paddingBottom: 100 }}>
      <style>{`
        @keyframes wy-drop-left {
          0%   { transform: translate(-190px, -150px) rotate(-28deg) scale(1); opacity: 0; }
          20%  { opacity: 1; }
          60%  { transform: translate(-10px, -70px) rotate(-8deg) scale(0.9); }
          100% { transform: translate(0, 60px) rotate(0deg) scale(0.75); opacity: 1; }
        }
        @keyframes wy-drop-right {
          0%   { transform: translate(190px, -150px) rotate(28deg) scale(1); opacity: 0; }
          20%  { opacity: 1; }
          60%  { transform: translate(10px, -70px) rotate(8deg) scale(0.9); }
          100% { transform: translate(0, 60px) rotate(0deg) scale(0.75); opacity: 1; }
        }
        @keyframes wy-box-close {
          0%   { transform: scale(1.12, 0.9); }
          55%  { transform: scale(0.96, 1.05); }
          100% { transform: scale(1, 1); }
        }
        @keyframes wy-fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .wy-drop { display: none; }
          .wy-anim { animation: none !important; }
        }
      `}</style>

      {/* Ciel, fondu vers le fond de page */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 300,
          backgroundImage: "url('/nuage_inscription.png')",
          backgroundSize: "cover",
          backgroundPosition: "center top",
          opacity: 0.55,
          maskImage: "linear-gradient(to bottom, black 35%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 35%, transparent 100%)",
        }}
      />

      {/* Carton */}
      <div style={{ position: "relative", width: BOX_WIDTH, height: BOX_HEIGHT, marginTop: 150 }}>
        {!closed ? (
          <>
            <Image src="/carton%20withyou.png" alt="" fill priority sizes={`${BOX_WIDTH}px`} style={{ objectFit: "contain" }} />
            {/* Les produits glissent derrière le rabat avant : la zone s'arrête à l'ouverture du carton. */}
            <div
              aria-hidden="true"
              style={{ position: "absolute", left: -BOX_WIDTH, right: -BOX_WIDTH, top: -220, height: 220 + BOX_HEIGHT * OPENING, overflow: "hidden", pointerEvents: "none" }}
            >
              {drops.map((src, i) => (
                <div
                  key={i}
                  className="wy-drop wy-anim"
                  style={{
                    position: "absolute",
                    left: "50%",
                    bottom: 0,
                    width: 64,
                    height: 64,
                    marginLeft: -32 + (i % 2 === 0 ? 1 : -1) * Math.min(i, 3) * 14,
                    borderRadius: 16,
                    overflow: "hidden",
                    background: "#F6FAF7",
                    boxShadow: "1px 1px 3px 0px #0000001A, 4px 6px 8px 0px #00000014",
                    opacity: 0,
                    animation: `${i % 2 === 0 ? "wy-drop-right" : "wy-drop-left"} ${DROP}ms cubic-bezier(0.45, 0, 0.55, 1) ${i * STAGGER}ms forwards`,
                  }}
                >
                  {src && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          // Le carton fermé a plus de marge autour : agrandi pour garder la même taille à l'écran.
          <div className="wy-anim" style={{ position: "absolute", inset: 0, transform: "scale(1.14)", transformOrigin: "center bottom" }}>
            <div className="wy-anim" style={{ position: "absolute", inset: 0, transformOrigin: "center bottom", animation: "wy-box-close 450ms ease-out" }}>
              <Image src="/carton%20ferme.png" alt="Carton withyou fermé" fill sizes={`${BOX_WIDTH}px`} style={{ objectFit: "contain" }} />
            </div>
          </div>
        )}
      </div>

      {closed && (
        <div
          className="wy-anim"
          style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 12, padding: "40px 20px 0", width: "100%", boxSizing: "border-box", animation: "wy-fade-up 450ms ease-out 250ms both" }}
        >
          <p style={{ fontFamily: "var(--font-averia), serif", fontWeight: 700, fontSize: 20, lineHeight: "100%", letterSpacing: "-0.04em", color: "#031A06", margin: 0 }}>
            N° {numero}
          </p>
          <h1 style={{ fontFamily: "var(--font-averia), serif", fontWeight: 700, fontSize: 28, lineHeight: "100%", letterSpacing: "-0.09em", color: "#031A06", margin: 0 }}>
            Commande confirmée
          </h1>
          <p style={{ ...INTER, fontSize: 14, lineHeight: "20px", color: "#4A6E4F", margin: 0 }}>
            On t&apos;appelle dans les 24 h pour confirmer. Livraison estimée sous 3 jours.
          </p>
          <button
            onClick={() => router.push("/commandes")}
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
            Suivre ma commande
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

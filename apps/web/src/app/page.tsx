"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function WelcomePage() {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  function handleContinuer() {
    setLeaving(true);
    setTimeout(() => router.push("/onboarding"), 500);
  }

  return (
    <div className="relative w-full max-w-[430px] mx-auto overflow-hidden bg-[#FCFFFD]" style={{ height: "100dvh" }}>

      {/* Nuage */}
      <div className="absolute top-0 pointer-events-none" style={{ left: "-209px", width: "851px", height: "250px" }}>
        <img
          src="/nuage_inscription.png"
          alt=""
          style={{ width: "851px", height: "250px", objectFit: "cover", display: "block" }}
        />
        <div className="absolute inset-0" style={{ background: "rgba(255,255,255,0.50)" }} />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(252, 255, 253, 0) 40%, #FCFFFD 100%)" }}
        />
      </div>

      {/* Bras du haut */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "50px",
          left: "100.77px",
          width: "241px",
          height: "79px",
          transform: "rotate(90deg)",
          transformOrigin: "center",
        }}
      >
        <img src="/bras_inscription.png" alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      </div>

      {/* Bras du bas */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "350px",
          left: "-60px",
          width: "520px",
          height: "285px",
          transform: "rotate(90deg)",
          transformOrigin: "center",
          
        }}
      >
        <img src="/bras_bas_inscription.png" alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      </div>

      {/* Flou haut — progressif 12px → 0 */}
      <div className="absolute top-0 left-0 right-0 pointer-events-none z-10" style={{ height: "65px" }}>
        {([12, 8, 4, 2] as const).map((blur, i) => (
          <div
            key={blur}
            className="absolute inset-0"
            style={{
              backdropFilter: `blur(${blur}px)`,
              WebkitBackdropFilter: `blur(${blur}px)`,
              opacity: 0.5,
              maskImage: `linear-gradient(to bottom, black 0%, transparent ${100 - i * 22}%)`,
              WebkitMaskImage: `linear-gradient(to bottom, black 0%, transparent ${100 - i * 22}%)`,
            }}
          />
        ))}
      </div>

      {/* Flou bas — progressif 12px → 0 */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none z-10" style={{ height: "120px" }}>
        {([12, 8, 4, 2] as const).map((blur, i) => (
          <div
            key={blur}
            className="absolute inset-0"
            style={{
              backdropFilter: `blur(${blur}px)`,
              WebkitBackdropFilter: `blur(${blur}px)`,
              opacity: 0.5,
              maskImage: `linear-gradient(to top, black 0%, transparent ${100 - i * 22}%)`,
              WebkitMaskImage: `linear-gradient(to top, black 0%, transparent ${100 - i * 22}%)`,
            }}
          />
        ))}
      </div>

      {/* Overlay fondu-blanc sortie */}
      <div
        className="absolute inset-0 pointer-events-none z-50"
        style={{
          background: "#FCFFFD",
          opacity: leaving ? 1 : 0,
          transition: "opacity 500ms ease",
        }}
      />

      {/* Contenu — texte + bouton */}
      <div
        className="absolute flex flex-col items-center"
        style={{ top: "316.5px", left: "35px", width: "361px", height: "139px", gap: "16px" }}
      >
        <p
          className="text-center text-[#07320D]"
          style={{
            fontFamily: "var(--font-playfair)",
            fontWeight: 600,
            fontSize: "26px",
            lineHeight: "100%",
            letterSpacing: "-0.06%",
          }}
        >
          Avant de vous montrer les produits, nous voulons d&apos;abord vous connaître.
        </p>

        <button
          onClick={handleContinuer}
          style={{
            width: "114px",
            height: "36px",
            borderRadius: "16px",
            padding: "8px 20px",
            gap: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background:
              "linear-gradient(#1C3D2E, #1C3D2E) padding-box, linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 100%) border-box",
            border: "2px solid transparent",
            boxShadow:
              "0px 1px 2px 0px rgba(16,24,40,0.05), 0px -2px 0px 0px rgba(255,255,255,0.08) inset, 0px 0px 0px 1px rgba(255,255,255,0.06) inset",
            color: "#FFFFFF",
            fontWeight: 400,
            fontSize: "14px",
            lineHeight: "20px",
            letterSpacing: "0%",
            cursor: "pointer",
          }}
        >
          Continuer <span style={{ fontSize: "16px", marginLeft: "2px" }}>›</span>
        </button>
      </div>
    </div>
  );
}
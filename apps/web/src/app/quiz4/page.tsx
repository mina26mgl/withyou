"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const blurLayers = [12, 8, 4, 2] as const;

export default function Quiz4Page() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  function handleContinuer() {
    setLeaving(true);
    setTimeout(() => router.push("/quiz5"), 700);
  }

  return (
    <div
      className="relative w-full max-w-[430px] mx-auto overflow-hidden bg-[#FCFFFD]"
      style={{ height: "100dvh", opacity: leaving ? 0 : visible ? 1 : 0, transition: "opacity 700ms ease" }}
    >
      {/* Nuage */}
      <div className="absolute top-0 pointer-events-none" style={{ left: "-209px", width: "851px", height: "250px" }}>
        <img src="/nuage_inscription.png" alt="" style={{ width: "851px", height: "250px", objectFit: "cover", display: "block" }} />
        <div className="absolute inset-0" style={{ background: "rgba(255,255,255,0.50)" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(252,255,253,0) 40%, #FCFFFD 100%)" }} />
      </div>

      {/* Flou haut */}
      <div className="absolute top-0 left-0 right-0 pointer-events-none z-10" style={{ height: "65px" }}>
        {blurLayers.map((blur, i) => (
          <div key={blur} className="absolute inset-0" style={{
            backdropFilter: `blur(${blur}px)`, WebkitBackdropFilter: `blur(${blur}px)`, opacity: 0.5,
            maskImage: `linear-gradient(to bottom, black 0%, transparent ${100 - i * 22}%)`,
            WebkitMaskImage: `linear-gradient(to bottom, black 0%, transparent ${100 - i * 22}%)`,
          }} />
        ))}
      </div>

      {/* Flou bas */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none z-10" style={{ height: "120px" }}>
        {blurLayers.map((blur, i) => (
          <div key={blur} className="absolute inset-0" style={{
            backdropFilter: `blur(${blur}px)`, WebkitBackdropFilter: `blur(${blur}px)`, opacity: 0.5,
            maskImage: `linear-gradient(to top, black 0%, transparent ${100 - i * 22}%)`,
            WebkitMaskImage: `linear-gradient(to top, black 0%, transparent ${100 - i * 22}%)`,
          }} />
        ))}
      </div>

      {/* Titre */}
      <div className="absolute" style={{ top: "60px", left: "16px", width: "361px" }}>
        <p style={{
          fontFamily: "var(--font-playfair)",
          fontWeight: 700,
          fontSize: "32px",
          lineHeight: "105%",
          letterSpacing: "-0.04%",
          color: "#07320D",
          marginBottom: "28px",
        }}>
          Quoi qu&apos;il arrive, nous sommes là pour vous aider à mieux connaître votre peau.
        </p>

        {/* Bouton Continuer */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <button onClick={handleContinuer} style={{
            width: "124px", height: "36px", borderRadius: "16px", padding: "8px 20px", gap: "8px",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "linear-gradient(#07320D, #07320D) padding-box, linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 100%) border-box",
            border: "2px solid transparent",
            boxShadow: "0px 1px 2px 0px rgba(16,24,40,0.05), 0px -2px 0px 0px rgba(255,255,255,0.08) inset, 0px 0px 0px 1px rgba(255,255,255,0.06) inset",
            color: "#FFFFFF", fontWeight: 600, fontSize: "14px", cursor: "pointer",
          }}>
            Continuer <span style={{ fontSize: "16px", marginLeft: "2px" }}>›</span>
          </button>
        </div>
      </div>

      {/* Bonhomme */}
      <div className="absolute pointer-events-none" style={{ bottom: "-20px", left: "40px", width: "268px", height: "326px" }}>
        <img src="/bonhomme.png" alt="" style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "bottom" }} />
      </div>

      {/* Flèche — tournée -180deg */}
      <div className="absolute pointer-events-none" style={{ bottom: "110px", left: "296px", width: "48px", height: "56px", transform: "rotate(-180deg)" }}>
        <svg width="48" height="56" viewBox="0 0 48 56" fill="none">
          <path d="M 8 50 C 12 28 34 18 42 6" stroke="#8A6E5A" strokeWidth="3" strokeLinecap="round" />
          <path d="M 42 6 L 34 8" stroke="#8A6E5A" strokeWidth="3" strokeLinecap="round" />
          <path d="M 42 6 L 42 15" stroke="#8A6E5A" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>

      {/* You! */}
      <div className="absolute pointer-events-none" style={{ bottom: "78px", left: "338px" }}>
        <span style={{
          fontFamily: "'Apple Garamond', 'Garamond', Georgia, serif",
          fontStyle: "regular",
          fontWeight: 400,
          fontSize: "30px",
          lineHeight: "86%",
          letterSpacing: "-0.05em",
          color: "#4E3422",
          whiteSpace: "nowrap",
        }}>
          You!
        </span>
      </div>
    </div>
  );
}

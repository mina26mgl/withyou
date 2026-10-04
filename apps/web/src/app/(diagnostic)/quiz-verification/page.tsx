"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const blurLayers = [12, 8, 4, 2] as const;

/** Transition entre la réaction de la peau (quiz5) et les précautions (/quiz-precautions). */
export default function QuizVerificationPage() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  function handleContinuer() {
    setLeaving(true);
    setTimeout(() => router.push("/quiz-precautions"), 700);
  }

  return (
    <div
      className="relative w-full overflow-x-hidden overflow-y-auto bg-[#FCFFFD]"
      style={{ height: "100dvh", opacity: leaving ? 0 : visible ? 1 : 0, transition: "opacity 700ms ease" }}
    >
      {/* Nuage */}
      <div
        className="absolute top-0 pointer-events-none"
        style={{ left: "50%", transform: "translateX(-50%)", width: "max(100%, 851px)", height: "250px" }}
      >
        <img
          src="/nuage_inscription.png"
          alt=""
          style={{ width: "100%", height: "250px", objectFit: "cover", display: "block" }}
        />
        <div className="absolute inset-0" style={{ background: "rgba(255,255,255,0.50)" }} />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(252, 255, 253, 0) 40%, #FCFFFD 100%)" }}
        />
      </div>

      {/* Flou haut */}
      <div className="fixed top-0 left-0 right-0 pointer-events-none z-10" style={{ height: "65px" }}>
        {blurLayers.map((blur, i) => (
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

      {/* Flou bas */}
      <div className="fixed bottom-0 left-0 right-0 pointer-events-none z-10" style={{ height: "120px" }}>
        {blurLayers.map((blur, i) => (
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

      {/* Phrase au milieu de l'écran, bouton en bas */}
      <div
        className="relative w-full max-w-[430px] mx-auto flex flex-col"
        style={{ minHeight: "100dvh", padding: "56px 24px 48px", boxSizing: "border-box" }}
      >
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p
            style={{
              fontFamily: "var(--font-averia), serif",
              fontWeight: 700,
              fontSize: "30px",
              lineHeight: "110%",
              letterSpacing: "-0.04em",
              color: "#07320D",
              textAlign: "center",
              margin: 0,
            }}
          >
            Avant de te conseiller,<br />
            deux choses à vérifier.
          </p>
        </div>

        {/* Au-dessus du flou du bas */}
        <div className="relative z-20" style={{ display: "flex", justifyContent: "center" }}>
          <button
            onClick={handleContinuer}
            style={{
              width: "124px",
              height: "36px",
              borderRadius: "16px",
              padding: "8px 20px",
              gap: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background:
                "linear-gradient(#07320D, #07320D) padding-box, linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 100%) border-box",
              border: "2px solid transparent",
              boxShadow:
                "0px 1px 2px 0px rgba(16,24,40,0.05), 0px -2px 0px 0px rgba(255,255,255,0.08) inset, 0px 0px 0px 1px rgba(255,255,255,0.06) inset",
              color: "#FFFFFF",
              fontWeight: 600,
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Continuer <span style={{ fontSize: "16px", marginLeft: "2px" }}>›</span>
          </button>
        </div>
      </div>
    </div>
  );
}

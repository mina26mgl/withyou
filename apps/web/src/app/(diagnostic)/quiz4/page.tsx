"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import OnboardingStage from "@/components/onboarding/OnboardingStage";
import { useOnboardingStep } from "@/lib/onboarding";

export default function Quiz4Page() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const { save, saving, error } = useOnboardingStep();

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  /** Dernier écran du quiz : l'onboarding est marqué terminé, puis la routine est générée. */
  async function handleContinuer() {
    if (saving || !(await save({ termine: true }))) return;
    setLeaving(true);
    setTimeout(() => router.push("/loading"), 700);
  }

  return (
    <OnboardingStage
      height={852}
      align="bottom"
      // « You! » dépasse la maquette de 393px : on ne l'agrandit pas, pour qu'il reste à l'écran.
      maxScale={1}
      style={{ opacity: leaving ? 0 : visible ? 1 : 0, transition: "opacity 700ms ease" }}
    >
      {/* Titre */}
      <div className="absolute" style={{ top: "60px", left: "16px", width: "361px" }}>
        <p
          style={{
            fontFamily: "var(--font-averia), serif",
            fontWeight: 700,
            fontSize: "32px",
            lineHeight: "105%",
            letterSpacing: "-0.04%",
            color: "#07320D",
            marginBottom: "28px",
          }}
        >
          Quoi qu&apos;il arrive, nous sommes là pour vous aider à mieux connaître votre peau.
        </p>

        {/* Bouton Continuer */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <button
            onClick={handleContinuer}
            disabled={saving}
            style={{
              height: "36px",
              whiteSpace: "nowrap",
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
            Générer ma routine
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ marginLeft: "4px" }}>
              <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2z" fill="white" />
              <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14z" fill="white" />
              <path d="M5 17l.5 1.5L7 19l-1.5.5L5 21l-.5-1.5L3 19l1.5-.5L5 17z" fill="white" />
            </svg>
          </button>
        </div>
        {error ? (
          <p role="alert" style={{ marginTop: "8px", textAlign: "center", fontSize: "13px", color: "#DC2626" }}>
            {error}
          </p>
        ) : null}
      </div>

      {/* Bonhomme */}
      <div
        className="absolute pointer-events-none"
        style={{ bottom: "-20px", left: "40px", width: "268px", height: "326px" }}
      >
        <img
          src="/bonhomme.png"
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "bottom" }}
        />
      </div>

      {/* Flèche — tournée -180deg */}
      <div
        className="absolute pointer-events-none"
        style={{ bottom: "110px", left: "284px", width: "48px", height: "56px", transform: "rotate(-180deg)" }}
      >
        <svg width="48" height="56" viewBox="0 0 48 56" fill="none">
          <path d="M 8 50 C 12 28 34 18 42 6" stroke="#8A6E5A" strokeWidth="3" strokeLinecap="round" />
          <path d="M 42 6 L 34 8" stroke="#8A6E5A" strokeWidth="3" strokeLinecap="round" />
          <path d="M 42 6 L 42 15" stroke="#8A6E5A" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>

      {/* You! */}
      <div className="absolute pointer-events-none" style={{ bottom: "78px", left: "326px" }}>
        <span
          style={{
            fontFamily: "'Apple Garamond', 'Garamond', Georgia, serif",
            fontStyle: "regular",
            fontWeight: 400,
            fontSize: "30px",
            lineHeight: "86%",
            letterSpacing: "-0.05em",
            color: "#4E3422",
            whiteSpace: "nowrap",
          }}
        >
          You!
        </span>
      </div>
    </OnboardingStage>
  );
}

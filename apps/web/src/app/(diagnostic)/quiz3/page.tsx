"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import OnboardingStage from "@/components/onboarding/OnboardingStage";
import { useOnboardingStep } from "@/lib/onboarding";

const iconStyle: React.CSSProperties = {
  display: "block",
  width: 20,
  height: 20,
  flexShrink: 0,
};

const gridChoices = [
  {
    id: "zero",
    label: "Je pars de zéro, pas de routine.",
    icon: (
      <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="#07320D" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="12" cy="12" r="4" />
        <line x1="12" y1="2" x2="12" y2="5" />
        <line x1="12" y1="19" x2="12" y2="22" />
        <line x1="2" y1="12" x2="5" y2="12" />
        <line x1="19" y1="12" x2="22" y2="12" />
        <line x1="4.93" y1="4.93" x2="7.05" y2="7.05" />
        <line x1="16.95" y1="16.95" x2="19.07" y2="19.07" />
        <line x1="4.93" y1="19.07" x2="7.05" y2="16.95" />
        <line x1="16.95" y1="7.05" x2="19.07" y2="4.93" />
      </svg>
    ),
  },
  {
    id: "basiques",
    label: "J'utilise quelques basiques, je veux m'améliorer.",
    icon: (
      <svg
        style={iconStyle}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#07320D"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="4" y1="6" x2="20" y2="6" />
        <line x1="4" y1="12" x2="14" y2="12" />
        <line x1="4" y1="18" x2="17" y2="18" />
        <polyline points="17 15 20 18 17 21" />
      </svg>
    ),
  },
  {
    id: "routine-inefficace",
    label: "J'ai une routine mais elle ne fonctionne pas.",
    icon: (
      <svg
        style={iconStyle}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#07320D"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="4" height="4" rx="0.5" />
        <rect x="10" y="3" width="4" height="4" rx="0.5" />
        <rect x="17" y="3" width="4" height="4" rx="0.5" />
        <rect x="3" y="10" width="4" height="4" rx="0.5" />
        <rect x="10" y="10" width="4" height="4" rx="0.5" />
        <rect x="17" y="10" width="4" height="4" rx="0.5" />
        <rect x="3" y="17" width="4" height="4" rx="0.5" />
        <rect x="10" y="17" width="4" height="4" rx="0.5" />
        <rect x="17" y="17" width="4" height="4" rx="0.5" />
      </svg>
    ),
  },
  {
    id: "regulier",
    label: "Je suis régulier, je veux juste de meilleurs produits.",
    icon: (
      <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="#07320D" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="12" cy="12" r="4" />
        <line x1="12" y1="2" x2="12" y2="5" />
        <line x1="12" y1="19" x2="12" y2="22" />
        <line x1="2" y1="12" x2="5" y2="12" />
        <line x1="19" y1="12" x2="22" y2="12" />
        <line x1="4.93" y1="4.93" x2="7.05" y2="7.05" />
        <line x1="16.95" y1="16.95" x2="19.07" y2="19.07" />
        <line x1="4.93" y1="19.07" x2="7.05" y2="16.95" />
        <line x1="16.95" y1="7.05" x2="19.07" y2="4.93" />
        <circle cx="12" cy="12" r="8" strokeDasharray="3 3" />
      </svg>
    ),
  },
];

export default function Quiz3Page() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const { saved, save, saving, error } = useOnboardingStep();

  // Reprise d'un onboarding interrompu : on retrouve les choix déjà enregistrés.
  useEffect(() => {
    if (saved?.routine_actuelle.length) setSelected((prev) => (prev.length ? prev : saved.routine_actuelle));
  }, [saved]);

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleContinuer() {
    if (saving || !(await save({ routineActuelle: selected }))) return;
    setLeaving(true);
    setTimeout(() => router.push("/quiz4"), 700);
  }

  const cardStyle = (id: string): React.CSSProperties => ({
    height: "98px",
    borderRadius: "16px",
    border: selected.includes(id) ? "1.5px solid #07320D" : "1px solid #EAECF0",
    background: selected.includes(id) ? "#F0F7F1" : "#FFFFFF",
    padding: "16px 8px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
    gap: "8px",
    cursor: "pointer",
    textAlign: "left",
    transition: "all 150ms ease",
  });

  const labelStyle: React.CSSProperties = {
    fontFamily: "Inter, sans-serif",
    fontWeight: 500,
    fontSize: "14px",
    lineHeight: "100%",
    letterSpacing: "-0.07em",
    color: "#07320D",
  };

  return (
    <OnboardingStage height={760} style={{ opacity: leaving ? 0 : visible ? 1 : 0, transition: "opacity 700ms ease" }}>
      {/* Titre */}
      <div className="absolute" style={{ top: "60px", left: "16px", width: "361px" }}>
        <p
          style={{
            fontFamily: "var(--font-averia), serif",
            fontWeight: 700,
            fontSize: "32px",
            lineHeight: "100%",
            letterSpacing: "-0.04%",
            color: "#07320D",
          }}
        >
          Où en êtes-vous avec votre routine de soins de la peau&nbsp;?
        </p>
      </div>

      {/* Livre */}
      <div
        className="absolute pointer-events-none"
        style={{ top: "140px", left: "-25px", width: "458px", height: "261px", mixBlendMode: "darken" }}
      >
        <img src="/livre.png" alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      </div>

      {/* Choix + bouton */}
      <div
        className="absolute"
        style={{ top: "390px", left: "16px", width: "361px", display: "flex", flexDirection: "column", gap: "14px" }}
      >
        {/* Label */}
        <p style={{ fontSize: "16px", color: "#4A6E4F", margin: 0 }}>Choisissez ce qui vous dérange le plus.</p>

        {/* Grille 2×2 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          {gridChoices.map((c) => (
            <button key={c.id} onClick={() => toggle(c.id)} style={cardStyle(c.id)}>
              {c.icon}
              <span style={labelStyle}>{c.label}</span>
            </button>
          ))}
        </div>

        {/* Bouton Continuer */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <button
            onClick={handleContinuer}
            disabled={saving}
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
        {error ? (
          <p role="alert" style={{ marginTop: "8px", textAlign: "center", fontSize: "13px", color: "#DC2626" }}>
            {error}
          </p>
        ) : null}
      </div>
    </OnboardingStage>
  );
}

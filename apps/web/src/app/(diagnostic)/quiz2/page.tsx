"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useOnboardingStep } from "@/lib/onboarding";

const blurLayers = [12, 8, 4, 2] as const;

/** Trois préoccupations au plus ; « rien » se choisit seul. Identifiants : PREOCCUPATIONS de l'API. */
const MAX_CHOICES = 3;
const RIEN = "rien";

const ICON = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "#07320D",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const SunIcon = (
  <svg {...ICON}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" />
  </svg>
);
const CornersIcon = (
  <svg {...ICON}>
    <path d="M4 9V6a2 2 0 012-2h3M15 4h3a2 2 0 012 2v3M20 15v3a2 2 0 01-2 2h-3M9 20H6a2 2 0 01-2-2v-3" />
  </svg>
);
const DropsIcon = (
  <svg {...ICON}>
    <path d="M8 3S4 8 4 11a4 4 0 008 0c0-3-4-8-4-8z" />
    <path d="M17 8s-3 4-3 6.5a3 3 0 006 0C20 12 17 8 17 8z" />
  </svg>
);

const choices = [
  { id: "boutons", label: "Des boutons qui reviennent", icon: SunIcon },
  { id: "taches", label: "Des taches, un teint irrégulier", icon: CornersIcon },
  { id: "ridules", label: "Des ridules qui s'installent", icon: DropsIcon },
  { id: "pores", label: "Des pores visibles", icon: CornersIcon },
  { id: "tiraillements", label: "Une peau qui tire", icon: SunIcon },
  { id: "rougeurs", label: "Des rougeurs", icon: CornersIcon },
  { id: RIEN, label: "Rien de particulier, je veux entretenir ma peau", icon: DropsIcon },
];
const KNOWN = new Set(choices.map((c) => c.id));

export default function Quiz2Page() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const { saved, save, saving, error } = useOnboardingStep();

  // Reprise d'un onboarding interrompu : on retrouve les choix déjà enregistrés (de cette question).
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current || !saved) return;
    restored.current = true;
    const previous = saved.preoccupations.filter((id) => KNOWN.has(id)).slice(0, MAX_CHOICES);
    if (previous.length) setSelected((prev) => (prev.length ? prev : previous));
  }, [saved]);

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (id === RIEN) return [RIEN];
      const others = prev.filter((x) => x !== RIEN);
      return others.length >= MAX_CHOICES ? others : [...others, id];
    });
  }

  async function handleContinuer() {
    if (saving || !(await save({ preoccupations: selected }))) return;
    setLeaving(true);
    setTimeout(() => router.push("/quiz5"), 700);
  }

  return (
    // Fond pleine largeur (ciel et flous couvrent aussi les tablettes), contenu dans une colonne
    // de 430px centrée en hauteur ; la page défile si l'écran est trop petit.
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

      <div
        className="relative w-full max-w-[430px] mx-auto flex flex-col"
        style={{ minHeight: "100dvh", justifyContent: "center", padding: "56px 16px 104px", boxSizing: "border-box" }}
      >
        {/* Titre */}
        <div>
          <p
            style={{
              fontFamily: "var(--font-averia), serif",
              fontWeight: 700,
              fontSize: "32px",
              lineHeight: "105%",
              letterSpacing: "-0.04em",
              color: "#07320D",
              margin: 0,
            }}
          >
            Qu&apos;est-ce qui te dérange en ce moment&nbsp;?
          </p>
        </div>

        {/* Visage et zones de la peau */}
        <div
          className="pointer-events-none"
          style={{ width: "201px", height: "201px", margin: "8px auto 0", flexShrink: 0 }}
        >
          <img src="/problematique.png" alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>

        {/* Choix + bouton */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "14px" }}>
          <p style={{ fontSize: "14px", color: "#4A6E4F", margin: 0 }}>
            Trois maximum. Ou rien du tout, c&apos;est une réponse valable.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {choices.map((c) => {
              const isSelected = selected.includes(c.id);
              // Trois déjà choisis : les autres cases sont grisées (sauf « rien », qui remplace tout).
              const locked = !isSelected && c.id !== RIEN && selected.length >= MAX_CHOICES;
              return (
                <button
                  key={c.id}
                  onClick={() => toggle(c.id)}
                  disabled={locked}
                  aria-pressed={isSelected}
                  style={{
                    gridColumn: c.id === RIEN ? "1 / -1" : undefined,
                    minHeight: "84px",
                    borderRadius: "16px",
                    border: isSelected ? "1.5px solid #07320D" : "1px solid #EAECF0",
                    background: isSelected ? "#F0F7F1" : "#FFFFFF",
                    padding: "14px 10px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                    gap: "8px",
                    cursor: locked ? "not-allowed" : "pointer",
                    opacity: locked ? 0.45 : 1,
                    textAlign: "left",
                    transition: "all 150ms ease",
                  }}
                >
                  <span style={{ display: "block", width: 20, height: 20 }}>{c.icon}</span>
                  <span
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontWeight: 500,
                      fontSize: "14px",
                      lineHeight: "110%",
                      letterSpacing: "-0.05em",
                      color: "#07320D",
                    }}
                  >
                    {c.label}
                  </span>
                </button>
              );
            })}
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
      </div>
    </div>
  );
}

"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOnboardingStep } from "@/lib/onboarding";

const blurLayers = [12, 8, 4, 2] as const;

const choices = [
  {
    id: "brillante",
    label: "Brillante, surtout mon nez et mon front",
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#07320D"
        strokeWidth="1.8"
        strokeLinecap="round"
      >
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
    id: "tendue",
    label: "Tendue et un peu inconfortable",
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#07320D"
        strokeWidth="1.8"
        strokeLinecap="round"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M9 9.5c0-.5.4-1 1-1s1 .5 1 1" />
        <path d="M13 9.5c0-.5.4-1 1-1s1 .5 1 1" />
        <path d="M8.5 15.5c1-1 5.5-1 7 0" />
      </svg>
    ),
  },
  {
    id: "mixte",
    label: "Grasse à certains endroits, sèche à d'autres",
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#07320D"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2C12 2 7 8.5 7 13a5 5 0 0010 0c0-4.5-5-11-5-11z" />
        <path d="M18 7C18 7 15 11 15 13.5a3 3 0 006 0C21 11 18 7 18 7z" />
      </svg>
    ),
  },
  {
    id: "equilibree",
    label: "Équilibrée, pas de gros problèmes",
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#07320D"
        strokeWidth="1.8"
        strokeLinecap="round"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M9 9.5c0-.5.4-1 1-1s1 .5 1 1" />
        <path d="M13 9.5c0-.5.4-1 1-1s1 .5 1 1" />
        <path d="M8.5 14.5c1 1.5 5.5 1.5 7 0" />
      </svg>
    ),
  },
];

export default function QuizPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const { saved, save, saving, error } = useOnboardingStep();

  // Reprise d'un onboarding interrompu : on retrouve les choix déjà enregistrés.
  useEffect(() => {
    if (saved?.type_peau.length) setSelected((prev) => (prev.length ? prev : saved.type_peau));
  }, [saved]);

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  async function handleContinuer() {
    if (saving || !(await save({ typePeau: selected }))) return;
    setLeaving(true);
    setTimeout(() => router.push("/quiz-age"), 700);
  }

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
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
            Comment votre peau se sent-elle généralement à midi&nbsp;?
          </p>
        </div>

        {/* Miroir */}
        <div
          className="pointer-events-none"
          style={{ width: "201px", height: "201px", margin: "8px auto 0", flexShrink: 0 }}
        >
          <img src="/mirroir.png" alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>

        {/* Choix + bouton */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Label */}
          <p style={{ fontSize: "16px", color: "#4A6E4F", margin: 0 }}>Sélectionnez tout ce qui s&apos;applique</p>

          {/* Grille 2×2 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {choices.map((c) => {
              const isSelected = selected.includes(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => toggle(c.id)}
                  style={{
                    height: "98px",
                    borderRadius: "16px",
                    border: isSelected ? "1.5px solid #07320D" : "1px solid #EAECF0",
                    background: isSelected ? "#F0F7F1" : "#FFFFFF",
                    padding: "16px 8px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                    gap: "8px",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 150ms ease",
                  }}
                >
                  <span style={{ display: "block", width: 24, height: 24 }}>{c.icon}</span>
                  <span
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontWeight: 500,
                      fontSize: "14px",
                      lineHeight: "100%",
                      letterSpacing: "-0.07em",
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

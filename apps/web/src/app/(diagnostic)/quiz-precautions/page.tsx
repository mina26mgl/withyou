"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useOnboardingStep } from "@/lib/onboarding";

const blurLayers = [12, 8, 4, 2] as const;

const SparkIcon = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#07320D"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 7l1.4 3.1L16.5 11l-3.1 1.4L12 15.5l-1.4-3.1L7.5 11l3.1-.9L12 7z" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

/** Aucune, une ou plusieurs ; identifiants : PRECAUTIONS de l'API (consomateur.precautions). */
const choices = [
  {
    id: "traitement-medical",
    label: "Je suis un traitement prescrit par un médecin",
    hint: "Pour l'acné, l'eczéma, le psoriasis, ou autre",
  },
  { id: "actif-fort", label: "J'utilise déjà un actif fort", hint: "Rétinol, acides, peroxyde de benzoyle" },
  {
    id: "grossesse",
    label: "Je suis enceinte ou j'allaite",
    hint: "Certains actifs sont à éviter pendant cette période",
  },
];
const KNOWN = new Set(choices.map((c) => c.id));

export default function QuizPrecautionsPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const { saved, save, saving, error } = useOnboardingStep();

  // Reprise d'un onboarding interrompu : on retrouve les choix déjà enregistrés.
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current || !saved) return;
    restored.current = true;
    const previous = (saved.precautions ?? []).filter((id) => KNOWN.has(id));
    if (previous.length) setSelected((prev) => (prev.length ? prev : previous));
  }, [saved]);

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  /** Rien de coché est une réponse valable : on enregistre la liste telle quelle. */
  async function handleContinuer() {
    if (saving || !(await save({ precautions: selected }))) return;
    setLeaving(true);
    setTimeout(() => router.push("/quiz3"), 700);
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
            Avant de te conseiller,
            <br />
            deux choses à vérifier.
          </p>
        </div>

        {/* Flacon */}
        <div
          className="pointer-events-none"
          style={{ width: "201px", height: "201px", margin: "8px auto 0", flexShrink: 0 }}
        >
          <img src="/flacon.png" alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>

        {/* Choix + bouton */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "14px" }}>
          <p style={{ fontSize: "14px", color: "#4A6E4F", margin: 0 }}>
            Ça décide de la vitesse à laquelle on introduit les choses.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {choices.map((c, i) => {
              const isSelected = selected.includes(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => toggle(c.id)}
                  aria-pressed={isSelected}
                  style={{
                    // Le dernier choix prend toute la largeur, comme sur la maquette.
                    gridColumn: i === choices.length - 1 ? "1 / -1" : undefined,
                    borderRadius: "16px",
                    border: isSelected ? "1.5px solid #07320D" : "1px solid #EAECF0",
                    background: isSelected ? "#F0F7F1" : "#FFFFFF",
                    padding: "14px 12px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: "6px",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 150ms ease",
                  }}
                >
                  <span style={{ display: "block", width: 20, height: 20, marginBottom: "4px" }}>{SparkIcon}</span>
                  <span
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontWeight: 600,
                      fontSize: "14px",
                      lineHeight: "120%",
                      letterSpacing: "-0.04em",
                      color: "#07320D",
                    }}
                  >
                    {c.label}
                  </span>
                  <span
                    style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", lineHeight: "140%", color: "#667085" }}
                  >
                    {c.hint}
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

"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useOnboardingStep } from "@/lib/onboarding";

const blurLayers = [12, 8, 4, 2] as const;

const MOIS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

/** Mêmes limites que l'API (13 à 100 ans) ; années de la plus récente à la plus ancienne. */
const THIS_YEAR = new Date().getFullYear();
const ANNEES = Array.from({ length: 100 - 13 + 1 }, (_, i) => THIS_YEAR - 13 - i);
const DEFAULT = { jour: 1, mois: 1, annee: 2000 };

const daysIn = (annee: number, mois: number) => new Date(annee, mois, 0).getDate();
const pad = (n: number) => String(n).padStart(2, "0");

/** Hauteur d'une ligne de roue : on en voit trois, celle du milieu est la valeur choisie. */
const ROW = 56;

/** Roue à défilement (jour, mois ou année) : la ligne du milieu, encadrée, est la valeur choisie. */
function Wheel({
  label,
  items,
  index,
  onChange,
}: {
  label: string;
  items: string[];
  index: number;
  onChange: (index: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const settle = useRef<number | undefined>(undefined);
  // Ligne au milieu pendant le défilement (mise en valeur avant que la roue ne s'arrête).
  const [live, setLive] = useState(index);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el && Math.round(el.scrollTop / ROW) !== index) el.scrollTop = index * ROW;
    setLive(index);
  }, [index, items.length]);

  useEffect(() => () => window.clearTimeout(settle.current), []);

  function handleScroll() {
    const el = ref.current;
    if (!el) return;
    const i = Math.min(items.length - 1, Math.max(0, Math.round(el.scrollTop / ROW)));
    setLive(i);
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      if (i !== index) onChange(i);
    }, 120);
  }

  function go(i: number) {
    const next = Math.min(items.length - 1, Math.max(0, i));
    ref.current?.scrollTo({ top: next * ROW, behavior: "smooth" });
  }

  return (
    <div style={{ position: "relative", width: "76px", height: `${ROW * 3}px` }}>
      {/* Cadre de la valeur choisie, derrière les lignes */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: `${ROW + 4}px`,
          height: `${ROW - 8}px`,
          borderRadius: "16px",
          border: "1px solid #E9EAEB",
          background: "#FFFFFF",
          boxShadow: "0px 1px 2px 0px rgba(16,24,40,0.05)",
        }}
      />
      <div
        ref={ref}
        role="listbox"
        aria-label={label}
        aria-activedescendant={`${label}-${live}`}
        tabIndex={0}
        onScroll={handleScroll}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            go(live + 1);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            go(live - 1);
          }
        }}
        style={{
          position: "relative",
          height: "100%",
          overflowY: "auto",
          scrollSnapType: "y mandatory",
          scrollbarWidth: "none",
          padding: `${ROW}px 0`,
          boxSizing: "border-box",
          outline: "none",
        }}
      >
        {items.map((item, i) => (
          <div
            key={item}
            id={`${label}-${i}`}
            role="option"
            aria-selected={i === live}
            onClick={() => go(i)}
            style={{
              height: `${ROW}px`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              scrollSnapAlign: "center",
              cursor: "pointer",
              fontFamily: "Inter, sans-serif",
              fontSize: "14px",
              fontWeight: i === live ? 500 : 400,
              color: i === live ? "#07320D" : "#A4A7AE",
              transition: "color 150ms ease",
              userSelect: "none",
            }}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function QuizAgePage() {
  const router = useRouter();
  const [date, setDate] = useState(DEFAULT);
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const { saved, save, saving, error } = useOnboardingStep();

  // Reprise d'un onboarding interrompu : on retrouve la date déjà enregistrée.
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current || !saved?.birth_date) return;
    const [annee, mois, jour] = saved.birth_date.slice(0, 10).split("-").map(Number);
    if (ANNEES.includes(annee)) {
      restored.current = true;
      setDate({ jour, mois, annee });
    }
  }, [saved]);

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const jours = Array.from({ length: daysIn(date.annee, date.mois) }, (_, i) => pad(i + 1));

  // Changer de mois ou d'année ramène le jour dans le mois (31 → 30 en avril, 29 → 28 en février).
  const update = (next: Partial<typeof DEFAULT>) =>
    setDate((d) => {
      const merged = { ...d, ...next };
      return { ...merged, jour: Math.min(merged.jour, daysIn(merged.annee, merged.mois)) };
    });

  async function handleContinuer() {
    const dateNaissance = `${date.annee}-${pad(date.mois)}-${pad(date.jour)}`;
    if (saving || !(await save({ dateNaissance }))) return;
    setLeaving(true);
    setTimeout(() => router.push("/quiz2"), 700);
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
            Tu as quel âge&nbsp;?
          </p>
        </div>

        {/* Sablier */}
        <div
          className="pointer-events-none"
          style={{ width: "201px", height: "201px", margin: "8px auto 0", flexShrink: 0 }}
        >
          <img src="/hourgalsse.png" alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>

        {/* Date de naissance + bouton */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "14px" }}>
          <p style={{ fontSize: "14px", color: "#4A6E4F", margin: 0 }}>
            Ta peau ne demande pas la même chose à 25 et à 45 ans.
          </p>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <Wheel label="Jour" items={jours} index={date.jour - 1} onChange={(i) => update({ jour: i + 1 })} />
            <Wheel label="Mois" items={MOIS} index={date.mois - 1} onChange={(i) => update({ mois: i + 1 })} />
            <Wheel
              label="Année"
              items={ANNEES.map(String)}
              index={Math.max(0, ANNEES.indexOf(date.annee))}
              onChange={(i) => update({ annee: ANNEES[i] })}
            />
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

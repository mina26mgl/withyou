"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const blurLayers = [12, 8, 4, 2] as const;

const iconStyle: React.CSSProperties = {
  display: "block",
  width: 20,
  height: 20,
  flexShrink: 0,
};

const gridChoices = [
  {
    id: "eclat",
    label: "Je veux plus d'éclat",
    icon: (
      <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="#1A4F21" strokeWidth="1.39" strokeLinecap="round">
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
    id: "acne",
    label: "Boutons et acné",
    icon: (
      <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="#1A4F21" strokeWidth="1.39" strokeLinecap="round">
        <circle cx="12" cy="12" r="9" />
        <circle cx="9" cy="10" r="1" fill="#1A4F21" />
        <circle cx="15" cy="10" r="1" fill="#1A4F21" />
        <circle cx="10" cy="8" r="0.6" fill="#1A4F21" />
        <circle cx="14" cy="14" r="0.6" fill="#1A4F21" />
        <path d="M9 15.5c1-1 5-1 6 0" />
      </svg>
    ),
  },
  {
    id: "taches",
    label: "Taches foncées ou teint irrégulier",
    icon: (
      <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="#1A4F21" strokeWidth="1.39" strokeLinecap="round">
        <rect x="3" y="3" width="4" height="4" rx="1" />
        <rect x="10" y="3" width="4" height="4" rx="1" />
        <rect x="17" y="3" width="4" height="4" rx="1" />
        <rect x="3" y="10" width="4" height="4" rx="1" />
        <rect x="10" y="10" width="4" height="4" rx="1" />
        <rect x="17" y="10" width="4" height="4" rx="1" />
        <rect x="3" y="17" width="4" height="4" rx="1" />
        <rect x="10" y="17" width="4" height="4" rx="1" />
        <rect x="17" y="17" width="4" height="4" rx="1" />
      </svg>
    ),
  },
  {
    id: "secheresse",
    label: "Sécheresse, ma peau a besoin d'hydratation",
    icon: (
      <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="#1A4F21" strokeWidth="1.39" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2C12 2 7 9 7 14a5 5 0 0010 0c0-5-5-12-5-12z" />
        <path d="M9.5 16c.8 1 3 1.5 5 .5" />
      </svg>
    ),
  },
];

export default function Quiz2Page() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleContinuer() {
    setLeaving(true);
    setTimeout(() => router.push("/quiz3"), 700);
  }

  const cardStyle = (id: string): React.CSSProperties => ({
    height: "81px",
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
        <p style={{ fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: "32px", lineHeight: "105%", letterSpacing: "-0.04%", color: "#07320D" }}>
          Que voulez-vous vraiment changer&nbsp;?
        </p>
      </div>

      {/* Trois objets */}
      <div className="absolute pointer-events-none" style={{ top: "60px", left: "-150px", width: "730px", height: "410px", mixBlendMode: "multiply" }}>
        <img src="/trois_objet.png" alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      </div>

      {/* Choix + bouton */}
      <div className="absolute" style={{ top: "366px", left: "16px", width: "361px", display: "flex", flexDirection: "column", gap: "14px" }}>

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

        {/* 5e choix — pleine largeur */}
        <button onClick={() => toggle("sais-pas")} style={{
          ...cardStyle("sais-pas"),
          height: "56px",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "flex-start",
          gap: "10px",
          width: "100%",
        }}>
          <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="#1A4F21" strokeWidth="1.39" strokeLinecap="round">
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="12" cy="12" r="1" fill="#1A4F21" />
          </svg>
          <span style={labelStyle}>Je ne sais pas encore, aidez-moi à découvrir</span>
        </button>

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
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/layout/BottomNav";

const blurLayers = [12, 8, 4, 2] as const;

function stampPath(W: number, H: number, r: number, nt = 7, nr = 9): string {
  const gx = W / nt;
  const gy = H / nr;
  const d: string[] = ["M 0 0"];
  for (let i = 0; i < nt; i++) {
    const cx = (i + 0.5) * gx;
    d.push(`L ${cx - r} 0 A ${r} ${r} 0 0 0 ${cx + r} 0`);
  }
  d.push(`L ${W} 0`);
  for (let i = 0; i < nr; i++) {
    const cy = (i + 0.5) * gy;
    d.push(`L ${W} ${cy - r} A ${r} ${r} 0 0 0 ${W} ${cy + r}`);
  }
  d.push(`L ${W} ${H}`);
  for (let i = nt - 1; i >= 0; i--) {
    const cx = (i + 0.5) * gx;
    d.push(`L ${cx + r} ${H} A ${r} ${r} 0 0 0 ${cx - r} ${H}`);
  }
  d.push(`L 0 ${H}`);
  for (let i = nr - 1; i >= 0; i--) {
    const cy = (i + 0.5) * gy;
    d.push(`L 0 ${cy + r} A ${r} ${r} 0 0 0 0 ${cy - r}`);
  }
  return d.join(" ") + " Z";
}

interface StampProps {
  uid: string;
  src: string;
  W: number; H: number;
  ix: number; iy: number; iw: number; ih: number;
  top: number; left: number;
  angle?: number;
  r?: number;
  shadow?: string;
}

function Stamp({ uid, src, W, H, ix, iy, iw, ih, top, left, angle = 0, r = 5, shadow }: StampProps) {
  const shape = stampPath(W, H, r);
  const imgId = `ic-${uid}`;

  return (
    <div
      className="absolute"
      style={{
        top: 0, left: 0, width: W, height: H,
        transform: `translate(${left}px, ${top}px) rotate(${angle}deg)`,
        transformOrigin: "50% 50%",
        filter: shadow,
        transition: "transform 0.65s cubic-bezier(0.4,0,0.2,1)",
        willChange: "transform",
      }}
    >
      <svg
        width={W} height={H}
        viewBox={`0 0 ${W} ${H}`}
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: "block", overflow: "visible" }}
      >
        <defs>
          <clipPath id={imgId}>
            <rect x={ix} y={iy} width={iw} height={ih} rx={3} ry={3} />
          </clipPath>
        </defs>
        <path d={shape} fill="white" />
        <image href={src} x={ix} y={iy} width={iw} height={ih}
          preserveAspectRatio="xMidYMid slice" clipPath={`url(#${imgId})`} />
        <rect x={ix} y={iy} width={iw} height={ih} rx={3} ry={3}
          fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={1} />
      </svg>
    </div>
  );
}

type Step = 0 | 1 | 2;

export default function ScanPage() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<Step>(0);
  const [displayStep, setDisplayStep] = useState<Step>(0);
  const [contentIn, setContentIn] = useState(true);

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const shadowSm   = "drop-shadow(0 1px 1px rgba(0,0,0,0.08)) drop-shadow(0 2px 4px rgba(0,0,0,0.06))";
  const shadowMd   = "drop-shadow(0 1px 2px rgba(0,0,0,0.09)) drop-shadow(0 3px 6px rgba(0,0,0,0.07))";
  const shadowLg   = "drop-shadow(0 2px 3px rgba(0,0,0,0.10)) drop-shadow(0 4px 10px rgba(0,0,0,0.08))";
  const shadow2Sm  = "drop-shadow(0 0.44px 0.44px rgba(0,0,0,0.06)) drop-shadow(0.44px 0.89px 1.33px rgba(0,0,0,0.05)) drop-shadow(1.33px 2.22px 1.33px rgba(0,0,0,0.03))";
  const shadow2Vs  = "drop-shadow(0 0.82px 0.82px rgba(0,0,0,0.06)) drop-shadow(0.82px 1.65px 2.47px rgba(0,0,0,0.05)) drop-shadow(2.47px 4.11px 2.47px rgba(0,0,0,0.03))";

  // Full per-step stamp config
  const CONFIGS = {
    0: {
      jg: { top: 186, left: 28,  angle: 0,      W: 80,  H: 102, ix: 9,  iy: 10, iw: 62,  ih: 78,  r: 4,   src: "/joue.png",    shadow: shadowSm },
      mt: { top: 176, left: 91,  angle: 0,      W: 90,  H: 114, ix: 10, iy: 11, iw: 70,  ih: 88,  r: 4.5, src: "/menton.png",  shadow: shadowMd },
      jd: { top: 186, left: 282, angle: 0,      W: 80,  H: 102, ix: 9,  iy: 10, iw: 62,  ih: 78,  r: 4,   src: "/joue_2.png",  shadow: shadowSm },
      nz: { top: 176, left: 220, angle: 0,      W: 90,  H: 114, ix: 10, iy: 11, iw: 70,  ih: 88,  r: 4.5, src: "/nose.png",    shadow: shadowMd },
      vs: { top: 133, left: 125, angle: 0,      W: 142, H: 180, ix: 17, iy: 17, iw: 108, ih: 141, r: 7,   src: "/visage.png",  shadow: shadowLg },
    },
    1: {
      jg: { top: 210, left: -20, angle: -13.06, W: 80,  H: 102, ix: 9,  iy: 10, iw: 62,  ih: 78,  r: 4,   src: "/joue.png",    shadow: shadowSm },
      mt: { top: 41,  left: -18, angle:  15.26, W: 90,  H: 114, ix: 10, iy: 11, iw: 70,  ih: 88,  r: 4.5, src: "/menton.png",  shadow: shadowMd },
      jd: { top: 62,  left: 319, angle:  -6.31, W: 80,  H: 102, ix: 9,  iy: 10, iw: 62,  ih: 78,  r: 4,   src: "/joue_2.png",  shadow: shadowSm },
      nz: { top: 228, left: 311, angle:  21.55, W: 90,  H: 114, ix: 10, iy: 11, iw: 70,  ih: 88,  r: 4.5, src: "/nose.png",    shadow: shadowMd },
      vs: { top: 133, left: 125, angle: 0,      W: 142, H: 180, ix: 17, iy: 17, iw: 108, ih: 141, r: 7,   src: "/visage.png",  shadow: shadowLg },
    },
    2: {
      jg: { top: 251, left: 44,  angle: 0, W: 70,  H: 89,  ix: 8,  iy: 9,  iw: 54, ih: 68, r: 3.5, src: "/scan1.png",   shadow: shadow2Sm },
      mt: { top: 251, left: 122, angle: 0, W: 70,  H: 89,  ix: 8,  iy: 9,  iw: 54, ih: 68, r: 3.5, src: "/scan2.png",   shadow: shadow2Sm },
      jd: { top: 251, left: 200, angle: 0, W: 70,  H: 89,  ix: 8,  iy: 9,  iw: 54, ih: 68, r: 3.5, src: "/scan3.png",   shadow: shadow2Sm },
      nz: { top: 251, left: 278, angle: 0, W: 70,  H: 89,  ix: 8,  iy: 9,  iw: 54, ih: 68, r: 3.5, src: "/scan4.png",   shadow: shadow2Sm },
      vs: { top: 70,  left: 131, angle: 0, W: 130, H: 165, ix: 16, iy: 16, iw: 99, ih: 129, r: 6.5, src: "/visage.png",  shadow: shadow2Vs },
    },
  } as const;

  const cfg = CONFIGS[step];

  function handleContinue() {
    if (step < 2) {
      const next = (step + 1) as Step;
      setStep(next);
      setContentIn(false);
      setTimeout(() => {
        setDisplayStep(next);
        setContentIn(true);
      }, 320);
    } else {
      router.push("/camera");
    }
  }

  // Small-stamp positions in step 2 for badge overlay
  const step2SmallStamps = [
    { left: 44 }, { left: 122 }, { left: 200 }, { left: 278 },
  ];

  return (
    <div
      className="relative w-full max-w-[430px] mx-auto bg-[#FCFFFD] overflow-hidden flex flex-col"
      style={{ height: "100dvh", opacity: visible ? 1 : 0, transition: "opacity 700ms ease" }}
    >
      <BottomNav />

      {/* ── Nuage ── */}
      <div className="absolute top-0 pointer-events-none" style={{ left: -209, width: 851, height: 250 }}>
        <img src="/nuage_inscription.png" alt=""
          style={{ width: 851, height: 250, objectFit: "cover", display: "block" }} />
        <div className="absolute inset-0" style={{ background: "rgba(255,255,255,0.50)" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(252,255,253,0) 40%,#FCFFFD 100%)" }} />
      </div>

      {/* ── Top blur ── */}
      <div className="absolute top-0 left-0 right-0 pointer-events-none z-10" style={{ height: 65 }}>
        {blurLayers.map((blur, i) => (
          <div key={blur} className="absolute inset-0" style={{
            backdropFilter: `blur(${blur}px)`,
            WebkitBackdropFilter: `blur(${blur}px)`,
            opacity: 0.5,
            maskImage: `linear-gradient(to bottom,black 0%,transparent ${100 - i * 22}%)`,
            WebkitMaskImage: `linear-gradient(to bottom,black 0%,transparent ${100 - i * 22}%)`,
          }} />
        ))}
      </div>

      {/* ── Scrollable content ── */}
      <div
        className="relative z-20 flex flex-col flex-1 overflow-y-auto"
        style={{ scrollbarWidth: "none", padding: "0 16px 16px 16px" }}
      >

        {/* ── Stamps zone ── */}
        <div className="relative w-full" style={{ height: step === 2 ? 360 : 320, flexShrink: 0, top: "-20px" }}>

          {/* ── Stamps ── */}
          <Stamp uid="jg" {...cfg.jg} />
          <Stamp uid="mt" {...cfg.mt} />
          <Stamp uid="jd" {...cfg.jd} />
          <Stamp uid="nz" {...cfg.nz} />
          <Stamp uid="vs" {...cfg.vs} />

          {/* ── Badges step 2 ── */}
          {/* Green checkmark on Visage */}
          <img
            src="/check.png"
            alt=""
            className="absolute pointer-events-none"
            style={{ top: 61, left: 114, width: 33, height: 25, zIndex: 60, opacity: step === 2 ? 1 : 0, transition: "opacity 0.3s ease 0.35s" }}
          />

          {/* Red X on each small stamp */}
          {step2SmallStamps.map((s, i) => (
            <img
              key={i}
              src="/false.png"
              alt=""
              className="absolute pointer-events-none"
              style={{ top: 243, left: s.left -4, width: 15, height: 15, zIndex: 60, opacity: step === 2 ? 1 : 0, transition: `opacity 0.3s ease ${0.35 + i * 0.05}s` }}
            />
          ))}

          {/* ── Labels gauche — visibles seulement step 0 ── */}
          <div className="absolute pointer-events-none" style={{ top: 268, left: 60,  width: 130, textAlign: "right", fontFamily: "'EB Garamond'", fontWeight: 600, fontSize: 15, color: "white", zIndex: 50, opacity: step === 0 ? 1 : 0, transition: "opacity 0.25s ease" }}>Visage</div>
          <div className="absolute pointer-events-none" style={{ top: 256, left: 50,  width: 90,  textAlign: "right", fontFamily: "'EB Garamond'", fontWeight: 600, fontSize: 10, color: "white", zIndex: 30, opacity: step === 0 ? 1 : 0, transition: "opacity 0.25s ease" }}>Menton</div>
          <div className="absolute pointer-events-none" style={{ top: 255, left: 32,  width: 30,  textAlign: "right", fontFamily: "'EB Garamond'", fontWeight: 600, fontSize: 10, color: "white", zIndex: 50, opacity: step === 0 ? 1 : 0, transition: "opacity 0.25s ease" }}>Joues</div>
          <div className="absolute pointer-events-none" style={{ top: 256, left: 276, fontFamily: "'EB Garamond'", fontWeight: 600, fontSize: 10, color: "white", zIndex: 50, opacity: step === 0 ? 1 : 0, transition: "opacity 0.25s ease" }}>Nez</div>
          <div className="absolute pointer-events-none" style={{ top: 255, left: 329, fontFamily: "'EB Garamond'", fontWeight: 600, fontSize: 10, color: "white", zIndex: 50, opacity: step === 0 ? 1 : 0, transition: "opacity 0.25s ease" }}>Joues</div>

        </div>

        {/* ── Animated content area ── */}
        <div style={{ opacity: contentIn ? 1 : 0, transition: "opacity 0.28s ease" }}>

          {displayStep === 0 && (
            <>
              <div className="flex flex-col gap-3 pt-2 text-center">
                <h1 className="m-0" style={{ fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: 32, lineHeight: "110%", letterSpacing: "-0.03em", color: "rgba(7,50,13,1)" }}>
                  Analysons votre peau avec notre scanner facial IA
                </h1>
                <p className="m-0" style={{ fontFamily: "Inter, sans-serif", fontWeight: 400, fontSize: 14, lineHeight: "22px", letterSpacing: "-0.03em", color: "rgba(101,122,104,1)" }}>
                  Scanner votre visage nous aide à recommander les produits parfaits, adaptés spécialement pour vous.
                </p>
              </div>

              <div className="flex flex-col mt-5" style={{ width: 361, minHeight: 109, borderRadius: 16, border: "1px solid rgba(234,236,240,1)", padding: 16, background: "rgba(255,255,255,1)", gap: 16, boxShadow: "1px 1px 2px 0px rgba(0,0,0,0.02), 3px 3px 4px 0px rgba(0,0,0,0.02), 6px 6px 5px 0px rgba(0,0,0,0.01), 11px 11px 6px 0px rgba(0,0,0,0), 17px 18px 7px 0px rgba(0,0,0,0)" }}>
                <div className="flex items-start gap-3">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                    <circle cx="10" cy="10" r="8" stroke="#07320D" strokeWidth="1.3" />
                    <circle cx="10" cy="7" r="1" fill="#07320D" />
                    <line x1="10" y1="10" x2="10" y2="14" stroke="#07320D" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "rgba(3,26,6,1)", lineHeight: "20px" }}>
                    Cela ne sera pas utilisé comme votre photo de profil.
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                    <rect x="5" y="9" width="10" height="8" rx="2" stroke="#07320D" strokeWidth="1.3" />
                    <path d="M7 9V6.5a3 3 0 0 1 6 0V9" stroke="#07320D" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "rgba(3,26,6,1)", lineHeight: "20px" }}>
                    Votre photo est utilisée en toute sécurité uniquement pour le scan facial.
                  </span>
                </div>
              </div>
            </>
          )}

          {displayStep === 1 && (
            <div className="flex flex-col gap-3 pt-2 text-center">
              <h1 className="m-0" style={{ fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: 32, lineHeight: "110%", letterSpacing: "-0.03em", color: "rgba(7,50,13,1)" }}>
                Votre vie privée est essentielle pour nous
              </h1>
              <p className="m-0" style={{ fontFamily: "Inter, sans-serif", fontWeight: 400, fontSize: 14, lineHeight: "22px", letterSpacing: "-0.03em", color: "rgba(101,122,104,1)" }}>
                Votre image est uniquement utilisée pour analyser et scanner votre peau, jamais vendue, partagée ou utilisée autrement.
              </p>
            </div>
          )}

          {displayStep === 2 && (
            <div className="flex flex-col gap-3 pt-2 text-center">
              <h1 className="m-0" style={{ fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: 32, lineHeight: "110%", letterSpacing: "-0.03em", color: "rgba(7,50,13,1)" }}>
                Assurez-vous de prendre une photo comme montré
              </h1>
              <p className="m-0" style={{ fontFamily: "Inter, sans-serif", fontWeight: 400, fontSize: 14, lineHeight: "22px", letterSpacing: "-0.03em", color: "rgba(101,122,104,1)" }}>
                Cela nous aidera à voir clairement les angles de votre visage.
              </p>
            </div>
          )}

        </div>

      </div>

      {/* ── Button bar — fixe en bas, hors du scroll ── */}
      <div
        className="relative z-30 flex-shrink-0"
        style={{ padding: "12px 16px 88px 16px", background: "rgba(252,255,253,0.92)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}
      >
        <button
          onClick={handleContinue}
          className="flex items-center justify-center gap-2 w-full cursor-pointer"
          style={{ height: 52, borderRadius: 100, border: "none", background: "rgba(7,50,13,1)", fontFamily: "Inter, sans-serif", fontWeight: 500, fontSize: 16, color: "#FFFFFF", letterSpacing: "-0.02em" }}
        >
          {displayStep === 2 ? "Ouvrir la caméra" : "Continuer"}
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M4 10h12M11 5l5 5-5 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

    </div>
  );
}

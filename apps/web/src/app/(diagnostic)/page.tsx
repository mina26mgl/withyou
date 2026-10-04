"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { fetchMe } from "@/lib/homePath";

/**
 * Scène dessinée pour un écran de 430 × 780 : bras, texte et bouton y gardent leurs
 * positions relatives, et la scène entière est réduite pour tenir dans l'écran
 * (petits téléphones), puis centrée (grands téléphones, tablettes).
 */
const STAGE_W = 430;
const STAGE_H = 780;
/** Décalage du bras du bas par rapport à la maquette d'origine (positif : plus bas). */
const BOTTOM_ARM_OFFSET = 20;

/**
 * Sur un écran plus haut que la scène, les bras sont allongés depuis la main
 * (qui ne bouge pas) jusqu'au bord de l'écran, au lieu de s'arrêter dans le vide.
 * Points en coordonnées de la scène : main du haut, extrémité de l'épaule,
 * bout des doigts du bas, extrémité de la manche.
 */
const TOP_HAND = { x: 225, y: 205 };
const TOP_ARM_END = -31;
const BOTTOM_HAND = { x: 200, y: 530 + BOTTOM_ARM_OFFSET - 20 };
const BOTTOM_ARM_END = 772 + BOTTOM_ARM_OFFSET - 20;

function useStageScale() {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number | null>(null);
  /** Espace libre au-dessus et en dessous de la scène, en unités de la scène. */
  const [extra, setExtra] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const s = Math.min(1, el.clientWidth / STAGE_W, el.clientHeight / STAGE_H);
      setScale(s);
      setExtra(Math.max(0, (el.clientHeight / s - STAGE_H) / 2));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Facteurs d'allongement : l'extrémité de chaque bras rejoint le bord de l'écran.
  const topStretch = Math.max(1, (TOP_HAND.y + extra) / (TOP_HAND.y - TOP_ARM_END));
  const bottomStretch = Math.max(1, (STAGE_H + extra - BOTTOM_HAND.y) / (BOTTOM_ARM_END - BOTTOM_HAND.y));

  return { ref, scale, topStretch, bottomStretch };
}

export default function WelcomePage() {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const stage = useStageScale();
  const { isLoaded, isSignedIn, getToken } = useAuth();

  // Onboarding déjà rempli : la cliente va directement à l'accueil.
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    void (async () => {
      try {
        const me = await fetchMe(await getToken());
        if (me.consomateur?.onboarding_done) router.replace("/home");
      } catch (err) {
        console.error("Profil cliente indisponible:", err);
      }
    })();
  }, [isLoaded, isSignedIn, getToken, router]);

  function handleContinuer() {
    setLeaving(true);
    setTimeout(() => router.push("/onboarding"), 500);
  }

  return (
    // Fond pleine largeur (le ciel couvre aussi les tablettes), colonne de 430px au milieu.
    <div className="relative w-full overflow-hidden bg-[#FCFFFD]" style={{ height: "100dvh" }}>
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

      <div ref={stage.ref} className="relative w-full max-w-[430px] mx-auto h-full">
        {/* Scène : bras, texte et bouton, centrés et mis à l'échelle de l'écran */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: "50%",
            top: "50%",
            width: `${STAGE_W}px`,
            height: `${STAGE_H}px`,
            transform: `translate(-50%, -50%) scale(${stage.scale ?? 1})`,
            visibility: stage.scale === null ? "hidden" : "visible",
          }}
        >
          {/* Bras du haut, allongé depuis la main sur les grands écrans */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ transform: `scale(${stage.topStretch})`, transformOrigin: `${TOP_HAND.x}px ${TOP_HAND.y}px` }}
          >
            <div
              className="absolute pointer-events-none"
              style={{
                top: "50px",
                left: "100.77px",
                width: "241px",
                height: "79px",
                transform: "rotate(90deg)",
                transformOrigin: "center",
              }}
            >
              {/* L'épaule, coupée au bord de l'image, s'estompe */}
              <img
                src="/bras_inscription.png"
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  maskImage: "linear-gradient(to right, transparent 0%, black 30%)",
                  WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 30%)",
                }}
              />
            </div>
          </div>

          {/* Bras du bas, allongé depuis la main sur les grands écrans */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              transform: `scale(${stage.bottomStretch})`,
              transformOrigin: `${BOTTOM_HAND.x}px ${BOTTOM_HAND.y}px`,
            }}
          >
            <div
              className="absolute pointer-events-none"
              style={{
                top: `${350 + BOTTOM_ARM_OFFSET}px`,
                left: "-60px",
                width: "520px",
                height: "285px",
                transform: "rotate(90deg)",
                transformOrigin: "center",
              }}
            >
              {/* La manche, coupée au bord de l'image, s'estompe */}
              <img
                src="/bras_bas_inscription.png"
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  maskImage: "linear-gradient(to right, black 75%, transparent 100%)",
                  WebkitMaskImage: "linear-gradient(to right, black 75%, transparent 100%)",
                }}
              />
            </div>
          </div>

          {/* Contenu — texte + bouton */}
          <div
            className="absolute flex flex-col items-center pointer-events-auto"
            style={{ top: "316.5px", left: "34.5px", width: "361px", height: "139px", gap: "16px" }}
          >
            <p
              className="text-center text-[#07320D]"
              style={{
                fontFamily: "var(--font-averia), serif",
                fontWeight: 700,
                fontSize: "26px",
                lineHeight: "100%",
                letterSpacing: "-0.06%",
              }}
            >
              Avant de vous montrer les produits, nous voulons d&apos;abord vous connaître.
            </p>

            <button
              onClick={handleContinuer}
              style={{
                width: "114px",
                height: "36px",
                borderRadius: "16px",
                padding: "8px 20px",
                gap: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                  "linear-gradient(#1C3D2E, #1C3D2E) padding-box, linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 100%) border-box",
                border: "2px solid transparent",
                boxShadow:
                  "0px 1px 2px 0px rgba(16,24,40,0.05), 0px -2px 0px 0px rgba(255,255,255,0.08) inset, 0px 0px 0px 1px rgba(255,255,255,0.06) inset",
                color: "#FFFFFF",
                fontWeight: 400,
                fontSize: "14px",
                lineHeight: "20px",
                letterSpacing: "0%",
                cursor: "pointer",
              }}
            >
              Continuer <span style={{ fontSize: "16px", marginLeft: "2px" }}>›</span>
            </button>
          </div>
        </div>

        {/* Flou haut — progressif 12px → 0 */}
        <div className="absolute top-0 left-0 right-0 pointer-events-none z-10" style={{ height: "65px" }}>
          {([12, 8, 4, 2] as const).map((blur, i) => (
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

        {/* Flou bas — progressif 12px → 0 */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none z-10" style={{ height: "120px" }}>
          {([12, 8, 4, 2] as const).map((blur, i) => (
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

        {/* Overlay fondu-blanc sortie : tout l'écran, côtés de la tablette compris */}
        <div
          className="fixed inset-0 pointer-events-none z-50"
          style={{
            background: "#FCFFFD",
            opacity: leaving ? 1 : 0,
            transition: "opacity 500ms ease",
          }}
        />
      </div>
    </div>
  );
}

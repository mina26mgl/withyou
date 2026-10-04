"use client";

import { useEffect, useState } from "react";

/** Largeur de l'écran à l'intérieur du cadre (330 − 2 × 3 titane − 2 × 9 bordure noire). */
export const PHONE_SCREEN_WIDTH = 306;
/** Proportions d'un iPhone 15 (393 × 852 points). */
const SCREEN_HEIGHT = Math.round((PHONE_SCREEN_WIDTH * 852) / 393);

const TITANIUM = "linear-gradient(145deg, #E3E3E8 0%, #A1A1A8 22%, #D4D4DA 50%, #8C8C93 78%, #DCDCE1 100%)";

function SideButton({ side, top, height }: { side: "left" | "right"; top: number; height: number }) {
  return (
    <span
      aria-hidden="true"
      className="absolute w-[3px]"
      style={{
        top,
        height,
        [side]: -2,
        background: TITANIUM,
        borderRadius: side === "left" ? "2px 0 0 2px" : "0 2px 2px 0",
      }}
    />
  );
}

function StatusBar({ background }: { background: string }) {
  return (
    <div
      className="sticky top-0 z-10 flex h-[46px] items-center justify-between px-[26px] pt-[6px] text-black"
      style={{ background }}
    >
      <span className="w-[54px] text-center text-[14.5px] font-semibold tracking-tight">9:41</span>
      <span className="flex items-center gap-[5px]">
        {/* Réseau */}
        <svg width="17" height="11" viewBox="0 0 17 11" aria-hidden="true">
          <rect x="0" y="7" width="3" height="4" rx="1" fill="currentColor" />
          <rect x="4.5" y="5" width="3" height="6" rx="1" fill="currentColor" />
          <rect x="9" y="2.5" width="3" height="8.5" rx="1" fill="currentColor" />
          <rect x="13.5" y="0" width="3" height="11" rx="1" fill="currentColor" />
        </svg>
        {/* Wi-Fi */}
        <svg width="15" height="11" viewBox="0 0 15 11" aria-hidden="true">
          <path d="M7.5 2.3c2.1 0 4 .8 5.4 2.1l1.1-1.1C12.3 1.7 10 .7 7.5.7S2.7 1.7 1 3.3l1.1 1.1c1.4-1.3 3.3-2.1 5.4-2.1Z" fill="currentColor" />
          <path d="M7.5 5.4c1.2 0 2.3.5 3.2 1.2l1.1-1.1C10.6 4.5 9.1 3.8 7.5 3.8S4.4 4.5 3.2 5.5l1.1 1.1c.9-.7 2-1.2 3.2-1.2Z" fill="currentColor" />
          <path d="M9.6 7.7 7.5 9.8 5.4 7.7c.6-.5 1.3-.8 2.1-.8s1.5.3 2.1.8Z" fill="currentColor" />
        </svg>
        {/* Batterie */}
        <svg width="25" height="12" viewBox="0 0 25 12" aria-hidden="true">
          <rect x="0.5" y="0.5" width="21" height="11" rx="3.5" fill="none" stroke="currentColor" strokeOpacity="0.4" />
          <rect x="2" y="2" width="18" height="8" rx="2" fill="currentColor" />
          <path d="M23 4v4c.8-.3 1.3-1.1 1.3-2S23.8 4.3 23 4Z" fill="currentColor" fillOpacity="0.45" />
        </svg>
      </span>
    </div>
  );
}

/**
 * Cadre iPhone pour l'aperçu : contour titane, Dynamic Island, barre d'état,
 * barre d'accueil et boutons latéraux. `screenColor` colore la zone de la
 * barre d'état, comme le fond de l'app en dessous.
 */
/** Hauteur totale du cadre (écran + bordure noire + titane). */
const FRAME_HEIGHT = SCREEN_HEIGHT + 2 * 9 + 2 * 3;
/** Espace gardé au-dessus/au-dessous (titre « Aperçu sur téléphone », marges). */
const VIEWPORT_MARGIN = 64;

/** Réduit le téléphone pour qu'il tienne en entier dans la hauteur de la fenêtre. */
function useFitScale(): number {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const update = () => setScale(Math.min(1, Math.max(0.6, (window.innerHeight - VIEWPORT_MARGIN) / FRAME_HEIGHT)));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return scale;
}

export function PhonePreview({ children, screenColor = "#FFFFFF" }: { children: React.ReactNode; screenColor?: string }) {
  const scale = useFitScale();
  return (
    <div style={{ zoom: scale }}>
      <div className="relative mx-auto w-[330px] max-w-full">
        <SideButton side="left" top={112} height={28} />
        <SideButton side="left" top={162} height={52} />
        <SideButton side="left" top={224} height={52} />
        <SideButton side="right" top={186} height={84} />

        <div
          className="rounded-[58px] p-[3px] shadow-[0_40px_70px_-35px_rgba(20,30,40,0.55),0_0_0_1px_rgba(0,0,0,0.06)]"
          style={{ background: TITANIUM }}
        >
          <div className="rounded-[55px] bg-black p-[9px]">
            <div
              className="relative overflow-hidden rounded-[46px]"
              style={{ width: PHONE_SCREEN_WIDTH, height: SCREEN_HEIGHT, background: screenColor }}
            >
              <div className="h-full overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <StatusBar background={screenColor} />
                {children}
              </div>

              {/* Dynamic Island */}
              <div className="pointer-events-none absolute left-1/2 top-[11px] z-20 h-[27px] w-[92px] -translate-x-1/2 rounded-full bg-black" />
              {/* Barre d'accueil */}
              <div className="pointer-events-none absolute bottom-[7px] left-1/2 z-20 h-[4px] w-[108px] -translate-x-1/2 rounded-full bg-black/85" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

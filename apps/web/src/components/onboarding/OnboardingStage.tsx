"use client";
import { useLayoutEffect, useRef, useState } from "react";

const blurLayers = [12, 8, 4, 2] as const;

/** Colonne de l'app : au-delà (tablette), la scène reste à cette largeur, centrée. */
const COLUMN_MAX = 430;
/** Un écran dessiné pour 393px peut grandir jusqu'à remplir la colonne de 430px. */
const MAX_SCALE = COLUMN_MAX / 393;

/**
 * Écrans de l'onboarding dessinés en positions fixes sur une maquette (393 × height) :
 * ciel et flous en pleine largeur, puis la maquette entière centrée et mise à l'échelle
 * pour tenir dans l'écran, sans que ses éléments ne bougent les uns par rapport aux autres.
 * align « bottom » : la scène s'appuie sur le bas de l'écran (personnage qui en sort).
 *
 * Mise à l'échelle par `zoom` et non `transform` : un transform isolerait la scène, et les
 * images en mix-blend-mode (fond blanc effacé sur le ciel) ne verraient plus le ciel.
 */
export default function OnboardingStage({
  width = 393,
  height,
  align = "center",
  maxScale = MAX_SCALE,
  style,
  scaleRef,
  children,
}: {
  width?: number;
  height: number;
  align?: "center" | "bottom";
  /** Agrandissement maximal (1 : jamais plus grand que la maquette). */
  maxScale?: number;
  style?: React.CSSProperties;
  /** Reçoit l'échelle de la scène : un déplacement mesuré à l'écran se divise par cette valeur. */
  scaleRef?: React.MutableRefObject<number>;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const columnWidth = Math.min(el.clientWidth, COLUMN_MAX);
      const next = Math.min(maxScale, columnWidth / width, el.clientHeight / height);
      if (scaleRef) scaleRef.current = next;
      setScale(next);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [width, height, maxScale, scaleRef]);

  const s = scale ?? 1;

  return (
    <div ref={ref} className="relative w-full overflow-hidden bg-[#FCFFFD]" style={{ height: "100dvh", ...style }}>
      {/* Nuage, sur toute la largeur (tablettes comprises) */}
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
          style={{ background: "linear-gradient(180deg, rgba(252,255,253,0) 40%, #FCFFFD 100%)" }}
        />
      </div>

      {/* Scène : boîte à la taille affichée, centrée ; la maquette y est zoomée */}
      <div
        className="absolute"
        style={{
          left: `calc(50% - ${(width * s) / 2}px)`,
          ...(align === "bottom" ? { bottom: 0 } : { top: `calc(50% - ${(height * s) / 2}px)` }),
          width: `${width * s}px`,
          height: `${height * s}px`,
          visibility: scale === null ? "hidden" : "visible",
        }}
      >
        <div style={{ position: "relative", width: `${width}px`, height: `${height}px`, zoom: s }}>{children}</div>
      </div>

      {/* Flou haut */}
      <div className="absolute top-0 left-0 right-0 pointer-events-none z-10" style={{ height: "65px" }}>
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
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none z-10" style={{ height: "120px" }}>
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
    </div>
  );
}

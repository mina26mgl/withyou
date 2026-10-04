"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const blurLayers = [12, 8, 4, 2] as const;

const TEXT = "On analyse vos réponses...";
const TEXT_SIZE = 22;
const CANVAS_H = 36;

export default function LoadingPage() {
  const router = useRouter();
  const papillonRef = useRef<HTMLVideoElement>(null);
  const gradientVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const rAF = requestAnimationFrame(() => setVisible(true));
    papillonRef.current?.play().catch(() => {});
    const navTimer = setTimeout(() => router.push("/routine"), 15000);

    const canvasEl = canvasRef.current;
    const videoEl = gradientVideoRef.current;
    const ctxOrNull = canvasEl?.getContext("2d");
    if (!canvasEl || !videoEl || !ctxOrNull) {
      return () => {
        cancelAnimationFrame(rAF);
        clearTimeout(navTimer);
      };
    }
    const c: HTMLCanvasElement = canvasEl;
    const v: HTMLVideoElement = videoEl;
    const ctx: CanvasRenderingContext2D = ctxOrNull;

    // La police est chargée par next/font sous un nom généré : on la lit dans la variable CSS.
    const family =
      getComputedStyle(document.documentElement).getPropertyValue("--font-playfair").trim() || "Georgia, serif";

    // Le canvas prend la largeur de sa colonne ; netteté Retina via devicePixelRatio.
    let cssW = 0;
    function resize() {
      const dpr = window.devicePixelRatio || 1;
      cssW = c.parentElement?.clientWidth ?? 382;
      c.width = cssW * dpr;
      c.height = CANVAS_H * dpr;
      c.style.width = `${cssW}px`;
      c.style.height = `${CANVAS_H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    const observer = new ResizeObserver(resize);
    if (c.parentElement) observer.observe(c.parentElement);

    let drawId = 0;
    function draw() {
      ctx.clearRect(0, 0, cssW, CANVAS_H);

      if (v.readyState >= 2) {
        // Étire la vidéo sur tout le canvas → tout le gradient visible dans le texte
        ctx.globalCompositeOperation = "source-over";
        ctx.drawImage(v, 0, 0, cssW, CANVAS_H);

        // Voile clair rgba(255,255,255,0.38) par-dessus la vidéo
        ctx.fillStyle = "rgba(255,255,255,0.38)";
        ctx.fillRect(0, 0, cssW, CANVAS_H);

        // destination-in : couleurs vidéo visibles uniquement dans la forme des lettres,
        // texte centré et réduit s'il ne tient pas sur un petit écran.
        ctx.globalCompositeOperation = "destination-in";
        ctx.font = `600 ${TEXT_SIZE}px ${family}`;
        const fit = Math.min(TEXT_SIZE, (TEXT_SIZE * (cssW - 8)) / ctx.measureText(TEXT).width);
        ctx.font = `600 ${fit}px ${family}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#000";
        ctx.fillText(TEXT, cssW / 2, CANVAS_H / 2);
      }

      drawId = requestAnimationFrame(draw);
    }

    document.fonts.ready.then(() => {
      v.play().catch(() => {});
      draw();
    });

    return () => {
      cancelAnimationFrame(rAF);
      clearTimeout(navTimer);
      cancelAnimationFrame(drawId);
      observer.disconnect();
    };
  }, [router]);

  return (
    // Fond pleine largeur (ciel, prairie et flous couvrent aussi les tablettes) ;
    // texte et papillon dans une colonne de 430px, au milieu de l'écran.
    <div
      className="relative w-full overflow-hidden bg-[#FCFFFD]"
      style={{ height: "100dvh", opacity: visible ? 1 : 0, transition: "opacity 600ms ease" }}
    >
      {/* Nuage */}
      <div
        className="absolute top-0 pointer-events-none"
        style={{ left: "50%", transform: "translateX(-50%)", width: "max(100%, 851px)", height: "316px" }}
      >
        <img
          src="/nuage_inscription.png"
          alt=""
          style={{ width: "100%", height: "316px", objectFit: "cover", display: "block" }}
        />
        <div className="absolute inset-0" style={{ background: "rgba(255,255,255,0.50)" }} />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(252,255,253,0) 40%, #FCFFFD 76%)" }}
        />
      </div>

      {/* Image background en bas — centrée, au moins aussi large que la maquette */}
      <div
        className="absolute bottom-0 pointer-events-none"
        style={{
          left: "50%",
          transform: "translateX(-50%)",
          width: "max(100%, 1238px)",
          height: "min(742px, 100%)",
          overflow: "hidden",
        }}
      >
        <img
          src="/background.png"
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center center", display: "block" }}
        />
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

      {/* Vidéo gradient cachée — source pour le canvas */}
      <video ref={gradientVideoRef} src="/gradient_text_color.mp4" loop muted playsInline style={{ display: "none" }} />

      {/* Texte puis papillon, centrés dans l'écran (sans z-index : le papillon se fond dans le fond) */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
        style={{ padding: "0 24px", gap: "clamp(16px, 5dvh, 56px)" }}
      >
        {/* Canvas : texte coloré par la vidéo gradient */}
        <div style={{ width: "100%", maxWidth: "382px" }}>
          <canvas ref={canvasRef} style={{ display: "block" }} />
        </div>

        {/* Vidéo papillon — bords fondus sur les 4 côtés ; plus petite sur un écran court */}
        <div
          style={{
            width: "min(393px, 100vw)",
            height: "min(297px, 38dvh)",
            maskImage:
              "linear-gradient(to right, transparent 0%, black 22%, black 78%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent 0%, black 22%, black 78%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)",
            maskComposite: "intersect",
            WebkitMaskComposite: "destination-in",
            // Efface le fond blanc de la vidéo sur le fond de page.
            mixBlendMode: "multiply",
          }}
        >
          <video
            ref={papillonRef}
            src="/papillon.mp4"
            autoPlay
            loop
            muted
            playsInline
            style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
          />
        </div>
      </div>
    </div>
  );
}

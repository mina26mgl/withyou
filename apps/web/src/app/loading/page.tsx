"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const blurLayers = [12, 8, 4, 2] as const;

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
    if (!canvasEl || !videoEl) return () => { cancelAnimationFrame(rAF); clearTimeout(navTimer); };

    const c: HTMLCanvasElement = canvasEl;
    const v: HTMLVideoElement = videoEl;

    const ctxOrNull = c.getContext("2d");
    if (!ctxOrNull) return () => { cancelAnimationFrame(rAF); clearTimeout(navTimer); };
    const ctx: CanvasRenderingContext2D = ctxOrNull;

    // Scale par devicePixelRatio → texte net sur écrans Retina
    const dpr = window.devicePixelRatio || 1;
    const cssW = 382;
    const cssH = 36;
    c.width = cssW * dpr;
    c.height = cssH * dpr;
    c.style.width = `${cssW}px`;
    c.style.height = `${cssH}px`;
    ctx.scale(dpr, dpr);

    let drawId: number;

    function draw() {
      ctx.clearRect(0, 0, cssW, cssH);

      if (v.readyState >= 2) {
        // Étire la vidéo sur tout le canvas → tout le gradient visible dans le texte
        ctx.globalCompositeOperation = "source-over";
        ctx.drawImage(v, 0, 0, cssW, cssH);

        // Filtre sombre rgba(0,0,0,0.38) par-dessus la vidéo
        ctx.fillStyle = "rgba(255,255,255,0.38)";
        ctx.fillRect(0, 0, cssW, cssH);

        // destination-in : couleurs vidéo visibles uniquement dans la forme des lettres
        ctx.globalCompositeOperation = "destination-in";
        ctx.font = '600 22px "Playfair Display", Georgia, serif';
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#000";
        ctx.fillText("On analyse vos réponses...", 0, cssH / 2);
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
    };
  }, [router]);

  return (
    <div
      className="relative w-full max-w-[430px] mx-auto overflow-hidden bg-[#FCFFFD]"
      style={{ height: "100dvh", opacity: visible ? 1 : 0, transition: "opacity 600ms ease" }}
    >
      {/* Nuage */}
      <div className="absolute top-0 pointer-events-none" style={{ left: "-209px", width: "851px", height: "316px" }}>
        <img src="/nuage_inscription.png" alt="" style={{ width: "851px", height: "316px", objectFit: "cover", display: "block" }} />
        <div className="absolute inset-0" style={{ background: "rgba(255,255,255,0.50)" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(252,255,253,0) 40%, #FCFFFD 76%)" }} />
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

      {/* Vidéo gradient cachée — source pour le canvas */}
      <video
        ref={gradientVideoRef}
        src="/gradient_text_color.mp4"
        loop
        muted
        playsInline
        style={{ display: "none" }}
      />

      {/* Canvas : texte coloré par la vidéo gradient */}
      <canvas
        ref={canvasRef}
        className="z-[5]"
        style={{
          position: "absolute",
          top: "311px",
          left: "70px",
        }}
      />

      {/* Vidéo papillon — bords fondus sur les 4 côtés */}
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: "150px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "393px",
          height: "297px",
          maskImage: "linear-gradient(to right, transparent 0%, black 22%, black 78%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 22%, black 78%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)",
          maskComposite: "intersect",
          WebkitMaskComposite: "destination-in",
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

      {/* Image background en bas — zoomée sur le centre */}
      <div className="absolute  bottom-0   pointer-events-none" style={{ height: "742px", width: "1238px", overflow: "hidden",left: "-404px"}}>
        <img src="/background.png" alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center center", display: "block" }} />
      </div>
    </div>
  );
}

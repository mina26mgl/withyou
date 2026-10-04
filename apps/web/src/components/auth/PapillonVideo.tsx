"use client";
import { useEffect, useRef } from "react";

// Le fond de papillon.mp4 est blanc pur (255) alors que les ailes restent
// sous ~240 : on rend transparent uniquement le blanc, avec une petite rampe
// pour adoucir les contours. Contrairement à mix-blend-mode: multiply, les
// ailes restent opaques et le papillon passe vraiment devant le reste.
const KEY_FULL = 254; // à partir de là : totalement transparent
const KEY_OPAQUE = 240; // en dessous : totalement opaque

// Largeur de rendu : suffisante pour un affichage ≤ 640px, et légère à traiter.
const RENDER_W = 640;

export function PapillonVideo({ className }: { className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    const c = canvasRef.current;
    const ctx = c?.getContext("2d", { willReadFrequently: true });
    if (!v || !c || !ctx) return;

    let raf = 0;
    let stopped = false;

    const draw = () => {
      if (stopped) return;
      if (v.readyState >= 2 && v.videoWidth) {
        const h = Math.round((RENDER_W * v.videoHeight) / v.videoWidth);
        if (c.width !== RENDER_W || c.height !== h) {
          c.width = RENDER_W;
          c.height = h;
        }
        ctx.drawImage(v, 0, 0, RENDER_W, h);
        const img = ctx.getImageData(0, 0, RENDER_W, h);
        const d = img.data;
        for (let i = 0; i < d.length; i += 4) {
          const m = Math.min(d[i], d[i + 1], d[i + 2]);
          if (m >= KEY_FULL) d[i + 3] = 0;
          else if (m > KEY_OPAQUE) d[i + 3] = Math.round((255 * (KEY_FULL - m)) / (KEY_FULL - KEY_OPAQUE));
        }
        ctx.putImageData(img, 0, 0);
      }
      raf = requestAnimationFrame(draw);
    };

    v.play().catch(() => {});
    raf = requestAnimationFrame(draw);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <video ref={videoRef} src="/papillon.mp4" autoPlay loop muted playsInline aria-hidden style={{ display: "none" }} />
      <canvas ref={canvasRef} aria-hidden className={className} />
    </>
  );
}

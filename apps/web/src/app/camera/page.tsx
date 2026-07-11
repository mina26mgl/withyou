"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const TICK_COUNT = 120;

export default function CameraPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [size, setSize] = useState({ w: 390, h: 844 });
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [progress, setProgress] = useState(0); // 0 → TICK_COUNT
  const [waveTime, setWaveTime] = useState(0);
  const [complete, setComplete] = useState(false);

  // Measure real container size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Open camera
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user" }, audio: false })
      .then((stream) => {
        streamRef.current = stream;
        const vid = videoRef.current;
        if (!vid) return;
        vid.srcObject = stream;
        vid.play()
          .then(() => setCameraReady(true))
          .catch(() => setCameraReady(true)); // autoplay blocked but stream is fine
      })
      .catch(() => setCameraError(true));

    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Auto-fill progress once camera is ready
  useEffect(() => {
    if (!cameraReady || complete) return;
    const id = setInterval(() => {
      setProgress((p) => {
        const step = 0.45 + Math.random() * 0.25; // slight randomness feels natural
        const next = p + step;
        if (next >= TICK_COUNT) {
          setComplete(true);
          return TICK_COUNT;
        }
        return next;
      });
    }, 55);
    return () => clearInterval(id);
  }, [cameraReady, complete]);

  // Continuous wave animation
  useEffect(() => {
    const id = setInterval(() => setWaveTime((t) => t + 0.14), 25);
    return () => clearInterval(id);
  }, []);

  // Navigate away after scan completes
  useEffect(() => {
    if (!complete) return;
    const t = setTimeout(() => {
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
      router.push("/resultat");
    }, 1800);
    return () => clearTimeout(t);
  }, [complete, router]);

  function handleClose() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    router.back();
  }

  // ── Oval geometry ──
  const { w, h } = size;
  const CX = w / 2;
  const CY = h * 0.41;
  const RX = Math.min(w * 0.305, 128);
  const RY = RX * 1.32;
  const filledCount = Math.floor(progress);

  // Build tick marks
  const ticks = Array.from({ length: TICK_COUNT }, (_, i) => {
    const angle = (i / TICK_COUNT) * Math.PI * 2 - Math.PI / 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    // Outward normal of ellipse (unnormalized then normalized)
    const nx = cos / RX;
    const ny = sin / RY;
    const nLen = Math.sqrt(nx * nx + ny * ny);
    const nnx = nx / nLen;
    const nny = ny / nLen;

    // Point on ellipse perimeter
    const ex = CX + RX * cos;
    const ey = CY + RY * sin;

    const isFilled = i < filledCount;

    // Wave: ripple effect on filled ticks
    const waveHeight = isFilled
      ? Math.max(2, 6 + Math.sin(waveTime + i * 0.20) * 5)
      : 7;

    const gap = 3; // gap between ellipse edge and tick start
    return {
      x1: ex + nnx * gap,
      y1: ey + nny * gap,
      x2: ex + nnx * (gap + waveHeight),
      y2: ey + nny * (gap + waveHeight),
      isFilled,
    };
  });

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-[430px] mx-auto overflow-hidden bg-black"
      style={{ height: "100dvh" }}
    >
      {/* ── Live camera feed ── */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        muted
        playsInline
        style={{ transform: "scaleX(-1)" }}
      />

      {/* ── Fallback if no camera ── */}
      {cameraError && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <p style={{ color: "rgba(255,255,255,0.6)", fontFamily: "Inter, sans-serif", fontSize: 14, textAlign: "center", padding: "0 40px" }}>
            Accès à la caméra refusé. Veuillez autoriser l&apos;accès dans vos paramètres.
          </p>
        </div>
      )}

      {/* ── Overlay: dark vignette + oval hole + tick marks ── */}
      <svg
        className="absolute inset-0"
        style={{ width: "100%", height: "100%", zIndex: 2 }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <mask id="cam-hole">
            <rect width="100%" height="100%" fill="white" />
            <ellipse cx={CX} cy={CY} rx={RX} ry={RY} fill="black" />
          </mask>
        </defs>

        {/* Dark background with oval cutout */}
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.88)" mask="url(#cam-hole)" />

        {/* Tick marks around the oval */}
        {ticks.map((tk, i) => (
          <line
            key={i}
            x1={tk.x1} y1={tk.y1}
            x2={tk.x2} y2={tk.y2}
            stroke={tk.isFilled ? "#22c55e" : "rgba(255,255,255,0.22)"}
            strokeWidth={tk.isFilled ? 2.4 : 1.8}
            strokeLinecap="round"
          />
        ))}

        {/* Subtle inner oval glow when complete */}
        {complete && (
          <ellipse
            cx={CX} cy={CY} rx={RX} ry={RY}
            fill="none"
            stroke="rgba(34,197,94,0.35)"
            strokeWidth={8}
          />
        )}
      </svg>

      {/* ── Top controls ── */}
      <div
        className="absolute top-0 left-0 right-0 flex justify-between items-center z-20"
        style={{ padding: "52px 20px 0 20px" }}
      >
        <button
          style={{ width: 40, height: 40, borderRadius: 20, background: "rgba(60,60,60,0.80)", border: "none", color: "white", fontSize: 17, fontFamily: "Inter, sans-serif", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          ?
        </button>
        <button
          onClick={handleClose}
          style={{ width: 40, height: 40, borderRadius: 20, background: "rgba(60,60,60,0.80)", border: "none", color: "white", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1l12 12M13 1L1 13" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* ── Bottom instruction ── */}
      <div
        className="absolute bottom-0 left-0 right-0 flex justify-center z-20"
        style={{ padding: "0 32px 64px 32px" }}
      >
        <div
          style={{
            background: "rgba(0,0,0,0.88)",
            borderRadius: 18,
            padding: "14px 22px",
            textAlign: "center",
            maxWidth: 290,
          }}
        >
          <p
            style={{
              color: "white",
              fontSize: 20,
              fontFamily: "var(--font-playfair), Georgia, serif",
              fontWeight: 400,
              margin: 0,
              lineHeight: "101%",
              letterSpacing: "-0.04em",
              transition: "opacity 0.4s ease",
            }}
          >
            {complete
              ? "Scan terminé !"
              : "Déplacez lentement votre tête pour compléter le cercle et le scan"}
          </p>
        </div>
      </div>
    </div>
  );
}

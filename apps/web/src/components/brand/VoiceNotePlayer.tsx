"use client";

import { useEffect, useRef, useState } from "react";

const BARS = [6, 10, 8, 14, 18, 12, 16, 14, 10, 12, 8, 6, 10, 14, 9, 12, 7, 5];

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * Message vocal de la marque : lecture / pause, barres d'onde qui se remplissent
 * pendant l'écoute, et clic sur les barres pour avancer ou reculer.
 */
export function VoiceNotePlayer({ src, color }: { src: string; color: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [failed, setFailed] = useState(false);

  // Nouveau fichier (remplacé dans l'éditeur) : on repart de zéro.
  useEffect(() => {
    setPlaying(false);
    setProgress(0);
    setFailed(false);
  }, [src]);

  async function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        setFailed(true);
      }
    } else {
      audio.pause();
    }
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
  }

  const current = duration * progress;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "4px 0", minWidth: 0 }}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setProgress(0);
        }}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          if (a.duration) setProgress(a.currentTime / a.duration);
        }}
        onError={() => setFailed(true)}
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Mettre en pause le message vocal" : "Écouter le message vocal"}
        style={{ background: "none", border: "none", padding: 0, display: "flex", alignItems: "center", cursor: "pointer" }}
      >
        {playing ? (
          <svg width="18" height="20" viewBox="0 0 18 20" fill={color} aria-hidden="true">
            <rect x="3" y="2" width="4" height="16" rx="1.5" />
            <rect x="11" y="2" width="4" height="16" rx="1.5" />
          </svg>
        ) : (
          <svg width="18" height="20" viewBox="0 0 18 20" fill={color} aria-hidden="true">
            <path d="M2 2L16 10L2 18V2Z" style={{ stroke: color, strokeWidth: "2", strokeLinejoin: "round" }} />
          </svg>
        )}
      </button>
      <div
        onClick={seek}
        role="presentation"
        style={{ display: "flex", alignItems: "center", gap: "3px", height: "20px", cursor: "pointer" }}
      >
        {BARS.map((h, i) => (
          <div
            key={i}
            style={{
              width: "2.5px",
              height: `${h}px`,
              backgroundColor: color,
              borderRadius: "2px",
              opacity: (i + 0.5) / BARS.length <= progress ? 1 : 0.35,
              transition: "opacity 120ms linear",
            }}
          />
        ))}
      </div>
      <span style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color, fontVariantNumeric: "tabular-nums" }}>
        {failed ? "Lecture impossible" : formatTime(playing || progress ? current : duration)}
      </span>
    </div>
  );
}

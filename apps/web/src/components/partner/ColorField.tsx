"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Pipette } from "lucide-react";
import { hexToRgba } from "@withyou/shared-utils";

/** Teintes proposées d'un clic : tons naturels qui vont bien aux marques de soin. */
const SWATCHES = [
  "#FFFFFF", "#FAFFFB", "#FDF6EC", "#F4E4D4", "#E8D5C4", "#D9C2A7",
  "#C98F6B", "#A0522D", "#8E4B5A", "#C2667A", "#E7A6B4", "#F3D1D8",
  "#DDE8D8", "#A8C3A0", "#4D6551", "#2F5D3A", "#173A24", "#07320D",
  "#DCEBF0", "#7FA7B5", "#2E5E6E", "#6B5B95", "#1F2B24", "#000000",
];

type Hsva = { h: number; s: number; v: number; a: number };

function hexToHsva(hex: string): Hsva {
  const [r8, g8, b8, a] = hexToRgba(/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(hex) ? hex : "#000000");
  const r = r8 / 255, g = g8 / 255, b = b8 / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return { h, s: max ? d / max : 0, v: max, a };
}

function hsvaToHex({ h, s, v, a }: Hsva): string {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  const channels = [f(5), f(3), f(1)].map((c) => Math.round(c * 255));
  // Opacité à 100 % : on garde un hex classique à 6 chiffres.
  if (a < 0.995) channels.push(Math.round(a * 255));
  return `#${channels.map((c) => c.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

/** Damier visible derrière une couleur transparente. */
const CHECKER = "repeating-conic-gradient(#D9DEDB 0% 25%, #FFFFFF 0% 50%) 50% / 10px 10px";

/** Suit le pointeur (souris ou doigt) sur une zone et renvoie la position en 0–1. */
function useDrag(onMove: (x: number, y: number) => void) {
  const ref = useRef<HTMLDivElement>(null);
  const handle = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const rect = ref.current?.getBoundingClientRect();
      if (!rect) return;
      const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
      onMove(x, y);
    },
    [onMove],
  );
  return {
    ref,
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      handle(e);
    },
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) handle(e);
    },
  };
}

interface EyeDropperResult { sRGBHex: string }
interface EyeDropperApi { open: () => Promise<EyeDropperResult> }
declare global {
  interface Window { EyeDropper?: new () => EyeDropperApi }
}

export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [hsva, setHsva] = useState<Hsva>(() => hexToHsva(value));
  const [canPick, setCanPick] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  // Resynchronise si la couleur change de l'extérieur (palette prête à l'emploi…).
  useEffect(() => {
    if (hsvaToHex(hsva) !== value.toUpperCase()) setHsva(hexToHsva(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => setCanPick(typeof window !== "undefined" && !!window.EyeDropper), []);

  // Ferme au clic en dehors ou avec Échap.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const apply = useCallback(
    (next: Hsva) => {
      setHsva(next);
      onChange(hsvaToHex(next));
    },
    [onChange],
  );

  const sv = useDrag(useCallback((x, y) => apply({ ...hsva, s: x, v: 1 - y }), [apply, hsva]));
  const hue = useDrag(useCallback((x) => apply({ ...hsva, h: x * 360 }), [apply, hsva]));
  const alpha = useDrag(useCallback((x) => apply({ ...hsva, a: x }), [apply, hsva]));

  async function pickFromScreen() {
    if (!window.EyeDropper) return;
    try {
      const { sRGBHex } = await new window.EyeDropper().open();
      // La pipette donne une couleur opaque : on conserve l'opacité choisie.
      apply({ ...hexToHsva(sRGBHex), a: hsva.a });
    } catch {
      // Annulé par l'utilisateur (Échap) : rien à faire.
    }
  }

  const hex = hsvaToHex(hsva);
  const opaque = hsvaToHex({ ...hsva, a: 1 });
  const pureHue = hsvaToHex({ h: hsva.h, s: 1, v: 1, a: 1 });
  const percent = Math.round(hsva.a * 100);

  return (
    <div ref={rootRef} className="relative">
      <div className="mb-1.5 text-[13.5px] font-semibold text-partner-ink">{label}</div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-2.5 rounded-xl border border-partner-border bg-partner-bg px-2 py-1.5 text-left hover:border-partner-leaf"
      >
        <span className="relative h-[34px] w-[34px] flex-none overflow-hidden rounded-lg border border-black/10" style={{ background: CHECKER }}>
          <span className="absolute inset-0" style={{ background: hex }} />
        </span>
        <span className="min-w-0 flex-1 text-[13px] text-partner-muted">
          {percent < 100 ? `Opacité ${percent} %` : "Choisir la couleur"}
        </span>
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label={`Couleur : ${label}`}
          className="absolute left-0 top-full z-30 mt-2 w-[264px] rounded-2xl border border-partner-border bg-partner-card p-3 shadow-[0_18px_40px_-12px_rgba(20,40,30,0.35)]"
        >
          {/* Saturation (horizontal) × luminosité (vertical) */}
          <div
            {...sv}
            className="relative h-[150px] w-full cursor-crosshair touch-none rounded-xl"
            style={{
              background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${pureHue})`,
            }}
          >
            <span
              className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.3)]"
              style={{ left: `${hsva.s * 100}%`, top: `${(1 - hsva.v) * 100}%`, background: opaque }}
            />
          </div>

          <div className="mt-3 flex items-center gap-2.5">
            <div className="flex-1 space-y-2.5">
              {/* Teinte */}
              <div
                {...hue}
                aria-label="Teinte"
                className="relative h-3 cursor-pointer touch-none rounded-full"
                style={{ background: "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)" }}
              >
                <span
                  className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.3)]"
                  style={{ left: `${(hsva.h / 360) * 100}%`, background: pureHue }}
                />
              </div>
              {/* Opacité */}
              <div
                {...alpha}
                aria-label="Opacité"
                className="relative h-3 cursor-pointer touch-none rounded-full"
                style={{ background: CHECKER }}
              >
                <span className="absolute inset-0 rounded-full" style={{ background: `linear-gradient(to right, transparent, ${opaque})` }} />
                <span
                  className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.3)]"
                  style={{ left: `${hsva.a * 100}%`, background: hex }}
                />
              </div>
            </div>
            {canPick && (
              <button
                type="button"
                onClick={pickFromScreen}
                title="Pipette : prendre une couleur à l'écran"
                aria-label="Pipette : prendre une couleur à l'écran"
                className="grid h-9 w-9 flex-none place-items-center rounded-full border border-partner-border bg-partner-bg text-partner-ink hover:border-partner-leaf"
              >
                <Pipette className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between text-[12px] text-partner-muted">
            <span>Opacité</span>
            <span className="tabular-nums">{percent} %</span>
          </div>

          {/* Couleurs prêtes à l'emploi */}
          <div className="mt-3 grid grid-cols-8 gap-1.5">
            {SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => apply({ ...hexToHsva(c), a: hsva.a })}
                title={c}
                aria-label={`Couleur ${c}`}
                className="h-6 w-6 rounded-md border border-black/10 hover:scale-110"
                style={{ background: c, outline: opaque === c ? "2px solid #3a9a5e" : undefined, outlineOffset: 1 }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

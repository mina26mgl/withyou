"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const blurLayers = [12, 8, 4, 2] as const;

const STEPS = 5;                              // 5 autres points → 6 positions (0-5)
const TRACK_INNER = 345;
const BUTTON_W = 66;
const MAX_TRAVEL = TRACK_INNER - BUTTON_W;   // 279px
const STEP_PX = MAX_TRAVEL / STEPS;          // 69.75px par step

const sliderOptions = [
  "Honnêtement, je ne sais pas sûr",
  "Ma peau s'adapte facilement",
  "Ça dépend du produit",
  "Elle réagit assez souvent",
  "Elle réagit toujours",
  "Elle réagit à tout, elle est très sensible",
];

export default function Quiz5Page() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  // Position en pixels — libre pendant le drag, snappée à la fin
  const [buttonPx, setButtonPx] = useState(0);
  const buttonPxRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartClientX = useRef(0);
  const dragStartButtonPx = useRef(0);

  const sliderStep = Math.round(buttonPx / STEP_PX);

  // Cross-fade : deux calques superposés, l'un monte pendant que l'autre descend
  const [layerA, setLayerA] = useState({ text: sliderOptions[0], opacity: 1 });
  const [layerB, setLayerB] = useState({ text: sliderOptions[0], opacity: 0 });
  const activeLayer = useRef<"a" | "b">("a");
  const lastStep = useRef(0);

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  // Cross-fade simultané : l'ancien texte part en 0 pendant que le nouveau monte à 1
  useEffect(() => {
    if (sliderStep === lastStep.current) return;
    lastStep.current = sliderStep;
    if (activeLayer.current === "a") {
      setLayerB({ text: sliderOptions[sliderStep], opacity: 1 });
      setLayerA((prev) => ({ ...prev, opacity: 0 }));
      activeLayer.current = "b";
    } else {
      setLayerA({ text: sliderOptions[sliderStep], opacity: 1 });
      setLayerB((prev) => ({ ...prev, opacity: 0 }));
      activeLayer.current = "a";
    }
  }, [sliderStep]);

  function startDrag(clientX: number) {
    dragStartClientX.current = clientX;
    dragStartButtonPx.current = buttonPxRef.current;
    setIsDragging(true);
  }

  useEffect(() => {
    if (!isDragging) return;

    function onMove(e: MouseEvent | TouchEvent) {
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const delta = clientX - dragStartClientX.current;
      const newPx = Math.max(0, Math.min(MAX_TRAVEL, dragStartButtonPx.current + delta));
      buttonPxRef.current = newPx;
      setButtonPx(newPx);
    }

    function onUp() {
      setIsDragging(false);
      // Snap au step le plus proche avec animation
      const step = Math.round(buttonPxRef.current / STEP_PX);
      const snapped = step * STEP_PX;
      buttonPxRef.current = snapped;
      setButtonPx(snapped);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [isDragging]);

  function goToStep(step: number) {
    const clipped = Math.max(0, Math.min(STEPS, step));
    const px = clipped * STEP_PX;
    buttonPxRef.current = px;
    setButtonPx(px);
  }

  function handleContinuer() {
    setLeaving(true);
    setTimeout(() => router.push("/loading"), 700);
  }

  return (
    <div
      className="relative w-full max-w-[430px] mx-auto overflow-hidden bg-[#FCFFFD]"
      style={{ height: "100dvh", opacity: leaving ? 0 : visible ? 1 : 0, transition: "opacity 700ms ease" }}
    >
      {/* Nuage */}
      <div className="absolute top-0 pointer-events-none" style={{ left: "-209px", width: "851px", height: "250px" }}>
        <img src="/nuage_inscription.png" alt="" style={{ width: "851px", height: "250px", objectFit: "cover", display: "block" }} />
        <div className="absolute inset-0" style={{ background: "rgba(255,255,255,0.50)" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(252,255,253,0) 40%, #FCFFFD 100%)" }} />
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

      {/* Titre */}
      <div className="absolute" style={{ top: "60px", left: "16px", width: "361px" }}>
        <p style={{ fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: "32px", lineHeight: "105%", letterSpacing: "-0.04em", color: "#07320D" }}>
          Votre peau réagit-elle facilement aux nouveaux produits&nbsp;?
        </p>
      </div>

      {/* Main (image) */}
      <div className="absolute pointer-events-none" style={{ top: "109px", left: "46px", width: "340px", height: "259px", mixBlendMode: "multiply" }}>
        <img src="/main.png" alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      </div>

      {/* Bloc slider + bouton générer */}
      <div className="absolute" style={{ top: "356px", left: "16px", width: "361px", display: "flex", flexDirection: "column", gap: "24px" }}>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>

          {/* Texte dynamique — cross-fade deux calques */}
          <div style={{ position: "relative", height: "44px" }}>
            {[layerA, layerB].map((layer, i) => (
              <p key={i} style={{
                position: "absolute",
                top: 0, left: 0, right: 0,
                fontFamily: "Inter, system-ui, sans-serif",
                fontWeight: 600,
                fontSize: "20px",
                lineHeight: "100%",
                letterSpacing: "-0.05em",
                color: "#07320D",
                margin: 0,
                textAlign: "center",
                opacity: layer.opacity,
                transition: "opacity 220ms ease",
                pointerEvents: "none",
              }}>
                {layer.text}
              </p>
            ))}
          </div>

          {/* Track du slider */}
          <div style={{
            width: "361px",
            height: "82px",
            borderRadius: "24px",
            border: "3px solid #FFFFFF",
            background: "#F9FFF8",
            boxShadow: "1px 1px 2px 0px rgba(0,0,0,0.02), 3px 3px 4px 0px rgba(0,0,0,0.02), 6px 6px 5px 0px rgba(0,0,0,0.01)",
            padding: "8px",
            position: "relative",
            userSelect: "none",
            boxSizing: "border-box",
          }}>

            {/* 4 dots — positions 1 à 4 */}
            <div style={{
              position: "absolute",
              top: "50%",
              left: "8px",
              width: "345px",
              display: "flex",
              justifyContent: "space-between",
              paddingLeft: "30px",
              paddingRight: "30px",
              transform: "translateY(-50%)",
              pointerEvents: "none",
              boxSizing: "border-box",
            }}>
              {[1, 2, 3, 4, 5].map((dot) => (
                <div key={dot} style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: sliderStep >= dot ? "#07320D" : "#C8D9CB",
                  flexShrink: 0,
                  transition: "background 200ms ease",
                }} />
              ))}
            </div>

            {/* Bouton glissable */}
            <div
              onMouseDown={(e) => { e.preventDefault(); startDrag(e.clientX); }}
              onTouchStart={(e) => startDrag(e.touches[0].clientX)}
              style={{
                position: "absolute",
                top: "8px",
                left: `${8 + buttonPx}px`,
                width: "66px",
                height: "66px",
                borderRadius: "20px",
                /* gradient border via wrapper */
                background: "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 100%), linear-gradient(0deg, rgba(255,255,255,0.27), rgba(255,255,255,0.27))",
                padding: "2px",
                boxSizing: "border-box",
                boxShadow: "0px 1px 2px 0px rgba(16,24,40,0.05), 0px -2px 0px 0px rgba(255,255,255,0.08) inset, 0px 0px 0px 1px rgba(255,255,255,0.06) inset, 1px 1px 3px 0px rgba(0,0,0,0.10), 3px 5px 6px 0px rgba(0,0,0,0.09), 7px 12px 8px 0px rgba(0,0,0,0.05), 12px 22px 10px 0px rgba(0,0,0,0.02), 18px 34px 11px 0px rgba(0,0,0,0)",
                cursor: isDragging ? "grabbing" : "grab",
                /* glissade fluide au snap, aucune transition pendant le drag */
                transition: isDragging ? "none" : "left 380ms cubic-bezier(0.34, 1.56, 0.64, 1)",
                zIndex: 2,
              }}
            >
              <div style={{
                width: "100%",
                height: "100%",
                borderRadius: "18px",
                background: "#07320D",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
              </div>
            </div>
          </div>

          {/* Navigation ‹ · › */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px" }}>
            <button
              onClick={() => goToStep(sliderStep - 1)}
              disabled={sliderStep === 0}
              style={{ background: "none", border: "none", cursor: sliderStep === 0 ? "default" : "pointer", color: sliderStep === 0 ? "#D0C8C2" : "#4A6E4F", fontSize: "20px", padding: "4px 8px", lineHeight: 1 }}
            >
              ‹
            </button>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#07320D" }} />
            <button
              onClick={() => goToStep(sliderStep + 1)}
              disabled={sliderStep === STEPS}
              style={{ background: "none", border: "none", cursor: sliderStep === STEPS ? "default" : "pointer", color: sliderStep === STEPS ? "#D0C8C2" : "#4A6E4F", fontSize: "20px", padding: "4px 8px", lineHeight: 1 }}
            >
              ›
            </button>
          </div>
        </div>

        {/* Bouton Générer mon routine */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <button onClick={handleContinuer} style={{
            height: "36px",
            borderRadius: "16px",
            padding: "8px 20px",
            gap: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(#07320D, #07320D) padding-box, linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 100%) border-box",
            border: "2px solid transparent",
            boxShadow: "0px 1px 2px 0px rgba(16,24,40,0.05), 0px -2px 0px 0px rgba(255,255,255,0.08) inset, 0px 0px 0px 1px rgba(255,255,255,0.06) inset",
            color: "#FFFFFF",
            fontWeight: 600,
            fontSize: "14px",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}>
            Generer ma routine
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ marginLeft: "4px" }}>
              <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2z" fill="white" />
              <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14z" fill="white" />
              <path d="M5 17l.5 1.5L7 19l-1.5.5L5 21l-.5-1.5L3 19l1.5-.5L5 17z" fill="white" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getProfilePhoto } from "@/lib/photoStore";

const blurLayers = [12, 8, 4, 2] as const;

function ConfirmationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nom = searchParams.get("nom") ?? "vous";

  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [photoUrl] = useState<string | null>(() => getProfilePhoto());

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  function handleCommencer() {
    setLeaving(true);
    setTimeout(() => router.push("/quiz"), 700);
  }

  return (
    <div
      className="relative w-full max-w-[430px] mx-auto overflow-hidden bg-[#FCFFFD]"
      style={{ height: "100dvh", opacity: leaving ? 0 : visible ? 1 : 0, transition: "opacity 700ms ease" }}
    >
      {/* Nuage */}
      <div className="absolute top-0 pointer-events-none" style={{ left: "-209px", width: "851px", height: "250px" }}>
        <img
          src="/nuage_inscription.png"
          alt=""
          style={{ width: "851px", height: "250px", objectFit: "cover", display: "block" }}
        />
        <div className="absolute inset-0" style={{ background: "rgba(255,255,255,0.50)" }} />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(252, 255, 253, 0) 40%, #FCFFFD 100%)" }}
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

      {/* Titre + sous-titre + bouton */}
      <div className="absolute" style={{ top: "88px", left: "16px", width: "361px" }}>
        <p
          style={{
            fontFamily: "var(--font-playfair)",
            fontWeight: 700,
            fontSize: "36px",
            lineHeight: "105%",
            letterSpacing: "-0.04em",
            color: "#07320D",
            marginBottom: "16px",
          }}
        >
          C&apos;est un bon début, {nom}.
        </p>

        <p
          style={{
            fontSize: "15px",
            lineHeight: "150%",
            color: "#3D5C3F",
            marginBottom: "28px",
          }}
        >
          Nous ne sommes pas là pour réparer &ldquo;Vous&rdquo;, mais pour vous aider dans votre parcours de soin de la peau&nbsp;!
        </p>

        <div style={{ display: "flex", justifyContent: "center" }}>
        <button
          onClick={handleCommencer}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            height: "44px",
            borderRadius: "22px",
            padding: "0 24px",
            background:
              "linear-gradient(#07320D, #07320D) padding-box, linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 100%) border-box",
            border: "2px solid transparent",
            boxShadow:
              "0px 1px 2px 0px rgba(16,24,40,0.05), 0px -2px 0px 0px rgba(255,255,255,0.08) inset, 0px 0px 0px 1px rgba(255,255,255,0.06) inset",
            color: "#FFFFFF",
            fontWeight: 600,
            fontSize: "15px",
            cursor: "pointer",
          }}
        >
          D&apos;accord, je commence. <span style={{ fontSize: "18px" }}>›</span>
        </button>
        </div>
      </div>

      {/* Photo de profil grande */}
      <div
        className="absolute"
        style={{ top: "370px", left: "16px", width: "361px", display: "flex", justifyContent: "center" }}
      >
        <div style={{ position: "relative" }}>
          <div
            style={{
              width: "204px",
              height: "204px",
              borderRadius: "9999px",
              background: "#FFFFFF",
              border: "1px solid #00000014",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow:
                "0px 3px 3px -1.5px rgba(16,24,40,0.08), 0px 8px 8px -4px rgba(16,24,40,0.06), 0px 20px 24px -4px rgba(16,24,40,0.10)",
            }}
          >
            <div
              style={{
                width: "196px",
                height: "196px",
                borderRadius: "9999px",
                overflow: "hidden",
                border: "1px solid #00000014",
              }}
            >
              <img
                src={photoUrl ?? "/profil.png"}
                alt="profil"
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }}
              />
            </div>
          </div>

          {/* Décoration jasmine */}
          <img
            src="/fleure-profile.png"
            alt=""
            aria-hidden
            style={{
              position: "absolute",
              width: "96px",
              top: "-29px",
              right: "-10px",
              pointerEvents: "none",
            }}
          />
        </div>
      </div>

    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense>
      <ConfirmationContent />
    </Suspense>
  );
}

"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { setProfilePhoto } from "@/lib/photoStore";

const blurLayers = [12, 8, 4, 2] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPhotoUrl(url);
    setProfilePhoto(url);
  }

  const isComplete = nom.trim().length > 0 && email.trim().length > 0;

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  function handleContinuer() {
    if (!isComplete) return;
    setLeaving(true);
    setTimeout(() => router.push(`/confirmation?nom=${encodeURIComponent(nom)}`), 500);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    height: "40px",
    borderRadius: "8px",
    border: "1px solid #E9EAEB",
    padding: "0 14px",
    fontSize: "14px",
    color: "#07320D",
    background: "#FFFFFF",
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div
      className="relative w-full max-w-[430px] mx-auto overflow-hidden bg-[#FCFFFD]"
      style={{ height: "100dvh" }}
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

      {/* Titre */}
      <div className="absolute" style={{ top: "132px", left: "16px", width: "361px" }}>
        <p
          style={{
            fontFamily: "var(--font-playfair)",
            fontWeight: 700,
            fontSize: "32px",
            lineHeight: "100%",
            letterSpacing: "-0.04em",
            color: "#07320D",
          }}
        >
          Tout d&apos;abord, nous voulons mieux vous connaître :
        </p>
      </div>

      {/* Photo de profil — cliquable */}
      <div
        className="absolute"
        style={{ top: "270px", left: "16px", width: "361px", display: "flex", justifyContent: "center" }}
      >
        <div style={{ position: "relative" }}>
          {/* Input caché */}
          <input
            id="photo-upload"
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            style={{ display: "none" }}
          />

          {/* Cercle cliquable */}
          <label
            htmlFor="photo-upload"
            style={{ cursor: "pointer", display: "block" }}
            title="Changer la photo"
          >
            <div
              style={{
                width: "96px",
                height: "96px",
                borderRadius: "9999px",
                background: "#FFFFFF",
                border: "1px solid #00000014",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: "88px",
                  height: "88px",
                  borderRadius: "9999px",
                  border: "1px solid #00000014",
                  overflow: "hidden",
                  boxShadow:
                    "0px 3px 3px -1.5px rgba(16,24,40,0.08), 0px 8px 8px -4px rgba(16,24,40,0.06), 0px 20px 24px -4px rgba(16,24,40,0.10)",
                }}
              >
                <img
                  src={photoUrl ?? "/profil.png"}
                  alt="profil"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "center top",
                    ...(photoUrl
                      ? {}
                      : { top: "13px", left: "1px", position: "relative" as const }),
                  }}
                />
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Champs + bouton */}
      <div
        className="absolute"
        style={{
          top: "422px",
          left: "16px",
          width: "361px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "16px",
        }}
      >
        {/* Champ nom */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "6px" }}>
          <input
            type="text"
            placeholder="Tapez votre nom ici"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            style={inputStyle}
          />
          <p style={{ fontSize: "12px", color: "#535862", margin: 0 }}>
            Pour que nous puissions vous appeler
          </p>
        </div>

        {/* Champ email */}
        <input
          type="email"
          placeholder="Tapez votre email ici"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />

        {/* Bouton */}
        <button
          onClick={handleContinuer}
          style={
            isComplete
              ? {
                  width: "118px",
                  height: "36px",
                  borderRadius: "16px",
                  padding: "8px 14px",
                  gap: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background:
                    "linear-gradient(#07320D, #07320D) padding-box, linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 100%) border-box",
                  border: "2px solid transparent",
                  boxShadow:
                    "0px 1px 2px 0px rgba(16,24,40,0.05), 0px -2px 0px 0px rgba(255,255,255,0.08) inset, 0px 0px 0px 1px rgba(255,255,255,0.06) inset",
                  color: "#FFFFFF",
                  fontWeight: 600,
                  fontSize: "14px",
                  cursor: "pointer",
                  transition: "all 200ms ease",
                }
              : {
                  width: "124px",
                  height: "40px",
                  borderRadius: "16px",
                  padding: "10px 14px",
                  gap: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#F5F5F5",
                  border: "1px solid #E9EAEB",
                  boxShadow: "0px 1px 2px 0px rgba(16,24,40,0.05)",
                  color: "#A4A7AE",
                  fontWeight: 600,
                  fontSize: "14px",
                  cursor: "not-allowed",
                  transition: "all 200ms ease",
                }
          }
        >
          Continuer <span style={{ marginLeft: "2px" }}>›</span>
        </button>
      </div>

      {/* Overlay fondu-blanc — entrée depuis le blanc, sortie vers le blanc */}
      <div
        className="absolute inset-0 pointer-events-none z-50"
        style={{
          background: "#FCFFFD",
          opacity: leaving ? 1 : visible ? 0 : 1,
          transition: "opacity 500ms ease",
        }}
      />
    </div>
  );
}

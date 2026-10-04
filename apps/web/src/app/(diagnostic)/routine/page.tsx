"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BottomNav from "@/components/layout/BottomNav";
import { SCAN_IA_ENABLED } from "@/lib/features";
import { useAuth } from "@clerk/nextjs";
import type { PublicProduct } from "@withyou/shared-types";
import { api, ApiError } from "@/lib/api";
import { useOnboardingStep, type ConsumerProfile } from "@/lib/onboarding";
import { useOnlineProducts } from "@/lib/useOnlineProducts";
import { buildRoutine, fitScore, formatPrice, routineSummary } from "@/lib/routine";

type RoutineProduct = {
  id: string;
  brand: string;
  brandLogo: string | null;
  brandInitials: string;
  name: string;
  image: string | undefined;
  price: string;
  /** « % adapté » d'après le quiz ; null sans réponses (badge masqué). */
  fit: number | null;
};

/** Produit de la routine proposée (réponses au quiz + produits en ligne). */
function fromProduct(p: PublicProduct, profile: ConsumerProfile | null): RoutineProduct {
  return {
    id: p.id,
    brand: p.marque.nom,
    brandLogo: p.marque.logoUrl,
    brandInitials: p.marque.nom.slice(0, 2).toUpperCase(),
    name: p.nom,
    image: p.imagesUrls[0],
    price: formatPrice(p.prix),
    fit: fitScore(p, profile),
  };
}

export default function RoutinePage() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  // Prénom et réponses du quiz (profil cliente) → routine proposée.
  const { saved: profile } = useOnboardingStep();
  const { isSignedIn, getToken } = useAuth();
  const products = useOnlineProducts();
  const suggestion = buildRoutine(products, profile);
  const morningProducts = suggestion.morning.map((p) => fromProduct(p, profile));
  const eveningProducts = suggestion.evening.map((p) => fromProduct(p, profile));

  // « Enregistrer ma routine » : seule façon d'enregistrer la routine (collection `routines`).
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  async function saveRoutine() {
    if (!isSignedIn) {
      router.push("/login");
      return;
    }
    setSaveState("saving");
    setSaveError(null);
    try {
      await api.post("/users/me/routine", undefined, { token: await getToken() });
      setSaveState("saved");
    } catch (err) {
      console.error("Routine non enregistrée:", err);
      setSaveError(
        err instanceof ApiError && err.status === 400
          ? "Terminez d'abord le questionnaire de peau pour enregistrer votre routine."
          : "Impossible d'enregistrer votre routine. Réessayez.",
      );
      setSaveState("idle");
    }
  }

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  return (
    // Page en pleine largeur (le ciel couvre aussi les tablettes), contenu dans une colonne de 430px.
    <div
      className="relative w-full bg-[#FCFFFD] overflow-y-auto overflow-x-hidden"
      style={{ height: "100dvh", opacity: visible ? 1 : 0, transition: "opacity 600ms ease", scrollbarWidth: "none" }}
    >
      {/* Images du ciel : morning (gauche) + evening (droite), fusion au centre (proportions de la maquette 393px) */}
      <div className="relative w-full flex-shrink-0 overflow-hidden" style={{ height: 126 }}>
        <div className="absolute" style={{ top: 0, left: 0, width: "58%", height: 123 }}>
          <img
            src="/morning.png"
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "left center",
              display: "block",
              opacity: 1,
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(270deg, #FCFFFD 0%, rgba(252, 255, 253, 0) 84.53%), linear-gradient(180deg, rgba(252, 255, 253, 0) 58.54%, #FCFFFD 100%)",
            }}
          />
        </div>
        <div
          className="absolute"
          style={{
            top: 0,
            left: "42%",
            right: 0,
            height: 126,
            // Fondu réel avec le ciel du matin (pas de bord net sur les écrans larges)
            maskImage: "linear-gradient(to right, transparent 0%, black 35%)",
            WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 35%)",
          }}
        >
          <img
            src="/evening.png"
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "85% top",
              display: "block",
              opacity: 1,
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(300deg, rgba(252, 255, 253, 0) 0%, #FCFFFD 84.53%), linear-gradient(180deg, rgba(252, 255, 253, 0) 58.54%, #FCFFFD 100%)",
            }}
          />
        </div>
      </div>

      {/* Contenu */}
      <div
        className="w-full max-w-[430px] mx-auto"
        style={{
          // Bas dégagé pour la barre de navigation (fixe, 50px à 20px du bas).
          padding: "0 16px 104px 16px",
          marginTop: -30,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          zIndex: 1,
          position: "relative",
          boxSizing: "border-box",
        }}
      >
        {/* Nom + titre */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p
            style={{
              fontFamily: "var(--font-playfair)",
              fontWeight: 600,
              fontSize: 18,
              lineHeight: "100%",
              letterSpacing: "-0.04em",
              color: "rgba(7,50,13,1)",
              margin: 0,
            }}
          >
            {profile?.prenom ? `Voilà, ${profile.prenom}` : "Voilà"}
          </p>
          <p
            style={{
              fontFamily: "var(--font-eb-garamond), Georgia, serif",
              fontWeight: 400,
              fontSize: 32,
              lineHeight: "100%",
              letterSpacing: "-0.04em",
              color: "rgba(7,50,13,1)",
              margin: 0,
            }}
          >
            Votre première routine.
          </p>
        </div>

        {/* Card suggestions */}
        <div
          className="relative overflow-hidden"
          style={{
            borderRadius: 24,
            border: "1px solid rgba(0,0,0,0.08)",
            padding: 12,
            background: "white",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            minHeight: 95,
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-playfair)",
              fontWeight: 400,
              fontSize: 16,
              lineHeight: "100%",
              letterSpacing: "-0.03em",
              color: "rgba(3,26,6,1)",
              margin: 0,
            }}
          >
            Voici nos suggestions pour vous
          </p>
          <p
            style={{
              fontFamily: "Inter, sans-serif",
              fontWeight: 400,
              fontSize: 14,
              lineHeight: "22px",
              letterSpacing: "-0.07em",
              color: "rgba(77,101,81,1)",
              margin: 0,
            }}
          >
            &quot;{routineSummary(profile)}&quot;
          </p>
          {/* Rose décorative */}
          <div
            className="absolute pointer-events-none"
            style={{
              right: 10,
              top: -17,
              width: 33,
              height: 55,
              transform: "rotate(240.0deg)",
              transformOrigin: "center center",
            }}
          >
            <img src="/rose.png" alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
        </div>

        {/* Card routine principale — Le matin */}
        <div
          style={{
            borderRadius: 24,
            border: "1px solid rgba(0,0,0,0.08)",
            padding: "0 0px 12px 12px",
            background: "rgba(255,255,255,1)",
            backdropFilter: "blur(100px)",
            WebkitBackdropFilter: "blur(100px)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {/* Header Le matin */}
          <div className="relative overflow-hidden" style={{ width: "100%", height: 66, borderRadius: 16 }}>
            <img
              src="/morning.png"
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: 0.5 }}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(252,255,253,0) 0%, #FCFFFD 100%), linear-gradient(270deg, rgba(252,255,253,0) 0%, #FCFFFD 84.53%)",
              }}
            />
            <div className="absolute inset-0 flex items-center" style={{ gap: 8, padding: "0 12px" }}>
              {/* Icône soleil */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="4" stroke="#07320D" strokeWidth="1.5" />
                <line x1="12" y1="2" x2="12" y2="5" stroke="#07320D" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="12" y1="19" x2="12" y2="22" stroke="#07320D" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="2" y1="12" x2="5" y2="12" stroke="#07320D" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="19" y1="12" x2="22" y2="12" stroke="#07320D" strokeWidth="1.5" strokeLinecap="round" />
                <line
                  x1="4.93"
                  y1="4.93"
                  x2="7.05"
                  y2="7.05"
                  stroke="#07320D"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <line
                  x1="16.95"
                  y1="16.95"
                  x2="19.07"
                  y2="19.07"
                  stroke="#07320D"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <line
                  x1="4.93"
                  y1="19.07"
                  x2="7.05"
                  y2="16.95"
                  stroke="#07320D"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <line
                  x1="16.95"
                  y1="7.05"
                  x2="19.07"
                  y2="4.93"
                  stroke="#07320D"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <span
                style={{
                  fontFamily: "var(--font-playfair)",
                  fontWeight: 400,
                  fontSize: 16,
                  lineHeight: "100%",
                  letterSpacing: "-0.03em",
                  color: "rgba(3,26,6,1)",
                }}
              >
                Le matin
              </span>
            </div>
          </div>

          {/* Slider produits horizontal */}
          <div
            style={
              {
                display: "flex",
                flexWrap: "nowrap",
                gap: 12,
                overflowX: "auto",
                paddingBottom: 4,
                paddingRight: 12,
                scrollbarWidth: "none",
                msOverflowStyle: "none",
                WebkitOverflowScrolling: "touch",
              } as React.CSSProperties
            }
          >
            {morningProducts.map((product) => (
              <Link
                key={product.id}
                href={`/produit/${product.id}`}
                className="flex-shrink-0"
                style={{ width: 193, display: "flex", flexDirection: "column", gap: 8, textDecoration: "none" }}
              >
                {/* Card marque */}
                <div
                  style={{
                    height: 52,
                    borderRadius: 16,
                    border: "0.5px solid rgba(0,0,0,0.08)",
                    padding: "6px 12px",
                    background: "rgba(255,255,255,1)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    boxSizing: "border-box",
                  }}
                >
                  {product.brandLogo ? (
                    <div
                      className="relative flex-shrink-0 overflow-hidden"
                      style={{ width: 32, height: 32, borderRadius: 8 }}
                    >
                      <img
                        src={product.brandLogo}
                        alt={product.brand}
                        style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
                      />
                      <div
                        className="absolute pointer-events-none"
                        style={{
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          borderRadius: 8,
                          borderTop: "1px solid rgba(255,255,255,1)",
                          borderRight: "1px solid rgba(255,255,255,1)",
                          borderBottom: "none",
                          borderLeft: "1px solid rgba(255,255,255,1)",
                        }}
                      />
                      <div
                        className="absolute pointer-events-none"
                        style={{
                          top: "0.5px",
                          left: "0.5px",
                          right: "0.5px",
                          bottom: 0,
                          borderRadius: 8,
                          borderTop: "0.11px solid rgba(255,255,255,1)",
                          borderRight: "0.11px solid rgba(255,255,255,1)",
                          borderBottom: "none",
                          borderLeft: "0.11px solid rgba(255,255,255,1)",
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: "#E8F5E9",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#07320D",
                        flexShrink: 0,
                      }}
                    >
                      {product.brandInitials}
                    </div>
                  )}
                  <span
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontWeight: 500,
                      fontSize: 13,
                      color: "#07320D",
                      letterSpacing: "-0.03em",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {product.brand}
                  </span>
                </div>

                {/* Card produit */}
                <div
                  style={{
                    height: 248,
                    borderRadius: 24,
                    border: "1px solid rgba(0,0,0,0.08)",
                    padding: 12,
                    background: "rgba(255,255,255,1)",
                    backdropFilter: "blur(100px)",
                    WebkitBackdropFilter: "blur(100px)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                    boxSizing: "border-box",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      flex: 1,
                      borderRadius: 20,
                      overflow: "hidden",
                      minHeight: 0,
                    }}
                  >
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    ) : null}
                    <div
                      className="absolute pointer-events-none"
                      style={{
                        top: "1.77px",
                        left: "1.88px",
                        right: "1.88px",
                        bottom: "1.77px",
                        borderRadius: 20,
                        borderTop: "1px solid #FFFFFF",
                        borderRight: "1px solid #FFFFFF",
                        borderBottom: "none",
                        borderLeft: "1px solid #FFFFFF",
                      }}
                    />
                  </div>
                  <p
                    style={
                      {
                        fontFamily: "Inter, sans-serif",
                        fontWeight: 400,
                        fontSize: 13,
                        color: "#07320D",
                        margin: 0,
                        letterSpacing: "-0.03em",
                        lineHeight: "1.3",
                        flexShrink: 0,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      } as React.CSSProperties
                    }
                  >
                    {product.name}
                  </p>
                </div>

                {/* Prix + Fit */}
                <div className="flex" style={{ gap: 2 }}>
                  {/* Chip Prix */}
                  <div
                    className="flex flex-col items-center justify-center"
                    style={{
                      width: "95.75px",
                      height: 52,
                      borderRadius: 16,
                      border: "0.5px solid #E5E7EB",
                      padding: "4px 12px",
                      gap: 2,
                      background: "#FFFFFF",
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: 18,
                        fontWeight: 700,
                        color: "#031A06",
                        letterSpacing: "-0.03em",
                        lineHeight: 1,
                        textAlign: "center",
                      }}
                    >
                      {product.price}
                    </span>
                    <span
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: 11,
                        fontWeight: 500,
                        color: "#4A6E4F",
                        textAlign: "center",
                      }}
                    >
                      Dzd
                    </span>
                  </div>
                  {/* Chip Taux */}
                  {product.fit != null && (
                    <div
                      className="flex flex-col items-center justify-center"
                      style={{
                        width: "95.75px",
                        height: 52,
                        borderRadius: 16,
                        border: "0.5px solid #E5E7EB",
                        padding: "4px 12px",
                        gap: 8,
                        background: "#FFFFFF",
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: 11,
                          fontWeight: 500,
                          color: "#031A06",
                          lineHeight: "100%",
                          letterSpacing: "-0.3px",
                          whiteSpace: "nowrap",
                          textAlign: "center",
                        }}
                      >
                        {product.fit}% adapté
                      </span>
                      <div
                        style={{
                          width: 71.75,
                          height: 9,
                          borderRadius: 100,
                          border: "0.45px solid #6CE9A6",
                          background: "#D1FADF",
                          padding: "1px 2px",
                          boxSizing: "border-box",
                          flexShrink: 0,
                        }}
                      >
                        <div
                          style={{ height: "100%", borderRadius: 100, background: "#32D583", width: `${product.fit}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Card routine — Le soir */}
        <div
          style={{
            borderRadius: 24,
            border: "1px solid rgba(0,0,0,0.08)",
            padding: "0 0px 12px 12px",
            background: "rgba(255,255,255,1)",
            backdropFilter: "blur(100px)",
            WebkitBackdropFilter: "blur(100px)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {/* Header Le soir */}
          <div className="relative overflow-hidden" style={{ width: "100%", height: 66, borderRadius: 16 }}>
            <img
              src="/evening.png"
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "68% top",
                display: "block",
                opacity: 0.5,
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(252,255,253,0) 0%, #FCFFFD 100%), linear-gradient(270deg, rgba(252,255,253,0) 0%, #FCFFFD 84.53%)",
              }}
            />
            <div className="absolute inset-0 flex items-center" style={{ gap: 8, padding: "0 12px" }}>
              {/* Icône lune */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
                  stroke="#07320D"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span
                style={{
                  fontFamily: "var(--font-playfair)",
                  fontWeight: 400,
                  fontSize: 16,
                  lineHeight: "100%",
                  letterSpacing: "-0.03em",
                  color: "rgba(3,26,6,1)",
                }}
              >
                Le soir
              </span>
            </div>
          </div>

          {/* Slider produits horizontal */}
          <div
            style={
              {
                display: "flex",
                flexWrap: "nowrap",
                gap: 12,
                overflowX: "auto",
                paddingBottom: 4,
                paddingRight: 12,
                scrollbarWidth: "none",
                msOverflowStyle: "none",
                WebkitOverflowScrolling: "touch",
              } as React.CSSProperties
            }
          >
            {eveningProducts.map((product) => (
              <Link
                key={product.id}
                href={`/produit/${product.id}`}
                className="flex-shrink-0"
                style={{ width: 193, display: "flex", flexDirection: "column", gap: 8, textDecoration: "none" }}
              >
                {/* Card marque */}
                <div
                  style={{
                    height: 52,
                    borderRadius: 16,
                    border: "0.5px solid rgba(0,0,0,0.08)",
                    padding: "6px 12px",
                    background: "rgba(255,255,255,1)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    boxSizing: "border-box",
                  }}
                >
                  {product.brandLogo ? (
                    <div
                      className="relative flex-shrink-0 overflow-hidden"
                      style={{ width: 32, height: 32, borderRadius: 8 }}
                    >
                      <img
                        src={product.brandLogo}
                        alt={product.brand}
                        style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
                      />
                      <div
                        className="absolute pointer-events-none"
                        style={{
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          borderRadius: 8,
                          borderTop: "1px solid rgba(255,255,255,1)",
                          borderRight: "1px solid rgba(255,255,255,1)",
                          borderBottom: "none",
                          borderLeft: "1px solid rgba(255,255,255,1)",
                        }}
                      />
                      <div
                        className="absolute pointer-events-none"
                        style={{
                          top: "0.5px",
                          left: "0.5px",
                          right: "0.5px",
                          bottom: 0,
                          borderRadius: 8,
                          borderTop: "0.11px solid rgba(255,255,255,1)",
                          borderRight: "0.11px solid rgba(255,255,255,1)",
                          borderBottom: "none",
                          borderLeft: "0.11px solid rgba(255,255,255,1)",
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: "#E8F5E9",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#07320D",
                        flexShrink: 0,
                      }}
                    >
                      {product.brandInitials}
                    </div>
                  )}
                  <span
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontWeight: 500,
                      fontSize: 13,
                      color: "#07320D",
                      letterSpacing: "-0.03em",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {product.brand}
                  </span>
                </div>

                {/* Card produit */}
                <div
                  style={{
                    height: 248,
                    borderRadius: 24,
                    border: "1px solid rgba(0,0,0,0.08)",
                    padding: 12,
                    background: "rgba(255,255,255,1)",
                    backdropFilter: "blur(100px)",
                    WebkitBackdropFilter: "blur(100px)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                    boxSizing: "border-box",
                    overflow: "hidden",
                  }}
                >
                  <div style={{ position: "relative", flex: 1, borderRadius: 20, overflow: "hidden", minHeight: 0 }}>
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    ) : null}
                    <div
                      className="absolute pointer-events-none"
                      style={{
                        top: "1.77px",
                        left: "1.88px",
                        right: "1.88px",
                        bottom: 0,
                        borderRadius: 20,
                        borderTop: "1px solid #FFFFFF",
                        borderRight: "1px solid #FFFFFF",
                        borderBottom: "none",
                        borderLeft: "1px solid #FFFFFF",
                      }}
                    />
                  </div>
                  <p
                    style={
                      {
                        fontFamily: "Inter, sans-serif",
                        fontWeight: 400,
                        fontSize: 13,
                        color: "#07320D",
                        margin: 0,
                        letterSpacing: "-0.03em",
                        lineHeight: "1.3",
                        flexShrink: 0,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      } as React.CSSProperties
                    }
                  >
                    {product.name}
                  </p>
                </div>

                {/* Prix + Fit */}
                <div className="flex" style={{ gap: 2 }}>
                  <div
                    className="flex flex-col items-center justify-center"
                    style={{
                      width: "95.75px",
                      height: 52,
                      borderRadius: 16,
                      border: "0.5px solid #E5E7EB",
                      padding: "4px 12px",
                      gap: 2,
                      background: "#FFFFFF",
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: 18,
                        fontWeight: 700,
                        color: "#031A06",
                        letterSpacing: "-0.03em",
                        lineHeight: 1,
                        textAlign: "center",
                      }}
                    >
                      {product.price}
                    </span>
                    <span
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: 11,
                        fontWeight: 500,
                        color: "#4A6E4F",
                        textAlign: "center",
                      }}
                    >
                      Dzd
                    </span>
                  </div>
                  {product.fit != null && (
                    <div
                      className="flex flex-col items-center justify-center"
                      style={{
                        width: "95.75px",
                        height: 52,
                        borderRadius: 16,
                        border: "0.5px solid #E5E7EB",
                        padding: "4px 12px",
                        gap: 8,
                        background: "#FFFFFF",
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: 11,
                          fontWeight: 500,
                          color: "#031A06",
                          lineHeight: "100%",
                          letterSpacing: "-0.3px",
                          whiteSpace: "nowrap",
                          textAlign: "center",
                        }}
                      >
                        {product.fit}% adapté
                      </span>
                      <div
                        style={{
                          width: 71.75,
                          height: 9,
                          borderRadius: 100,
                          border: "0.45px solid #6CE9A6",
                          background: "#D1FADF",
                          padding: "1px 2px",
                          boxSizing: "border-box",
                          flexShrink: 0,
                        }}
                      >
                        <div
                          style={{ height: "100%", borderRadius: 100, background: "#32D583", width: `${product.fit}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Card scan (scan IA masqué pour l'instant, cf. lib/features) */}
        {SCAN_IA_ENABLED && (
          <div
            style={{
              borderRadius: 24,
              border: "1px solid rgba(0,0,0,0.08)",
              padding: "16px",
              background: "rgba(255,255,255,1)",
              display: "flex",
              flexDirection: "column",
              gap: 16,
              overflow: "hidden",
            }}
          >
            {/* Zone image + chips : composition de 339px centrée (sur un écran étroit, les bords vides sont rognés) */}
            <div style={{ position: "relative", width: "100%", height: 228, overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: "50%", width: 339, height: 228, marginLeft: -169.5 }}>
                {/* Image scan */}
                <img
                  src="/scan.png"
                  alt=""
                  style={{
                    position: "absolute",
                    left: 56.29,
                    top: 0,
                    width: 226.5,
                    height: 301.37,
                    objectFit: "cover",
                    display: "block",
                  }}
                />

                {/* Gradient haut sur l'image — blanc en haut, transparent vers le bas */}
                <div
                  style={{
                    position: "absolute",
                    left: 66.05,
                    top: 0,
                    width: 206.36,
                    height: 76.52,
                    background: "linear-gradient(180deg, #FFFFFF 0%, rgba(255,255,255,0) 100%)",
                    pointerEvents: "none",
                  }}
                />

                {/* Gradient bas sur l'image */}
                <div
                  style={{
                    position: "absolute",
                    left: 56.29,
                    top: 161.53,
                    width: 227.23,
                    height: 66.47,
                    background: "linear-gradient(180deg, rgba(255,255,255,0) 0%, #FFFFFF 90.7%)",
                    pointerEvents: "none",
                  }}
                />

                {/* Chip Acne — top:7.73, left:232.22 */}
                <div
                  style={{
                    position: "absolute",
                    top: 7.73,
                    left: 232.22,
                    width: 59.51,
                    height: 66.65,
                    borderRadius: 18.55,
                    border: "0.77px solid rgba(0,0,0,0.08)",
                    backdropFilter: "blur(77.29px)",
                    WebkitBackdropFilter: "blur(77.29px)",
                    padding: 9.27,
                    background: "rgba(255,255,255,1)",
                    boxShadow:
                      "0.77px 1.55px 3.86px 0px rgba(0,0,0,0.05), 2.32px 6.96px 7.73px 0px rgba(0,0,0,0.04), 5.41px 15.46px 10.05px 0px rgba(0,0,0,0.02), 10.05px 27.82px 11.59px 0px rgba(0,0,0,0.01), 15.46px 43.28px 13.14px 0px rgba(0,0,0,0)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6.18,
                    boxSizing: "border-box",
                  }}
                >
                  <img
                    src="/acne.png"
                    alt="Acne"
                    style={{
                      width: 40.96,
                      height: 30.92,
                      borderRadius: 4.42,
                      border: "0.23px solid rgba(0,0,0,0.1)",
                      objectFit: "cover",
                      display: "block",
                      flexShrink: 0,
                      boxShadow:
                        "0.13px 0.13px 0.38px 0px rgba(0,0,0,0.04), 0.51px 0.51px 0.76px 0px rgba(0,0,0,0.03), 1.15px 1.15px 1.02px 0px rgba(0,0,0,0.02), 2.04px 2.16px 1.15px 0px rgba(0,0,0,0.01)",
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: 9,
                      fontWeight: 500,
                      color: "#07320D",
                      textAlign: "center",
                      lineHeight: 1,
                    }}
                  >
                    Acne
                  </span>
                </div>

                {/* Chip Wrinkles (Rides) — top:33.24, left:39 */}
                <div
                  style={{
                    position: "absolute",
                    top: 33.24,
                    left: 39,
                    width: 59.51,
                    height: 66.65,
                    borderRadius: 18.55,
                    border: "0.77px solid rgba(0,0,0,0.08)",
                    backdropFilter: "blur(77.29px)",
                    WebkitBackdropFilter: "blur(77.29px)",
                    padding: 9.27,
                    background: "rgba(255,255,255,1)",
                    boxShadow:
                      "0.77px 1.55px 3.86px 0px rgba(0,0,0,0.05), 2.32px 6.96px 7.73px 0px rgba(0,0,0,0.04), 5.41px 15.46px 10.05px 0px rgba(0,0,0,0.02), 10.05px 27.82px 11.59px 0px rgba(0,0,0,0.01), 15.46px 43.28px 13.14px 0px rgba(0,0,0,0)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6.18,
                    boxSizing: "border-box",
                  }}
                >
                  <img
                    src="/ride.png"
                    alt="Wrinkles"
                    style={{
                      width: 40.96,
                      height: 30.92,
                      borderRadius: 4.42,
                      border: "0.23px solid rgba(0,0,0,0.1)",
                      objectFit: "cover",
                      display: "block",
                      flexShrink: 0,
                      boxShadow:
                        "0.13px 0.13px 0.38px 0px rgba(0,0,0,0.04), 0.51px 0.51px 0.76px 0px rgba(0,0,0,0.03), 1.15px 1.15px 1.02px 0px rgba(0,0,0,0.02), 2.04px 2.16px 1.15px 0px rgba(0,0,0,0.01)",
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: 9,
                      fontWeight: 500,
                      color: "#07320D",
                      textAlign: "center",
                      lineHeight: 1,
                    }}
                  >
                    Wrinkles
                  </span>
                </div>

                {/* Chip Oily Skin — top:121.35, left:236.86 */}
                <div
                  style={{
                    position: "absolute",
                    top: 121.35,
                    left: 236.86,
                    width: 59.51,
                    height: 66.65,
                    borderRadius: 18.55,
                    border: "0.77px solid rgba(0,0,0,0.08)",
                    backdropFilter: "blur(77.29px)",
                    WebkitBackdropFilter: "blur(77.29px)",
                    padding: 9.27,
                    background: "rgba(255,255,255,1)",
                    boxShadow:
                      "0.77px 1.55px 3.86px 0px rgba(0,0,0,0.05), 2.32px 6.96px 7.73px 0px rgba(0,0,0,0.04), 5.41px 15.46px 10.05px 0px rgba(0,0,0,0.02), 10.05px 27.82px 11.59px 0px rgba(0,0,0,0.01), 15.46px 43.28px 13.14px 0px rgba(0,0,0,0)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6.18,
                    boxSizing: "border-box",
                  }}
                >
                  <img
                    src="/oily.png"
                    alt="Oily skin"
                    style={{
                      width: 40.96,
                      height: 30.92,
                      borderRadius: 4.42,
                      border: "0.23px solid rgba(0,0,0,0.1)",
                      objectFit: "cover",
                      display: "block",
                      flexShrink: 0,
                      boxShadow:
                        "0.13px 0.13px 0.38px 0px rgba(0,0,0,0.04), 0.51px 0.51px 0.76px 0px rgba(0,0,0,0.03), 1.15px 1.15px 1.02px 0px rgba(0,0,0,0.02), 2.04px 2.16px 1.15px 0px rgba(0,0,0,0.01)",
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: 9,
                      fontWeight: 500,
                      color: "#07320D",
                      textAlign: "center",
                      lineHeight: 1,
                    }}
                  >
                    Oily skin
                  </span>
                </div>
              </div>
            </div>

            {/* Texte + bouton — juste après le gradient blanc de l'image */}
            <div
              style={{
                marginTop: -16,
                display: "flex",
                flexDirection: "column",
                gap: 8,
                background: "rgba(255,255,255,1)",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--font-eb-garamond), Georgia, serif",
                  fontWeight: 700,
                  fontSize: 20,
                  lineHeight: "120%",
                  letterSpacing: "-0.03em",
                  color: "rgba(3,26,6,1)",
                  margin: 0,
                }}
              >
                Vous voulez une routine encore plus avancé ?
              </p>
              <p
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontWeight: 400,
                  fontSize: 14,
                  lineHeight: "22px",
                  letterSpacing: "-0.03em",
                  color: "rgba(77,101,81,1)",
                  margin: 0,
                }}
              >
                Scannez votre visage en 10 secondes. Notre IA analyse votre peau pour affiner chaque recommandation.
              </p>
              <button
                onClick={() => router.push("/scan")}
                style={{
                  width: 154,
                  height: 36,
                  borderRadius: 16,
                  border: "2px solid rgba(255,255,255,0.12)",
                  padding: "8px 16px",
                  boxSizing: "border-box",
                  background: "rgba(251,255,252,1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  flexShrink: 0,
                  alignSelf: "center",
                  cursor: "pointer",
                  fontFamily: "Inter, sans-serif",
                  fontWeight: 500,
                  fontSize: 14,
                  color: "rgba(3,26,6,1)",
                  letterSpacing: "-0.03em",
                  whiteSpace: "nowrap",
                  boxShadow:
                    "0px 1px 2px 0px rgba(16,24,40,0.05), 0px -2px 0px 0px rgba(16,24,40,0.05) inset, 0px 0px 0px 1px rgba(16,24,40,0.18) inset",
                }}
              >
                Lancer le scan
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <rect x="3" y="3" width="4" height="4" rx="0.5" stroke="#07320D" strokeWidth="1.2" />
                  <rect x="13" y="3" width="4" height="4" rx="0.5" stroke="#07320D" strokeWidth="1.2" />
                  <rect x="3" y="13" width="4" height="4" rx="0.5" stroke="#07320D" strokeWidth="1.2" />
                  <line x1="13" y1="13" x2="17" y2="13" stroke="#07320D" strokeWidth="1.2" strokeLinecap="round" />
                  <line x1="17" y1="13" x2="17" y2="17" stroke="#07320D" strokeWidth="1.2" strokeLinecap="round" />
                  <line x1="13" y1="17" x2="17" y2="17" stroke="#07320D" strokeWidth="1.2" strokeLinecap="round" />
                  <line x1="13" y1="13" x2="13" y2="17" stroke="#07320D" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Ligne séparatrice */}
        <div style={{ width: "100%", height: 1, background: "rgba(0,0,0,0.08)", alignSelf: "center", flexShrink: 0 }} />

        {/* Bouton CTA principal */}
        <button
          onClick={() => void saveRoutine()}
          disabled={saveState !== "idle"}
          style={{
            width: "100%",
            height: 36,
            borderRadius: 16,
            border: "2px solid rgba(255,255,255,0.12)",
            padding: "8px 16px",
            boxSizing: "border-box",
            background: "rgba(7,50,13,1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            alignSelf: "center",
            flexShrink: 0,
            cursor: saveState === "idle" ? "pointer" : "default",
            opacity: saveState === "saving" ? 0.7 : 1,
            fontFamily: "Inter, sans-serif",
            fontWeight: 500,
            fontSize: 14,
            color: "#FFFFFF",
            letterSpacing: "-0.03em",
            whiteSpace: "nowrap",
            boxShadow:
              "0px 1px 2px 0px rgba(16,24,40,0.05), 0px -2px 0px 0px rgba(16,24,40,0.05) inset, 0px 0px 0px 1px rgba(16,24,40,0.18) inset",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M4 2H12C12.5523 2 13 2.44772 13 3V14L8 11L3 14V3C3 2.44772 3.44772 2 4 2Z"
              stroke="white"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {saveState === "saved"
            ? "Routine enregistrée"
            : saveState === "saving"
              ? "Enregistrement…"
              : "Enregistrer ma routine"}
        </button>
        {saveError ? (
          <p
            role="alert"
            style={{ margin: 0, textAlign: "center", fontFamily: "Inter, sans-serif", fontSize: 13, color: "#DC2626" }}
          >
            {saveError}
          </p>
        ) : null}
      </div>

      <BottomNav />
    </div>
  );
}

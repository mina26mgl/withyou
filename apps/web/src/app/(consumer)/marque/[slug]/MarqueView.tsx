"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import type { PublicBrandPage } from "@withyou/shared-types";
import { flattenOver, formatPrice, relativeLuminance, withOpacity } from "@withyou/shared-utils";
import BrandSlider from "@/components/brand/BrandSlider";
import { isVideoUrl, useSlowConnection } from "@/lib/media";
import { VoiceNotePlayer } from "@/components/brand/VoiceNotePlayer";
import SparkleStar from "@/components/icons/SparkleStar";
import { trackEvent } from "@/lib/trackEvent";
import { recordExploration } from "@/lib/parcours";
import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";

const WilayaMap = dynamic(() => import("@/components/brand/WilayaMapLeaflet"), {
  ssr: false,
  loading: () => (
    <div style={{ width: "100%", height: "100%", background: "#f0f4f0", borderRadius: "inherit" }} />
  ),
});

/** Muted variant of a hex color for secondary text/borders, without a 4th brand color field. */
function withAlpha(hex: string, alpha: string): string {
  // Brand colors may already carry an opacity (#RRGGBBAA): combine both.
  return withOpacity(hex, parseInt(alpha, 16) / 255);
}

/** Emplacement vide affiché seulement dans l'aperçu de l'espace marque. */
function PreviewHint({ children, color, border }: { children: React.ReactNode; color: string; border: string }) {
  return (
    <p
      style={{
        margin: 0,
        padding: "14px 12px",
        borderRadius: 16,
        border: `1.5px dashed ${border}`,
        fontFamily: "Inter, sans-serif",
        fontSize: 13,
        lineHeight: "150%",
        color,
        textAlign: "center",
      }}
    >
      {children}
    </p>
  );
}

/**
 * `preview` : rendu dans l'aperçu téléphone de l'espace marque (brouillon) —
 * même page exactement, mais sans compter de visite dans les statistiques, et
 * avec un emplacement explicatif à la place des sections encore vides.
 */
export default function MarqueView({
  slug,
  data,
  preview = false,
}: {
  slug: string;
  data: PublicBrandPage;
  preview?: boolean;
}) {
  const [histoireExpanded, setHistoireExpanded] = useState(false);
  const [needFilter, setNeedFilter] = useState<string | null>(null);
  const produitsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (preview) return;
    trackEvent({ type: "PAGE_VIEW", slug });
    recordExploration(`marque:${slug}`);
  }, [slug, preview]);
  const { content, produits, needs = [], avis = [], avisStats = null } = data;
  const shownProduits = needFilter ? produits.filter((p) => p.needs?.includes(needFilter)) : produits;

  /** « Voir » d'un besoin : filtre « Leurs produits » sur ce besoin et y descend. */
  function showNeed(label: string) {
    setNeedFilter((cur) => (cur === label ? null : label));
    produitsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const bgColor = content.bgColor;
  const textColor = content.textColor;
  const accentColor = content.accentColor;
  const cardColor = content.cardColor ?? "#FFFFFF";
  const secondTextColor = withAlpha(textColor, "99");
  const borderColor = withAlpha(accentColor, "33");
  const mapMode: "light" | "dark" = relativeLuminance(flattenOver(bgColor, "#FFFFFF")) < 0.5 ? "dark" : "light";
  // Couverture vidéo : l'image fournie par la marque s'affiche pendant le chargement,
  // et remplace la vidéo en connexion lente.
  const slowConnection = useSlowConnection();
  const isVideo = isVideoUrl(content.coverUrl) && !(slowConnection && content.coverImageUrl);

  return (
    <div
      className={`flex flex-col overflow-x-hidden ${preview ? "min-h-full" : "min-h-screen"}`}
      style={{ backgroundColor: bgColor }}
    >
      <div
        className="relative mx-auto mt-4 w-[calc(100%-32px)] max-w-[358px]"
        style={{
          height: "486px",
          marginTop: "12px",
          borderRadius: 40,
          border: "1.78px solid #0000001A",
          overflow: "hidden",
          // Le flou (backdrop-filter) ignore l'arrondi d'un overflow:hidden dans Chrome :
          // clip-path, lui, le coupe bien — sinon les coins du bas restent carrés.
          clipPath: "inset(0 round 40px)",
          boxShadow:
            "1px 1px 3px 0px #0000000A, 4px 4px 6px 0px #00000008, 9px 9px 8px 0px #00000005, 16px 17px 9px 0px #00000003, 24px 26px 10px 0px #00000000",
        }}
      >
        {content.coverUrl ? (
          isVideo ? (
            <video
              src={content.coverUrl}
              poster={content.coverImageUrl ?? undefined}
              autoPlay
              loop
              muted
              playsInline
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <img
              src={isVideoUrl(content.coverUrl) ? (content.coverImageUrl ?? undefined) : content.coverUrl}
              alt={content.name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          )
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              background: `radial-gradient(70% 80% at 18% 25%, ${withAlpha(accentColor, "66")}, transparent 62%), radial-gradient(60% 70% at 85% 20%, #ffffffaa, transparent 60%), linear-gradient(160deg, ${withAlpha(accentColor, "22")}, ${bgColor})`,
            }}
          />
        )}
        <div
          style={{
            position: "absolute",
            inset: 3,
            pointerEvents: "none",
            borderRadius: "inherit",
            borderStyle: "solid",
            borderColor: "#FFFFFF99",
            borderWidth: "2px 1.5px 0.7px 1.5px",
            zIndex: 2,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 3,
            borderRadius: "inherit",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: -1,
              borderRadius: "inherit",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              background: "linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.01) 100%)",
              maskImage: "linear-gradient(to bottom, transparent 0%, transparent 60%, black 65%, black 100%)",
              WebkitMaskImage:
                "linear-gradient(to bottom, transparent 0%, transparent 60%, black 65%, black 100%)",
            }}
          />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", transform: "translateY(100px)", zIndex: 4 }}>
            <div
              style={{
                width: 88.88,
                height: 88.88,
                backgroundColor: "white",
                borderRadius: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0px 4px 12px rgba(0,0,0,0.1)",
                marginBottom: 16,
                overflow: "hidden",
                padding: 2,
              }}
            >
              {/* Sans logo : image de profil par défaut. */}
              <img
                src={content.logoUrl || DEFAULT_AVATAR}
                alt=""
                style={
                  content.logoUrl
                    ? { width: "82.22px", height: "82.22px", objectFit: "contain", border: "0.2px solid #00000014", borderRadius: "18px" }
                    : { width: "62px", height: "62px", objectFit: "contain" }
                }
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <h1
                style={{
                  fontFamily: "var(--font-playfair)",
                  fontSize: 28,
                  fontWeight: 700,
                  color: "#FFFFFF",
                  margin: "0 0 4px 0",
                  textAlign: "center",
                  letterSpacing: "-0.02em",
                }}
              >
                {content.name}
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: 0.9 }}>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 500, color: "#FFFFFF" }}>
                  {content.since ? `Depuis ${content.since} • ` : ""}Vérifiée par withyou
                </span>
                <img
                  src="/cachet.png"
                  alt=""
                  style={{
                    width: 20,
                    height: 20,
                    boxShadow:
                      "0.42px 0.42px 0.84px 0px #00000030, 1.26px 1.26px 1.68px 0px #0000002B, 2.53px 3.37px 2.53px 0px #0000001A",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Histoire */}
      <div
        className="p-4"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          backgroundColor: cardColor,
          borderRadius: "16px",
          margin: "16px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-playfair)",
            fontWeight: 700,
            fontSize: "20px",
            lineHeight: "105%",
            color: textColor,
          }}
        >
          L&apos;histoire qu&apos;ils partagent
        </h2>
        <div
          className="absolute pointer-events-none"
          style={{ right: 10, top: -15, width: 33, height: 55, transform: "rotate(240deg)" }}
        >
          <img src="/rose.png" alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>
        <p
          style={{
            fontSize: "14px",
            lineHeight: "150%",
            color: secondTextColor,
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: histoireExpanded ? "unset" : 3,
            overflow: histoireExpanded ? "visible" : "hidden",
          }}
        >
          {content.story}
        </p>
        {content.story && (
          <button
            onClick={() => setHistoireExpanded((prev) => !prev)}
            style={{
              alignSelf: "flex-start",
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              fontFamily: "var(--font-inter), system-ui, sans-serif",
              fontSize: "13px",
              fontWeight: 600,
              color: textColor,
              textDecoration: "underline",
              textUnderlineOffset: "3px",
            }}
          >
            {histoireExpanded ? "Voir moins" : "Voir plus"}
          </button>
        )}
        {content.audioUrl && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "12px", width: "100%" }}>
            <VoiceNotePlayer src={content.audioUrl} color={secondTextColor} />
            {content.founders[0] && (
              <p style={{ fontFamily: "var(--font-meow-script), cursive", fontSize: "18px", color: textColor, margin: 0 }}>
                {content.founders[0].name}
              </p>
            )}
          </div>
        )}
      </div>

      {/* D'où vient la marque */}
      {(content.city || content.origin) && (
        <div className="px-4 pb-8" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div
            style={{
              backgroundColor: cardColor,
              borderRadius: "28px",
              padding: "20px",
              border: `1px solid ${borderColor}`,
              boxShadow: "0px 4px 20px rgba(0,0,0,0.03)",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <h2 style={{ fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: "20px", color: textColor }}>
              D&apos;où vient la marque
            </h2>
            {content.city && (
              <>
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    height: "170px",
                    border: `2.82px solid ${borderColor}`,
                    borderRadius: "20px",
                    overflow: "hidden",
                  }}
                >
                  <WilayaMap wilaya={content.city} lat={content.cityLat} lng={content.cityLng} mode={mapMode} />
                  {mapMode !== "dark" && (
                    <div style={{ position: "absolute", inset: 0, backgroundColor: "#72BBA6", opacity: 0.3, pointerEvents: "none", zIndex: 1000 }} />
                  )}
                </div>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: "16px", fontWeight: 600, color: textColor, margin: 0 }}>
                  {content.city}
                </p>
              </>
            )}
            {content.origin && (
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", lineHeight: "150%", color: secondTextColor, margin: 0 }}>
                {content.origin}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Les visages */}
      {content.founders.length > 0 && (
        <div className="px-4 pb-8" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div
            style={{
              backgroundColor: cardColor,
              borderRadius: "28px",
              padding: "12px",
              border: `1px solid ${borderColor}`,
              boxShadow: "0px 4px 20px rgba(0,0,0,0.03)",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <h2 style={{ fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: "20px", color: textColor }}>
              Les visages de {content.name}
            </h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
              {content.founders.map((founder, i) => (
                <div
                  key={i}
                  style={{
                    backgroundColor: cardColor,
                    borderRadius: "24px",
                    padding: "16px",
                    border: `1px solid ${borderColor}`,
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                    width: 139.5,
                  }}
                >
                  <p style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 500, color: textColor, margin: 0 }}>
                    {founder.name}
                  </p>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 500, color: secondTextColor, marginTop: -15 }}>
                    {founder.role}
                  </span>
                  <div
                    style={{
                      width: "100%",
                      height: "122px",
                      borderRadius: "20px",
                      overflow: "hidden",
                      background: accentColor,
                      display: "grid",
                      placeItems: "center",
                      fontFamily: "var(--font-playfair)",
                      fontSize: 34,
                      color: bgColor,
                    }}
                  >
                    {founder.photoUrl ? (
                      <img
                        src={founder.photoUrl}
                        alt={founder.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      founder.name.charAt(0)
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Engagements */}
      {content.commitments.length > 0 && (
        <div className="px-4 pb-8" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div
            style={{
              backgroundColor: cardColor,
              borderRadius: "28px",
              padding: "12px",
              border: `1px solid ${borderColor}`,
              boxShadow: "0px 4px 20px rgba(0,0,0,0.03)",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <h2 style={{ fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: "20px", color: textColor }}>
              Leurs engagements
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "16px" }}>
              {content.commitments.map((commitment) => (
                <div
                  key={commitment}
                  style={{
                    backgroundColor: cardColor,
                    borderRadius: "16px",
                    padding: "16px 8px",
                    border: `1px solid ${borderColor}`,
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  <div style={{ width: 24, height: 24, color: textColor }}>
                    <SparkleStar color={textColor} />
                  </div>
                  <p style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 500, color: textColor, margin: 0 }}>
                    {commitment}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pour quels besoins ? — déduits des produits en ligne de la marque */}
      {(needs.length > 0 || preview) && (
        <div className="px-4 pb-8" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div
            style={{
              backgroundColor: cardColor,
              borderRadius: "28px",
              padding: "12px",
              border: `1px solid ${borderColor}`,
              boxShadow: "0px 4px 20px rgba(0,0,0,0.03)",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <h2 style={{ fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: "20px", lineHeight: "105%", color: textColor }}>
              Pour quels besoins ?
            </h2>
            {needs.length === 0 ? (
              <PreviewHint color={secondTextColor} border={borderColor}>
                Les besoins traités par vos produits en ligne (hydratation, rougeurs…) s&apos;afficheront ici.
              </PreviewHint>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "16px" }}>
                {needs.map((need) => (
                  <div
                    key={need.label}
                    style={{
                      backgroundColor: cardColor,
                      borderRadius: "16px",
                      padding: "16px 8px",
                      border: `1px solid ${borderColor}`,
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                    }}
                  >
                    <p style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 500, color: textColor, margin: 0 }}>
                      {need.label}
                    </p>
                    <div
                      style={{
                        position: "relative",
                        width: "100%",
                        height: "122px",
                        border: `1px solid ${borderColor}`,
                        borderRadius: "20px",
                        overflow: "hidden",
                        background: withAlpha(accentColor, "22"),
                        boxShadow:
                          "1px 1px 3px 0px #0000000A,4px 4px 6px 0px #00000008,9px 9px 8px 0px #00000005,16px 17px 9px 0px #00000003",
                      }}
                    >
                      {need.imageUrl && (
                        <img src={need.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => showNeed(need.label)}
                      aria-pressed={needFilter === need.label}
                      style={{
                        alignSelf: "center",
                        width: "100%",
                        padding: "6px 12px",
                        borderRadius: "999px",
                        background: needFilter === need.label ? "#E7F4EA" : "#FBFFFC",
                        border: "2px solid #E4E7EC",
                        boxShadow: "0px 1px 2px rgba(16, 24, 40, 0.05)",
                        fontFamily: "Inter, sans-serif",
                        fontSize: "14px",
                        fontWeight: 500,
                        color: "#07320D",
                        cursor: "pointer",
                      }}
                    >
                      Voir
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Produits de la marque — the withyou product card style stays fixed, never brand-colored */}
      {(produits.length > 0 || preview) && (
        <div
          ref={produitsRef}
          className="px-4 pb-8"
          style={{ display: "flex", flexDirection: "column", gap: "16px", scrollMarginTop: 16 }}
        >
          <div
            style={{
              backgroundColor: cardColor,
              borderRadius: "28px",
              border: `1px solid ${borderColor}`,
              boxShadow: "0px 4px 20px rgba(0,0,0,0.03)",
              padding: "12px",
            }}
          >
            <h2 style={{ fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: "20px", color: textColor, padding: "4px 4px 12px" }}>
              Leurs produits
            </h2>
            {needFilter && (
              <button
                type="button"
                onClick={() => setNeedFilter(null)}
                aria-label={`Retirer le filtre ${needFilter} et voir tous les produits`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  margin: "0 4px 12px",
                  padding: "4px 12px",
                  borderRadius: 999,
                  border: `1px solid ${borderColor}`,
                  background: "transparent",
                  fontFamily: "Inter, sans-serif",
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: textColor,
                  cursor: "pointer",
                }}
              >
                {needFilter} <span aria-hidden="true">×</span>
              </button>
            )}
            {produits.length === 0 ? (
              <PreviewHint color={secondTextColor} border={borderColor}>
                Vos produits en ligne s&apos;afficheront ici.
              </PreviewHint>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: "10px" }}>
                {shownProduits.map((p) => (
                  <div key={p.id} className="rounded-2xl border border-black/5 bg-white p-2 text-[#17261C]">
                    <div className="aspect-square overflow-hidden rounded-xl bg-[#F2F4F1]">
                      {p.imageUrl && (
                        <Image src={p.imageUrl} alt={p.nom} width={200} height={200} className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="mt-2 line-clamp-2 min-h-[30px] px-0.5 text-[11.5px] font-semibold leading-tight">
                      {p.nom}
                    </div>
                    <div className="mt-1 px-0.5 text-xs font-bold">{formatPrice(p.prix)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ce que disent les clientes — avis vérifiés */}
      {(avis.length > 0 || preview) && (
        <div className="px-4 pb-8" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div
            style={{
              backgroundColor: cardColor,
              borderRadius: "28px",
              padding: "12px",
              border: `1px solid ${borderColor}`,
              boxShadow: "0px 4px 20px rgba(0,0,0,0.03)",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "4px 4px 0", gap: 8 }}>
              <h2 style={{ fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: "20px", lineHeight: "105%", color: textColor }}>
                Ce que disent les clientes
              </h2>
              {avisStats && (
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, fontWeight: 600, color: secondTextColor, whiteSpace: "nowrap" }}>
                  {avisStats.average.toFixed(1).replace(".", ",")} ★ · {avisStats.count} avis
                </span>
              )}
            </div>
            {avis.length === 0 ? (
              <PreviewHint color={secondTextColor} border={borderColor}>
                Les avis de vos clientes s&apos;afficheront ici après leurs premiers achats.
              </PreviewHint>
            ) : (
              avis.map((a) => (
                <div
                  key={a.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: 16,
                    backgroundColor: cardColor,
                    border: `1px solid ${borderColor}`,
                    borderRadius: 24,
                  }}
                >
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 12,
                      flexShrink: 0,
                      display: "grid",
                      placeItems: "center",
                      background: withAlpha(accentColor, "22"),
                      border: `1.07px solid ${borderColor}`,
                      fontFamily: "var(--font-playfair)",
                      fontSize: 22,
                      color: accentColor,
                    }}
                  >
                    {a.auteur.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, gap: 6, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                      <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: textColor, margin: 0 }}>
                        {a.auteur}
                      </p>
                      <span role="img" aria-label={`${a.stars} sur 5`} style={{ display: "flex", gap: 2 }}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <svg key={n} width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                            <path
                              d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6-4.9-4.6 6.6-.8z"
                              fill={n <= a.stars ? "#4CA30D" : "none"}
                              stroke="#4CA30D"
                              strokeWidth="1.6"
                              strokeLinejoin="round"
                            />
                          </svg>
                        ))}
                      </span>
                    </div>
                    <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 400, color: secondTextColor, lineHeight: "20px", margin: 0 }}>
                      {a.texte}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* D'autres marques à découvrir */}
      <div className="px-4 pb-4 relative" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div
          style={{
            backgroundColor: cardColor,
            borderRadius: "28px",
            overflow: "hidden",
            border: `1px solid ${borderColor}`,
            boxShadow: "0px 4px 20px rgba(0,0,0,0.03)",
            padding: "12px",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-playfair)",
              fontWeight: 700,
              fontSize: "20px",
              color: textColor,
              paddingLeft: "16px",
              paddingRight: "16px",
              marginBottom: "12px",
            }}
          >
            D&apos;autres marques à découvrir
          </h2>
          <BrandSlider excludeSlug={slug} />
        </div>
      </div>
    </div>
  );
}

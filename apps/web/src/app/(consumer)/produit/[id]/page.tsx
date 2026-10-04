"use client";
import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { PublicProductDetail } from "@withyou/shared-types";
import { DOCUMENT_LABEL } from "@/lib/productDocuments";
import { keyIngredientFor, SKIN_TYPE_IMAGES } from "@/lib/keyIngredients";
import { api, ApiError } from "@/lib/api";
import BottomNav from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Star, ShoppingBag } from "lucide-react";
import { addToTrousse } from "@/lib/trousse";
import { recordExploration } from "@/lib/parcours";
const TABS = ["Pour qui c'est", "Aperçu", "Ingrédients", "Avis"] as const;

const SECTION_TEXT: React.CSSProperties = { fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 400, color: "#667085", lineHeight: "20px", margin: 0 };

const MOMENT_LABEL: Record<string, string> = { Matin: "le matin", Soir: "le soir", "Les deux": "matin et soir" };

/** Durée après ouverture (en jours) lisible : « 24 mois », « 45 jours ». */
function formatDuree(jours: number | null): string | null {
  if (!jours) return null;
  return jours % 30 === 0 ? `${jours / 30} mois` : `${jours} jours`;
}

/** Carte illustrée (type de peau, ingrédient phare) ; sans illustration, le nom seul. */
function IllustratedCard({ label, image }: { label: string; image?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, borderRadius: 24, border: "1px solid rgba(0,0,0,0.08)", minHeight: image ? 119 : undefined, width: 105.67, padding: 12, boxSizing: "border-box" }}>
      <p title={label} style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "rgba(3, 26, 6, 1)", lineHeight: "20px", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {label}
      </p>
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          style={{ width: 81.67, height: 70, borderRadius: 12, border: "0.2px solid rgba(0,0,0,0.1)", objectFit: "contain", backgroundColor: "rgba(246, 250, 247, 1)" }}
        />
      )}
    </div>
  );
}

function ChipList({ items }: { items: string[] }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
      {items.map((item) => (
        <span key={item} style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#07320D", borderRadius: 24, border: "1px solid rgba(0,0,0,0.08)", background: "#F6FAF7", padding: "6px 12px" }}>
          {item}
        </span>
      ))}
    </div>
  );
}
type Tab = (typeof TABS)[number];

function AzulImage({ src }: { src: string }) {
  return (
    <div
      style={{
        position: "relative",
        width: 40,
        height: 40,
        borderRadius: 12,
        overflow: "hidden",
        border: "0.2px solid rgba(0,0,0,0.1)",
        filter:
          "drop-shadow(0.11px 0.11px 0.34px rgba(0,0,0,0.04)) drop-shadow(0.45px 0.45px 0.68px rgba(0,0,0,0.03)) drop-shadow(1.01px 1.01px 0.9px rgba(0,0,0,0.02))",
        flexShrink: 0,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
      <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(255,255,255,0.3)", pointerEvents: "none" }} />
    </div>
  );
}

export default function ProduitPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("Pour qui c'est");
  const [showConfirmation, setShowConfirmation] = useState(false);

  const pourQuiRef = useRef<HTMLDivElement>(null);
  const apercuRef = useRef<HTMLDivElement>(null);
  const ingredientsRef = useRef<HTMLDivElement>(null);
  const avisRef = useRef<HTMLDivElement>(null);

  // undefined : chargement ; null : produit introuvable ou pas en ligne.
  const [product, setProduct] = useState<PublicProductDetail | null | undefined>(undefined);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api
      .get<PublicProductDetail>(`/produits/${id}`)
      .then((p) => {
        if (cancelled) return;
        setProduct(p);
        recordExploration(`produit:${p.id}`);
      })
      .catch((err) => {
        if (!(err instanceof ApiError && err.status === 404)) console.error("Produit indisponible:", err);
        if (!cancelled) setProduct(null);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const scrollToSection = (tab: Tab) => {
    setActiveTab(tab);
    const map: Record<Tab, React.RefObject<HTMLDivElement | null>> = {
      "Pour qui c'est": pourQuiRef,
      "Aperçu": apercuRef,
      "Ingrédients": ingredientsRef,
      "Avis": avisRef,
    };
    map[tab].current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (product === undefined) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p style={{ fontFamily: "Inter, sans-serif", color: "#667085" }}>Chargement…</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p style={{ fontFamily: "Inter, sans-serif", color: "#667085" }}>Produit introuvable.</p>
        <button
          onClick={() => router.back()}
          style={{ fontFamily: "Inter, sans-serif", color: "#07320D", fontWeight: 600 }}
        >
          ← Retour
        </button>
      </div>
    );
  }

  // Ingrédients phares illustrés (miel, aloe vera…) parmi la liste INCI.
  const keyIngredients = product.ingredients.map(keyIngredientFor).filter((k) => k !== null);

  return (
    <div
      className="relative w-full max-w-[430px] mx-auto bg-[#FCFFFD] flex flex-col"
      style={{ height: "100dvh" }}
    >
      <div
        className="flex-1 overflow-y-auto"
        style={{ scrollbarWidth: "none", paddingBottom: 80 } as React.CSSProperties}
      >
        {/* Header retour */}
        <div style={{ padding: "20px 16px 0 16px", display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => router.back()}
            style={{
              background: "transparent",
              border: "none",
              padding: 0,
              display: "flex",
              alignItems: "center",
              cursor: "pointer",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8L10 4" stroke="#07320D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 500, color: "#07320D" }}>
            Retour
          </span>
        </div>

        {/* Card supérieure */}
        <div
          style={{
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: 24,
            padding: 12,
            margin: "16px 16px 0 16px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {/* Marque + cachet */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {product.marque.logoUrl && (
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    overflow: "hidden",
                    border: "0.5px solid rgba(0,0,0,0.08)",
                    flexShrink: 0,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={product.marque.logoUrl}
                    alt={product.marque.nom}
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  />
                </div>
              )}
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 400, color: "#07320D" }}>
                {product.marque.nom}
              </span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/cachet.png"
              alt=""
              style={{
                width: 28,
                height: 28,
                filter:
                  "drop-shadow(0.77px 0.77px 1.54px rgba(0,0,0,0.19)) drop-shadow(2.31px 2.31px 3.08px rgba(0,0,0,0.17))",
              }}
            />
          </div>

          {/* Nom */}
          <h1
            style={{
              fontFamily: "var(--font-playfair)",
              fontSize: 20,
              fontWeight: 600,
              color: "rgba(7,50,13,1)",
              margin: 0,
              lineHeight: "26px",
            }}
          >
            {product.nom}
          </h1>

          {/* Image principale */}
          <div
            style={{
              borderRadius: 24,
              overflow: "hidden",
              height: 300,
              border: "2.82px solid rgba(0,0,0,0.1)",
              position: "relative",
              boxShadow: "1px 1px 3px 1px rgba(0,0,0,0.04), 4px 4px 6px 0px rgba(0,0,0,0.03)",
            }}
          >
            {product.imagesUrls[activeImage] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.imagesUrls[activeImage]}
                alt={product.nom}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            ) : (
              <div style={{ width: "100%", height: "100%", background: "#EAF6EE" }} />
            )}
            <div
              className="absolute pointer-events-none"
              style={{
                top: 3,
                left: "2.22px",
                right: "2.22px",
                bottom: 0,
                borderRadius: 20,
                borderTop: "1.5px solid #FFFFFF",
                borderRight: "1.5px solid #FFFFFF",
                borderBottom: "none",
                borderLeft: "1.5px solid #FFFFFF",
              }}
            />
          </div>

          {/* Vignettes */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
            {product.imagesUrls.length > 1 &&
              product.imagesUrls.map((url, i) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  aria-label={`Photo ${i + 1}`}
                  style={{ padding: 0, border: "none", background: "none", cursor: "pointer", opacity: i === activeImage ? 1 : 0.6 }}
                >
                  <AzulImage src={url} />
                </button>
              ))}
          </div>
        </div>

        {/* Pack : produits qu'il contient et économie par rapport à l'achat séparé */}
        {product.isPack && product.packItems.length > 0 && (
          <div style={{ margin: "0 16px 4px", padding: 16, border: "1px solid rgba(0, 0, 0, 0.08)", borderRadius: 24 }}>
            <h2 style={{ fontFamily: "var(--font-playfair)", fontSize: 14, fontWeight: 600, color: "#101828", margin: "0 0 12px 0" }}>
              Ce pack contient
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {product.packItems.map((item) => (
                <Link
                  key={item.produitId}
                  href={`/produit/${item.produitId}`}
                  style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}
                >
                  <div style={{ width: 48, height: 48, borderRadius: 12, overflow: "hidden", border: "0.5px solid rgba(0,0,0,0.1)", flexShrink: 0, background: "#F6FAF7" }}>
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : null}
                  </div>
                  <p style={{ ...SECTION_TEXT, color: "#101828", flex: 1 }}>
                    {item.quantite > 1 ? <strong>{item.quantite} × </strong> : null}
                    {item.nom}
                  </p>
                  <span style={{ ...SECTION_TEXT, whiteSpace: "nowrap" }}>{item.prix.toLocaleString("fr-DZ")} Dzd</span>
                </Link>
              ))}
            </div>
            {product.packValeur != null && product.packValeur > product.prix && (
              <p style={{ ...SECTION_TEXT, marginTop: 12, color: "#07320D" }}>
                Achetés séparément : <s>{product.packValeur.toLocaleString("fr-DZ")} Dzd</s> · vous économisez{" "}
                <strong>{(product.packValeur - product.prix).toLocaleString("fr-DZ")} Dzd</strong>
              </p>
            )}
          </div>
        )}

        {/* Tab bar — sticky */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            backgroundColor: "#FCFFFD",
            padding: "12px 16px 8px 16px",
          }}
        >
          <div
            style={{
              height: 36,
              borderRadius: 8,
              border: "1px solid rgba(234,236,240,1)",
              background: "rgba(249,250,251,1)",
              padding: 4,
              display: "flex",
              gap: 4,
              boxSizing: "border-box",
            }}
          >
            {TABS.map((tab) => {
              const active = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => scrollToSection(tab)}
                  style={{
                    flex: 1,
                    height: 28,
                    borderRadius: 6,
                    border: active ? "0.5px solid rgba(208,213,221,1)" : "none",
                    padding: "4px 6px",
                    background: active ? "rgba(255,255,255,1)" : "transparent",
                    boxShadow: active
                      ? "0px 1px 2px 0px rgba(16,24,40,0.06), 0px 1px 3px 0px rgba(16,24,40,0.1)"
                      : "none",
                    fontFamily: "Inter, sans-serif",
                    fontSize: 11,
                    fontWeight: active ? 600 : 400,
                    color: active ? "#101828" : "#667085",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {tab}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section: Pour qui c'est */}
        <div ref={pourQuiRef} style={{ scrollMarginTop: 56, position: "relative", padding: "16px 16px 16px 16px", border: "1px solid rgba(0, 0, 0, 0.08)", borderRadius: 24 }}>

          <h2 style={{ fontFamily: "var(--font-playfair)", fontSize: 14, fontWeight: 600, color: "#101828", margin: "0 0 8px 0" }}>
            Pour qui c&apos;est
          </h2>
          <div className="absolute pointer-events-none" style={{ right: 20, top: 4, width: 33, height: 55, transform: "rotate(240.0deg)", transformOrigin: "center center" }}>
            <img src="/rose.png" alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
          {product.skinTypes.length > 0 ? (
            <div style={{ display: "flex", alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 }}>
              {product.skinTypes.map((skin) => (
                <IllustratedCard key={skin} label={`Peau ${skin.toLowerCase()}`} image={SKIN_TYPE_IMAGES[skin]} />
              ))}
            </div>
          ) : (
            <p style={SECTION_TEXT}>Convient à tous les types de peau.</p>
          )}
          {product.needs.length > 0 && (
            <>
              <p style={{ ...SECTION_TEXT, marginTop: 16 }}>Répond à ces besoins :</p>
              <ChipList items={product.needs} />
            </>
          )}
          {product.moment && (
            <p style={{ ...SECTION_TEXT, marginTop: 16 }}>
              À utiliser : <strong style={{ color: "#101828" }}>{MOMENT_LABEL[product.moment] ?? product.moment}</strong>
            </p>
          )}
        </div>

        {/* Section: Aperçu */}
        <div ref={apercuRef} style={{ scrollMarginTop: 56, marginTop: 12, padding: "16px 16px 16px 16px", border: "1px solid rgba(0, 0, 0, 0.08)", borderRadius: 24 }}>
          <h2 style={{ fontFamily: "var(--font-playfair)", fontSize: 14, fontWeight: 600, color: "#101828", margin: "0 0 12px 0" }}>
            Aperçu
          </h2>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 400, color: "#667085", lineHeight: "20px", margin: 0 }}>
            {product.description}
          </p>
          <dl style={{ margin: "16px 0 0", display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 16px" }}>
            {(
              [
                ["Catégorie", product.categorie],
                ["Contenance", product.size],
                ["Conservation", product.modesConservation.join(" · ") || null],
                ["Après ouverture", formatDuree(product.dureeConservationJours)],
              ] as [string, string | null][]
            )
              .filter((row): row is [string, string] => Boolean(row[1]))
              .map(([label, value]) => (
                <div key={label} style={{ display: "contents" }}>
                  <dt style={{ ...SECTION_TEXT, color: "#101828", fontWeight: 500 }}>{label}</dt>
                  <dd style={{ ...SECTION_TEXT, margin: 0 }}>{value}</dd>
                </div>
              ))}
          </dl>
          {product.documents.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
              {product.documents.map((doc) => (
                <a
                  key={doc.url}
                  href={doc.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ ...SECTION_TEXT, color: "#07320D", fontWeight: 600, textDecoration: "underline" }}
                >
                  {DOCUMENT_LABEL[doc.type] ?? "Document"} · {doc.nom}
                </a>
              ))}
            </div>
          )}

        </div>

        {/* Section: Ingrédients */}
        <div ref={ingredientsRef} style={{ scrollMarginTop: 56, marginTop: 12, padding: "16px 16px 16px 16px", border: "1px solid rgba(0, 0, 0, 0.08)", borderRadius: 24 }}>
          <h2 style={{ fontFamily: "var(--font-playfair)", fontSize: 14, fontWeight: 600, color: "#101828", margin: "0 0 8px 0" }}>
            Ingrédients
          </h2>
          {product.ingredients.length > 0 ? (
            <>
              {keyIngredients.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
                  {keyIngredients.map((k) => (
                    <IllustratedCard key={k.inci} label={k.label} image={k.image} />
                  ))}
                </div>
              )}
              <p style={{ ...SECTION_TEXT, marginTop: 16 }}>Composition complète (INCI) :</p>
              <p style={{ ...SECTION_TEXT, color: "#101828", marginTop: 4 }}>{product.ingredients.join(", ")}</p>
            </>
          ) : (
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#667085", margin: "12px 0 0" }}>
              Composition non renseignée.
            </p>
          )}
        </div>

        {/* Section: Avis */}
        <div ref={avisRef} style={{ scrollMarginTop: 56, marginTop: 12, padding: "16px", border: "1px solid rgba(0, 0, 0, 0.08)", borderRadius: 24 }}>
          <h2 style={{ fontFamily: "var(--font-playfair)", fontSize: 14, fontWeight: 600, color: "#101828", margin: "0 0 8px 0" }}>
            Avis
          </h2>

          {product.avisStats && (
            <p style={SECTION_TEXT}>
              {product.avisStats.average.toFixed(1)} / 5 · {product.avisStats.count} avis vérifié{product.avisStats.count > 1 ? "s" : ""}
            </p>
          )}
          {product.avis.length === 0 ? (
            <p style={SECTION_TEXT}>Pas encore d&apos;avis sur ce produit.</p>
          ) : (
            product.avis.map((review) => (
              <div key={review.id} style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12, padding: "16px", border: "1px solid rgba(0, 0, 0, 0.08)", borderRadius: 24 }}>
                <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: "#101828", margin: 0 }}>
                    {review.auteur}
                    {review.skinType ? <span style={{ fontWeight: 400, color: "#667085" }}> · peau {review.skinType.toLowerCase()}</span> : null}
                  </p>
                  <div style={{ display: "flex", gap: 4 }} aria-label={`${review.stars} étoiles sur 5`}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} className={`w-4 h-4 stroke-[#4CA30D] ${n <= review.stars ? "fill-[#4CA30D]" : ""}`} />
                    ))}
                  </div>
                </div>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 400, color: "rgba(77, 101, 81, 1)", lineHeight: "20px", margin: 0 }}>
                  {review.texte}
                </p>
                {review.reply && (
                  <p style={{ ...SECTION_TEXT, marginTop: 4, paddingLeft: 12, borderLeft: "2px solid #DCE8DF" }}>
                    <strong style={{ color: "#07320D" }}>{product.marque.nom} :</strong> {review.reply}
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        {/* CTA */}
        {/* CONTENEUR PRINCIPAL : Changé en flexDirection "row" et aligné verticalement au centre */}
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 12, border: "1px solid rgba(0, 0, 0, 0.08)", borderRadius: 24, padding: "16px" }}>

          {/* BLOC PRIX : Supprimé le marginTop inutile et flexShrink pour bloquer sa taille */}
          <div style={{ flexShrink: 0, borderRadius: 16, border: "0.5px solid #00000014", padding: "8px 16px" }}>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, fontWeight: 400, color: "#101828", margin: 0, whiteSpace: "nowrap" }}>
              {product.prix.toLocaleString("fr-DZ")} Dzd
            </p>
          </div>
          <button
            onClick={() => {
              addToTrousse(product);
              setShowConfirmation(true);
            }}
            disabled={!product.enStock}
            style={{
              flexGrow: 1,
              height: 48,
              borderRadius: 16,
              border: "2px solid rgba(255,255,255,0.12)",
              background: "rgba(7,50,13,1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              cursor: "pointer",
              fontFamily: "Inter, sans-serif",
              fontWeight: 600,
              fontSize: 15,
              color: "#FFFFFF",
              letterSpacing: "-0.03em",
              boxShadow:
                "0px 1px 2px 0px rgba(16,24,40,0.05), 0px -2px 0px 0px rgba(16,24,40,0.05) inset, 0px 0px 0px 1px rgba(16,24,40,0.18) inset",
            }}
          >
            <ShoppingBag />
            {product.enStock ? "Ajouter à ma trousse" : "Bientôt de retour"}
          </button>



        </div>
      </div>

      <BottomNav />

      {/* Overlay confirmation ajout trousse */}
      {showConfirmation && (
        <div
          className="absolute inset-0 z-[100] flex flex-col overflow-hidden"
          style={{
            background: "rgba(255, 255, 255, 0.40)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          {/* Close button at top right */}
          <button
            onClick={() => setShowConfirmation(false)}
            style={{
              position: "absolute",
              top: 24,
              right: 24,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              zIndex: 110,
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6L18 18" stroke="#031A06" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Butterfly video in background/middle */}
          <div
            className="absolute top-[68%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-[393px] pointer-events-none"
            style={{
              maskImage: "radial-gradient(circle, black 0%, transparent 70%)",
              WebkitMaskImage: "radial-gradient(circle, black 0%, transparent 70%)",
              opacity: 1.0,
              zIndex: 5,
            }}
          >
            <video
              src="/papillon.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-contain"
            />
          </div>

          <div className="flex-1 flex flex-col items-center justify-center px-6">
            {/* Text centered in the middle of the screen, slightly lower */}
            <div className="text-center z-10" style={{ transform: "translateY(120px)" }}>
              <h2
                style={{
                  fontFamily: "var(--font-playfair)",
                  fontSize: 36,
                  fontWeight: 700,
                  color: "#031A06",
                  margin: 0,
                  lineHeight: "1.1",
                }}
              >
                Bonne trouvaille !
              </h2>
              <p
                style={{
                  fontFamily: "var(--font-playfair)",
                  fontSize: 30,
                  fontWeight: 400,
                  color: "#031A06",
                  marginTop: 4,
                  lineHeight: "1.1",
                }}
              >
                C&apos;est ajouté à votre sac
              </p>
            </div>
          </div>

          {/* Assets section (Flowers) above the button */}
          <div className="relative w-full h-[250px] pointer-events-none overflow-hidden mt-auto z-10">
            <img
              src="/background.png"
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "bottom",
                transform: "scale(3) translateY(30px)",
                transformOrigin: "bottom center",
              }}
            />
          </div>

          {/* Bottom Button Area with Gradient */}
          <div
            className="w-full px-6 pb-12 z-20 pt-28"
            style={{
              background: "linear-gradient(360deg, #FFFFFF 55%, rgba(255, 255, 255, 0) 100%)",
              marginTop: "-130px"
            }}
          >
            <button
              onClick={() => setShowConfirmation(false)}
              style={{
                width: "100%",
                height: 52,
                borderRadius: 20,
                background: "rgba(7,50,13,1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                cursor: "pointer",
                fontFamily: "Inter, sans-serif",
                fontWeight: 600,
                fontSize: 16,
                color: "#FFFFFF",
                border: "none",
                boxShadow: "0px 1px 2px rgba(16, 24, 40, 0.05)",
              }}
            >
              <span>Continuer</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 12L10 8L6 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

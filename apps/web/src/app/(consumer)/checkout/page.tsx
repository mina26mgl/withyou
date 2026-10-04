"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { ChevronDown, ChevronRight } from "lucide-react";
import { WILAYAS, normalizeDzPhone } from "@withyou/shared-utils";
import { api, ApiError } from "@/lib/api";
import { clearTrousse, useTrousse } from "@/lib/trousse";
import OrderConfirmation from "./OrderConfirmation";

const INTER: React.CSSProperties = { fontFamily: "Inter, sans-serif" };

/** Frais de livraison affichés tant que le tarif par transporteur n'est pas branché. */
const FRAIS_LIVRAISON = 300;

type ModeLivraison = "domicile" | "bureau";
type ModePaiement = "cash";

const LIVRAISON_OPTIONS: { value: ModeLivraison; label: string; image: string }[] = [
  { value: "domicile", label: "À domicile", image: "/domicil.png" },
  { value: "bureau", label: "Bureau de livraison", image: "/bureau%20de%20livraison.png" },
];

const SHADOW_XS = "0px 1px 2px 0px rgba(16,24,40,0.05)";

const LABEL: React.CSSProperties = { ...INTER, fontSize: 14, fontWeight: 500, color: "#414651", lineHeight: "20px" };

const SECTION_TITLE: React.CSSProperties = { ...INTER, fontSize: 16, fontWeight: 500, color: "#414651", margin: 0 };

function fieldStyle(invalid: boolean): React.CSSProperties {
  return {
    ...INTER,
    width: "100%",
    height: 44,
    borderRadius: 14,
    border: `1px solid ${invalid ? "#FDA29B" : "#D5D7DA"}`,
    padding: "10px 14px",
    boxSizing: "border-box",
    background: "#FFFFFF",
    fontSize: 16,
    color: "#181D27",
    boxShadow: SHADOW_XS,
    outline: "none",
    appearance: "none",
    WebkitAppearance: "none",
  };
}

function formatDzd(value: number) {
  return value.toLocaleString("fr-DZ");
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={LABEL}>{label}</span>
      {children}
      {error && <span style={{ ...INTER, fontSize: 13, color: "#D92D20" }}>{error}</span>}
    </label>
  );
}

function ChoiceCard({
  label,
  image,
  selected,
  disabled,
  onSelect,
}: {
  label: string;
  image: string;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      style={{
        flex: 1,
        minWidth: 0,
        minHeight: 116,
        borderRadius: 20,
        border: selected ? "1.5px solid #07320D" : "1px solid rgba(0,0,0,0.08)",
        background: selected ? "#F6FAF7" : "#FFFFFF",
        padding: 12,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 8,
        cursor: disabled ? "default" : "pointer",
        textAlign: "left",
        boxShadow: selected ? "0px 4px 12px 0px rgba(7,50,13,0.08)" : "none",
      }}
    >
      <Image
        src={image}
        alt=""
        width={64}
        height={52}
        style={{ objectFit: "contain", width: "auto", height: 52, opacity: disabled ? 0.5 : 1 }}
      />
      <span style={{ ...INTER, fontSize: 14, fontWeight: 500, lineHeight: "18px", color: disabled ? "#98A2B3" : "#07320D" }}>
        {label}
      </span>
    </button>
  );
}

const KNOB_SHADOW = [
  "0px 0.55px 1.09px 0px rgba(16,24,40,0.05)",
  "0px -1.09px 0px 0px rgba(16,24,40,0.05) inset",
  "0px 0px 0px 0.55px rgba(16,24,40,0.18) inset",
  "0.55px 0.55px 1.64px 0px #0000001A",
  "1.64px 2.73px 3.27px 0px #00000017",
  "3.82px 6.55px 4.36px 0px #0000000D",
  "6.55px 12px 5.45px 0px #00000005",
  "9.82px 18.55px 6px 0px #00000000",
].join(", ");

/** Glisser la pastille jusqu'au bout pour valider ; relâchée avant, elle revient. */
function SlideToConfirm({ onConfirm }: { onConfirm: () => Promise<boolean> }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const startRef = useRef(0);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [pending, setPending] = useState(false);

  const KNOB = 36;
  const PAD = 4;
  const maxOffset = () => (trackRef.current ? trackRef.current.clientWidth - KNOB - PAD * 2 : 0);

  const submit = async () => {
    setPending(true);
    setOffset(maxOffset());
    const ok = await onConfirm();
    setPending(false);
    if (!ok) setOffset(0);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pending) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    startRef.current = e.clientX - offset;
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setOffset(Math.min(Math.max(e.clientX - startRef.current, 0), maxOffset()));
  };

  const onPointerUp = () => {
    if (!dragging) return;
    setDragging(false);
    const max = maxOffset();
    if (max > 0 && offset >= max * 0.9) {
      void submit();
    } else {
      setOffset(0);
    }
  };

  const progress = trackRef.current ? offset / Math.max(maxOffset(), 1) : 0;

  return (
    <div
      ref={trackRef}
      style={{
        position: "relative",
        flex: "1 1 259px",
        minWidth: 0,
        height: 44,
        borderRadius: 16,
        border: "2px solid transparent",
        background:
          "linear-gradient(#07320D, #07320D) padding-box, linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 100%) border-box",
        boxShadow:
          "0px 1px 2px 0px rgba(16,24,40,0.05), 0px -2px 0px 0px rgba(16,24,40,0.05) inset, 0px 0px 0px 1px rgba(16,24,40,0.18) inset",
        boxSizing: "border-box",
        overflow: "hidden",
        userSelect: "none",
        touchAction: "none",
      }}
    >
      <span
        style={{
          ...INTER,
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          paddingLeft: KNOB,
          fontSize: 16,
          fontWeight: 500,
          letterSpacing: "-0.03em",
          color: "#FFFFFF",
          opacity: pending ? 1 : 1 - progress,
          paddingRight: pending ? KNOB : 0,
          pointerEvents: "none",
        }}
      >
        {pending ? "Confirmation…" : "Slide to Confirm"}
      </span>
      <div
        role="slider"
        aria-label="Glisser pour confirmer la commande"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !pending) {
            e.preventDefault();
            void submit();
          }
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          position: "absolute",
          top: PAD - 2,
          left: PAD - 2,
          width: KNOB,
          height: KNOB,
          borderRadius: 13.09,
          border: "1.09px solid #D5D7DA",
          padding: 8,
          gap: 2.18,
          boxSizing: "border-box",
          background: "#FFFFFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `translateX(${offset}px)`,
          transition: dragging ? "none" : "transform 0.25s ease",
          cursor: pending ? "progress" : dragging ? "grabbing" : "grab",
          boxShadow: KNOB_SHADOW,
        }}
      >
        <ChevronRight size={18} color="#07320D" />
      </div>
    </div>
  );
}

interface Errors {
  nom?: string;
  telephone?: string;
  wilaya?: string;
  commune?: string;
  adresse?: string;
  livraison?: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const items = useTrousse();
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [wilaya, setWilaya] = useState("");
  const [commune, setCommune] = useState("");
  const [adresse, setAdresse] = useState("");
  const [livraison, setLivraison] = useState<ModeLivraison | null>(null);
  const [paiement, setPaiement] = useState<ModePaiement>("cash");
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState<React.ReactNode>(null);
  const [confirmed, setConfirmed] = useState<{ numero: string; images: (string | null)[] } | null>(null);
  const { isSignedIn, getToken } = useAuth();

  const sousTotal = items.reduce((sum, i) => sum + i.prix * i.quantite, 0);
  const total = sousTotal + FRAIS_LIVRAISON;

  const validate = (): boolean => {
    const next: Errors = {};
    if (!nom.trim()) next.nom = "Indiquez votre nom et prénom.";
    if (!normalizeDzPhone(telephone)) next.telephone = "Numéro algérien invalide (ex. 0550 12 34 56).";
    if (!wilaya) next.wilaya = "Choisissez votre wilaya.";
    if (!commune.trim()) next.commune = "Indiquez votre commune.";
    if (livraison === "domicile" && !adresse.trim()) next.adresse = "Indiquez l'adresse de livraison.";
    if (!livraison) next.livraison = "Choisissez un mode de livraison.";
    setErrors(next);
    if (Object.keys(next).length) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return false;
    }
    return true;
  };

  const confirm = async (): Promise<boolean> => {
    setSubmitError(null);
    if (!validate()) return false;
    if (!isSignedIn) {
      setSubmitError(
        <>
          <Link href="/login" style={{ color: "#07320D", fontWeight: 600, textDecoration: "underline" }}>Connecte-toi</Link> pour passer commande.
        </>,
      );
      return false;
    }
    try {
      const { numero } = await api.post<{ numero: string }>(
        "/commandes",
        {
          nomComplet: nom.trim(),
          telephone,
          wilaya,
          commune: commune.trim(),
          adresse: adresse.trim() || undefined,
          typeLivraison: livraison,
          modePaiement: "À la livraison",
          lignes: items.map((i) => ({ produitId: i.id, quantite: i.quantite })),
        },
        { token: await getToken() },
      );
      // Photos gardées avant de vider la trousse : elles remplissent le carton.
      setConfirmed({ numero, images: items.map((i) => i.imageUrl) });
      clearTrousse();
      window.scrollTo({ top: 0 });
      return true;
    } catch (err) {
      console.error("Commande refusée:", err);
      let message = "La commande n'a pas pu être envoyée. Réessaie dans un instant.";
      if (err instanceof ApiError && err.status === 400) {
        try {
          const body = JSON.parse(err.message) as { message?: string | string[] };
          message = Array.isArray(body.message) ? body.message[0] : body.message ?? message;
        } catch {
          // Corps non JSON : message générique.
        }
      }
      setSubmitError(message);
      return false;
    }
  };

  if (confirmed) return <OrderConfirmation numero={confirmed.numero} images={confirmed.images} />;

  return (
    <div className="relative w-full max-w-[430px] mx-auto bg-[#FCFFFD]" style={{ minHeight: "100dvh", paddingBottom: 190 }}>
      {/* Retour */}
      <div style={{ padding: "20px 16px 0 16px" }}>
        <button
          onClick={() => router.back()}
          style={{ background: "transparent", border: "none", padding: 0, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8L10 4" stroke="#07320D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ ...INTER, fontSize: 14, fontWeight: 500, color: "#07320D" }}>Retour</span>
        </button>
      </div>

      <h1
        style={{
          fontFamily: "var(--font-averia), serif",
          fontWeight: 700,
          fontSize: 28,
          lineHeight: "100%",
          letterSpacing: "-0.09em",
          textAlign: "center",
          color: "#031A06",
          margin: "24px 0 20px",
        }}
      >
        Paiement
      </h1>

      {items.length === 0 ? (
        <div style={{ ...INTER, fontSize: 14, color: "#667085", textAlign: "center", padding: "48px 16px" }}>
          Votre trousse est vide.{" "}
          <Link href="/home" style={{ color: "#07320D", fontWeight: 600 }}>
            Découvrir les produits
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: "0 16px" }}>
          {/* Coordonnées */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Field label="Nom et prénom" error={errors.nom}>
              <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom et prénom" autoComplete="name" style={fieldStyle(!!errors.nom)} />
            </Field>
            <Field label="Numero de telephone" error={errors.telephone}>
              <input
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                placeholder="Numero de telephone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                style={fieldStyle(!!errors.telephone)}
              />
            </Field>
            <Field label="Wilaya" error={errors.wilaya}>
              <div style={{ position: "relative" }}>
                <select
                  value={wilaya}
                  onChange={(e) => setWilaya(e.target.value)}
                  style={{ ...fieldStyle(!!errors.wilaya), paddingRight: 40, color: wilaya ? "#181D27" : "#717680" }}
                >
                  <option value="" disabled>
                    Wilaya
                  </option>
                  {WILAYAS.map((w, i) => (
                    <option key={w} value={w}>
                      {String(i + 1).padStart(2, "0")} - {w}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} color="#A4A7AE" style={{ position: "absolute", right: 14, top: 14, pointerEvents: "none" }} />
              </div>
            </Field>
            <Field label="Commune" error={errors.commune}>
              <input value={commune} onChange={(e) => setCommune(e.target.value)} placeholder="Commune" autoComplete="address-level2" style={fieldStyle(!!errors.commune)} />
            </Field>
            <Field label="Addresse" error={errors.adresse}>
              <input value={adresse} onChange={(e) => setAdresse(e.target.value)} placeholder="Addresse" autoComplete="street-address" style={fieldStyle(!!errors.adresse)} />
            </Field>
          </div>

          {/* Mode de livraison */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <p style={SECTION_TITLE}>Livraison</p>
            <div style={{ display: "flex", gap: 12 }}>
              {LIVRAISON_OPTIONS.map((opt) => (
                <ChoiceCard
                  key={opt.value}
                  label={opt.label}
                  image={opt.image}
                  selected={livraison === opt.value}
                  onSelect={() => {
                    setLivraison(opt.value);
                    setErrors((e) => ({ ...e, livraison: undefined }));
                  }}
                />
              ))}
            </div>
            {errors.livraison && <span style={{ ...INTER, fontSize: 13, color: "#D92D20" }}>{errors.livraison}</span>}
          </div>

          {/* Mode de paiement */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <p style={SECTION_TITLE}>Paiement</p>
            <div style={{ display: "flex", gap: 12 }}>
              <ChoiceCard label="Paiement à la livraison Cash" image="/cash.png" selected={paiement === "cash"} onSelect={() => setPaiement("cash")} />
              <ChoiceCard label="Carte CIB / Edahabia (Soon)" image="/cib.png" selected={false} disabled onSelect={() => {}} />
            </div>
          </div>

          {/* Récapitulatif */}
          <div style={{ borderRadius: 24, border: "1px solid rgba(0,0,0,0.08)", padding: 16, display: "flex", flexDirection: "column", gap: 12, background: "#FFFFFF" }}>
            <p style={SECTION_TITLE}>Ta commande</p>
            {items.map((item) => (
              <div key={item.id} style={{ borderRadius: 20, border: "1px solid rgba(0,0,0,0.08)", padding: 12, display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    flexShrink: 0,
                    borderRadius: 14,
                    overflow: "hidden",
                    position: "relative",
                    background: "#F6FAF7",
                    boxShadow: "1px 1px 3px 0px #0000000A, 4px 4px 6px 0px #00000008",
                  }}
                >
                  {item.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt={item.nom} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  )}
                  <div style={{ position: "absolute", inset: 0, borderRadius: 14, boxShadow: "0px 0px 8px 3px #FFFFFFCC inset", pointerEvents: "none" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                  <p style={{ fontFamily: "var(--font-playfair)", fontSize: 14, fontWeight: 600, lineHeight: "19px", color: "#031A06", margin: 0 }}>
                    {item.nom}
                    {item.quantite > 1 && <span style={{ ...INTER, fontWeight: 500, color: "#031A06" }}> × {item.quantite}</span>}
                  </p>
                  <div style={{ borderRadius: 16, border: "0.5px solid #00000014", padding: "6px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <span style={{ ...INTER, fontSize: 14, color: "#07320D", lineHeight: "16px" }}>{formatDzd(item.prix * item.quantite)}</span>
                    <span style={{ ...INTER, fontSize: 13, color: "#4A6E4F", lineHeight: "16px" }}>Dzd</span>
                  </div>
                </div>
              </div>
            ))}

            <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 4 }}>
              {[
                ["Sous Total", sousTotal],
                ["Livraison", FRAIS_LIVRAISON],
                ["Total", total],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ ...INTER, fontSize: 16, color: "#414651" }}>{label}</span>
                  <span style={{ ...INTER, fontSize: 16, fontWeight: 500, color: "#181D27" }}>{formatDzd(value as number)} DZD</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Total + glisser pour confirmer, au-dessus de la barre de navigation */}
      {items.length > 0 && (
        <div className="fixed left-1/2 -translate-x-1/2 z-40 w-full max-w-[430px]" style={{ bottom: 86, padding: "0 16px" }}>
          {submitError && (
            <p role="alert" style={{ ...INTER, fontSize: 13, color: "#D92D20", background: "#FEF3F2", border: "1px solid #FECDCA", borderRadius: 12, padding: "8px 12px", margin: "0 0 8px" }}>
              {submitError}
            </p>
          )}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: 8,
              borderRadius: 24,
              border: "1px solid rgba(0,0,0,0.08)",
              background: "rgba(255,255,255,0.9)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              boxShadow: "0px 8px 24px 0px rgba(0,0,0,0.04)",
            }}
          >
            <div
              style={{
                flexShrink: 0,
                borderRadius: 18,
                border: "0.5px solid #00000014",
                padding: "8px 14px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
              }}
            >
              <span style={{ ...INTER, fontSize: 16, color: "#07320D", whiteSpace: "nowrap" }}>{formatDzd(total)} DZD</span>
              <span style={{ ...INTER, fontSize: 13, color: "#4A6E4F" }}>Total</span>
            </div>
            <SlideToConfirm onConfirm={confirm} />
          </div>
        </div>
      )}
    </div>
  );
}

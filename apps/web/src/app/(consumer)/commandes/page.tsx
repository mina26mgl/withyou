"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { ChevronRight } from "lucide-react";
import type { ConsumerOrder } from "@withyou/shared-types";
import { api } from "@/lib/api";
import SiteFooter from "@/components/layout/SiteFooter";

const INTER: React.CSSProperties = { fontFamily: "Inter, sans-serif" };

/** Produits montrés avant « Voir la commande » ; le dernier s'estompe. */
const PREVIEW = 3;

const STATUT_LABEL: Record<string, string> = {
  confirmee: "Confirmé",
  en_cours: "En cours",
  livree: "Livrée",
  annulee: "Annulée",
};

const DARK_BUTTON: React.CSSProperties = {
  ...INTER,
  width: "100%",
  height: 44,
  padding: "12px 12px",
  boxSizing: "border-box",
  borderRadius: 16,
  border: "2px solid transparent",
  background:
    "linear-gradient(#07320D, #07320D) padding-box, linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 100%) border-box",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  cursor: "pointer",
  fontWeight: 500,
  fontSize: 16,
  color: "#FFFFFF",
  letterSpacing: "-0.03em",
  textDecoration: "none",
  boxShadow:
    "0px 1px 2px 0px rgba(16,24,40,0.05), 0px -2px 0px 0px rgba(16,24,40,0.05) inset, 0px 0px 0px 1px rgba(16,24,40,0.18) inset",
};

function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) : "";
}

function OrderLine({ ligne }: { ligne: ConsumerOrder["lignes"][number] }) {
  return (
    <div style={{ borderRadius: 20, border: "1px solid rgba(0,0,0,0.08)", padding: 12, display: "flex", gap: 12, alignItems: "flex-start", background: "#FFFFFF" }}>
      <div
        style={{
          position: "relative",
          width: 80,
          height: 80,
          flexShrink: 0,
          borderRadius: 16,
          overflow: "hidden",
          background: "#F6FAF7",
          boxShadow: "1px 1px 3px 0px #0000000A, 4px 4px 6px 0px #00000008, 9px 9px 8px 0px #00000005",
        }}
      >
        {ligne.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- images servies par l'API
          <img src={ligne.imageUrl} alt={ligne.nom} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        )}
        <div style={{ position: "absolute", inset: 0, borderRadius: 16, boxShadow: "0px 0px 10px 5px #FFFFFFCC inset", pointerEvents: "none" }} />
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        <p style={{ fontFamily: "var(--font-playfair)", fontSize: 15, fontWeight: 600, lineHeight: "20px", color: "#031A06", margin: 0 }}>
          {ligne.nom}
          {ligne.quantite > 1 && <span style={{ ...INTER, fontWeight: 500 }}> × {ligne.quantite}</span>}
        </p>
        <div style={{ borderRadius: 16, border: "0.5px solid #00000014", padding: "6px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <span style={{ ...INTER, fontSize: 15, color: "#07320D", lineHeight: "18px" }}>{(ligne.prixUnitaire * ligne.quantite).toLocaleString("fr-DZ")}</span>
          <span style={{ ...INTER, fontSize: 13, color: "#4A6E4F", lineHeight: "16px" }}>Dzd</span>
        </div>
      </div>
    </div>
  );
}

function OrderCard({ order }: { order: ConsumerOrder }) {
  const [open, setOpen] = useState(false);
  const count = order.lignes.reduce((sum, l) => sum + l.quantite, 0);
  const sousTotal = order.lignes.reduce((sum, l) => sum + l.prixUnitaire * l.quantite, 0);
  const lignes = open ? order.lignes : order.lignes.slice(0, PREVIEW);
  // Aperçu : la liste s'estompe vers le bas dès qu'il y a plus d'un produit.
  const fade = !open && order.lignes.length > 1;

  return (
    <div style={{ borderRadius: 24, border: "1px solid rgba(0,0,0,0.08)", padding: 16, background: "#FFFFFF", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ ...INTER, fontSize: 16, fontWeight: 500, color: "#414651", margin: 0 }}>Commande N°{order.numero}</p>
          <p style={{ ...INTER, fontSize: 14, color: "#667085", margin: "4px 0 0" }}>
            {formatDate(order.createdAt)} · {count} produit{count > 1 ? "s" : ""}
          </p>
        </div>
        <span style={{ ...INTER, flexShrink: 0, fontSize: 13, fontWeight: 500, color: "#414651", border: "1px solid #E9EAEB", background: "#FAFAFA", borderRadius: 999, padding: "3px 10px" }}>
          {STATUT_LABEL[order.statut] ?? order.statut}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          maskImage: fade ? "linear-gradient(to bottom, black 35%, transparent 100%)" : undefined,
          WebkitMaskImage: fade ? "linear-gradient(to bottom, black 35%, transparent 100%)" : undefined,
        }}
      >
        {lignes.map((l) => (
          <OrderLine key={l.produitId} ligne={l} />
        ))}
      </div>

      {/* Commande dépliée : détail de ce qui a été payé (livraison = total − produits) */}
      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 4 }}>
          {[
            ["Sous Total", sousTotal],
            ["Livraison", order.total - sousTotal],
            ["Total payé", order.total],
          ].map(([label, value], i, rows) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ ...INTER, fontSize: 16, color: "#414651", fontWeight: i === rows.length - 1 ? 600 : 400 }}>{label}</span>
              <span style={{ ...INTER, fontSize: 16, color: i === rows.length - 1 ? "#07320D" : "#181D27", fontWeight: i === rows.length - 1 ? 600 : 500 }}>
                {(value as number).toLocaleString("fr-DZ")} DZD
              </span>
            </div>
          ))}
        </div>
      )}

      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} style={DARK_BUTTON}>
        {open ? "Réduire" : "Voir la commande"}
        <ChevronRight size={18} style={{ transform: open ? "rotate(-90deg)" : undefined, transition: "transform 0.2s" }} />
      </button>
    </div>
  );
}

export default function CommandesPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  // undefined : chargement.
  const [orders, setOrders] = useState<ConsumerOrder[] | undefined>(undefined);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setOrders([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const list = await api.get<ConsumerOrder[]>("/commandes", { token: await getToken() });
        if (!cancelled) setOrders(list);
      } catch (err) {
        console.error("Commandes indisponibles:", err);
        if (!cancelled) {
          setError(true);
          setOrders([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, getToken]);

  return (
    <div className="relative w-full max-w-[430px] mx-auto bg-[#FCFFFD]" style={{ minHeight: "100dvh" }}>
      {/* Ciel en haut, fondu vers le fond de page */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 260,
          backgroundImage: "url('/nuage_inscription.png')",
          backgroundSize: "cover",
          backgroundPosition: "center top",
          opacity: 0.55,
          maskImage: "linear-gradient(to bottom, black 35%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 35%, transparent 100%)",
        }}
      />

      {/* Retour */}
      <div style={{ position: "relative", padding: "20px 16px 0 16px" }}>
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
          position: "relative",
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
        Mes commandes
      </h1>

      <div style={{ position: "relative", padding: "0 16px", display: "flex", flexDirection: "column", gap: 16 }}>
        {orders === undefined ? (
          <p style={{ ...INTER, fontSize: 14, color: "#667085", textAlign: "center", padding: "32px 0" }}>Chargement…</p>
        ) : orders.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 12, padding: "24px 0" }}>
            <p style={{ ...INTER, fontSize: 14, lineHeight: "20px", color: "#4A6E4F", margin: 0 }}>
              {error
                ? "Tes commandes n'ont pas pu être chargées. Réessaie dans un instant."
                : !isSignedIn
                  ? "Connecte-toi pour retrouver tes commandes."
                  : "Tu n'as pas encore passé de commande."}
            </p>
            <Link href={isSignedIn ? "/search" : "/login"} style={{ ...DARK_BUTTON, marginTop: 4 }}>
              {isSignedIn ? "Parcourir les produits" : "Me connecter"}
              <ChevronRight size={18} />
            </Link>
          </div>
        ) : (
          orders.map((o) => <OrderCard key={o.id} order={o} />)
        )}
      </div>

      <SiteFooter />
    </div>
  );
}

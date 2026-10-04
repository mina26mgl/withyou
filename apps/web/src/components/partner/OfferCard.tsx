"use client";

import { useState } from "react";
import { BarChart3, Check, Clock, Lock, Sparkles } from "lucide-react";
import type { PartnerOffer } from "@withyou/shared-types";
import { formatPrice } from "@withyou/shared-utils";
import { apiErrorMessage, partnerApi } from "@/lib/partnerApi";
import { PillButton } from "./PillButton";
import { StatusPill } from "./StatusPill";

type GetToken = () => Promise<string | null>;

const ICON = { ANALYTICS: BarChart3, PROMOTION: Sparkles } as const;
const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "");

/**
 * Une offre d'abonnement vue par la marque : prix, choix mensuel / annuel, demande,
 * puis son état (en attente d'activation, actif jusqu'au…, refusé).
 */
export function OfferCard({
  offer,
  getToken,
  onChanged,
  large = false,
}: {
  offer: PartnerOffer;
  getToken: GetToken;
  onChanged: (toast: string) => void;
  large?: boolean;
}) {
  const [periode, setPeriode] = useState<"MENSUEL" | "ANNUEL">("MENSUEL");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const sub = offer.subscription;
  const Icon = offer.fonctionnalite ? ICON[offer.fonctionnalite] : Sparkles;
  const yearlySaving = offer.prixAnnuel !== null ? offer.prixMensuel * 12 - offer.prixAnnuel : 0;

  async function run(fn: (token: string) => Promise<unknown>, toast: string) {
    setErr(null);
    const token = await getToken();
    if (!token) return;
    setBusy(true);
    try {
      await fn(token);
      onChanged(toast);
    } catch (e) {
      setErr(apiErrorMessage(e, "La demande a échoué."));
    } finally {
      setBusy(false);
    }
  }

  const active = sub?.statut === "ACTIF";
  const pending = sub?.statut === "DEMANDE";
  const canAsk = !active && !pending && offer.actif;

  return (
    <section className={`rounded-[22px] border border-partner-border bg-partner-card ${large ? "p-7" : "p-[22px]"}`}>
      <div className="flex items-start gap-3.5">
        <span className="grid h-11 w-11 flex-none place-items-center rounded-2xl bg-partner-leafBg text-partner-heading">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-partner-heading text-[22px] leading-tight text-partner-heading">{offer.nom}</h2>
            {active && <StatusPill tone="ok">Actif</StatusPill>}
            {pending && <StatusPill tone="info">En attente d&apos;activation</StatusPill>}
            {sub?.statut === "EXPIRE" && <StatusPill tone="warn">Expiré</StatusPill>}
          </div>
          <p className="mb-0 mt-1.5 max-w-[60ch] text-[14px] text-partner-muted">{offer.description}</p>
        </div>
      </div>

      {active ? (
        <p className="mb-0 mt-4 flex items-center gap-2 text-sm text-partner-heading">
          <Check className="h-4 w-4" aria-hidden="true" />
          Abonnement {sub.periode === "ANNUEL" ? "annuel" : "mensuel"} actif jusqu&apos;au {fmtDate(sub.fin)}.
        </p>
      ) : pending ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-partner-soft px-4 py-3 text-sm">
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-partner-info" aria-hidden="true" />
            Demande envoyée ({sub.periode === "ANNUEL" ? "à l'année" : "au mois"}). L&apos;équipe withyou l&apos;active dès réception du paiement.
          </span>
          <PillButton
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => run((t) => partnerApi.cancelSubscriptionRequest(t, sub.id), "Demande annulée.")}
          >
            Annuler la demande
          </PillButton>
        </div>
      ) : (
        <>
          {sub?.statut === "REFUSE" && sub.message && (
            <p className="mb-0 mt-4 rounded-2xl bg-partner-warnBg px-4 py-3 text-sm text-partner-warn">
              Votre dernière demande n&apos;a pas été acceptée : {sub.message}
            </p>
          )}
          {canAsk ? (
            <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
              <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Formule">
                {(
                  [
                    ["MENSUEL", formatPrice(offer.prixMensuel), "par mois"],
                    ...(offer.prixAnnuel !== null
                      ? [["ANNUEL", formatPrice(offer.prixAnnuel), yearlySaving > 0 ? `par an, soit ${formatPrice(yearlySaving)} d'économie` : "par an"]]
                      : []),
                  ] as [("MENSUEL" | "ANNUEL"), string, string][]
                ).map(([p, price, note]) => (
                  <button
                    key={p}
                    type="button"
                    role="radio"
                    aria-checked={periode === p}
                    onClick={() => setPeriode(p)}
                    className={`min-w-[150px] rounded-2xl border px-4 py-3 text-left ${periode === p ? "border-partner-leaf bg-partner-leafBg" : "border-partner-border bg-partner-card hover:border-partner-muted"}`}
                  >
                    <span className="block text-lg font-bold tabular-nums text-partner-ink">{price}</span>
                    <span className="block text-[12.5px] text-partner-muted">{note}</span>
                  </button>
                ))}
              </div>
              <PillButton
                disabled={busy}
                withChevron
                onClick={() =>
                  run(
                    (t) => partnerApi.requestSubscription(t, offer.id, periode),
                    "Demande envoyée. L'équipe withyou vous contacte pour le paiement.",
                  )
                }
              >
                {sub?.statut === "EXPIRE" ? "Se réabonner" : "Demander l'abonnement"}
              </PillButton>
            </div>
          ) : (
            <p className="mb-0 mt-4 flex items-center gap-2 text-sm text-partner-muted">
              <Lock className="h-4 w-4" aria-hidden="true" />
              Cette offre n&apos;est plus proposée.
            </p>
          )}
        </>
      )}
      {err && <p className="mb-0 mt-3 text-[13px] font-semibold text-partner-danger">{err}</p>}
    </section>
  );
}

"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Plus } from "lucide-react";
import type { PartnerPromotion, PlacementKind, PromotionStatus } from "@withyou/shared-types";
import { PageHeader } from "@/components/partner/PageHeader";
import { PillButton } from "@/components/partner/PillButton";
import { StatusPill } from "@/components/partner/StatusPill";
import { Toast, useToast } from "@/components/partner/Toast";
import { EmptyState, Panel, PanelHeader } from "@/components/partner/ui-blocks";
import { apiErrorMessage, partnerApi } from "@/lib/partnerApi";
import { shortDateFr } from "@/lib/partnerFormat";
import { usePartnerData } from "@/lib/usePartnerData";
import { PromotionDrawer } from "./PromotionDrawer";
import { SubscriptionGate } from "@/components/partner/SubscriptionGate";

// Commercial terms are business copy for now, not per-brand data.
// TODO: source prices, reach and deadlines from an admin-managed catalogue.
const SLOTS: { kind: PlacementKind; title: string; text: string; price: string; reach: string; cta: string }[] = [
  {
    kind: "ROUTINE",
    title: "Dans les routines recommandées",
    text: "Votre produit est proposé en priorité dans les routines générées, uniquement pour les profils à qui il convient à 80 % ou plus.",
    price: "4 000 DZD par semaine",
    reach: "Portée estimée : 2 000 à 3 500 profils",
    cta: "Réserver",
  },
  {
    kind: "HOME",
    title: "Marques à découvrir",
    text: "Votre histoire en carte « Raconté par withyou » sur l'accueil de l'app.",
    price: "6 000 DZD par semaine",
    reach: "Portée estimée : 8 000 à 12 000 visites",
    cta: "Réserver",
  },
  {
    kind: "BOX",
    title: "Box Rituel du mois",
    text: "Proposez un produit pour la box d'octobre. L'équipe withyou sélectionne selon les profils des abonnées.",
    price: "Sans frais",
    reach: "Candidatures jusqu'au 5 octobre",
    cta: "Proposer un produit",
  },
  {
    kind: "INFLUENCE",
    title: "Campagne avec une créatrice",
    text: "Une créatrice formée par withyou teste vos produits et raconte son expérience, sans script publicitaire.",
    price: "Sur devis",
    reach: "10 créatrices disponibles",
    cta: "Demander un devis",
  },
];

const BOOKED_MESSAGE: Record<PlacementKind, string> = {
  ROUTINE: "Demande de réservation envoyée à votre chargée de compte.",
  HOME: "Demande de réservation envoyée à votre chargée de compte.",
  BOX: "Candidature envoyée pour la box d'octobre.",
  INFLUENCE: "Demande de devis envoyée. Réponse sous 72 h.",
};

const PROMO_PILL: Record<PromotionStatus, { tone: "ok" | "mute"; label: string }> = {
  ACTIVE: { tone: "ok", label: "Active" },
  SCHEDULED: { tone: "mute", label: "Programmée" },
  ENDED: { tone: "mute", label: "Terminée" },
};

function period(p: PartnerPromotion): string {
  return `${shortDateFr(p.dateDebut)} au ${shortDateFr(p.dateFin)}`;
}

/** Écran payant : abonnement « Mise en avant ». */
export default function MiseEnAvantPage() {
  return (
    <SubscriptionGate
      feature="PROMOTION"
      title="Mise en avant"
      subtitle="Faites découvrir vos produits aux bonnes clientes : codes promo et placements dans les routines, l'accueil et la box."
    >
      <MiseEnAvantContent />
    </SubscriptionGate>
  );
}

function MiseEnAvantContent() {
  const { getToken } = useAuth();
  const promotions = usePartnerData((token) => partnerApi.listPromotions(token));
  const products = usePartnerData((token) => partnerApi.listProducts(token));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [booking, setBooking] = useState<PlacementKind | null>(null);
  const { message, show } = useToast();

  async function book(kind: PlacementKind) {
    const token = await getToken();
    if (!token) return;
    setBooking(kind);
    try {
      await partnerApi.requestPlacement(token, kind);
      show(BOOKED_MESSAGE[kind]);
    } catch (err) {
      show(apiErrorMessage(err, "La demande n'a pas pu être envoyée."));
    } finally {
      setBooking(null);
    }
  }

  const list = promotions.data ?? [];

  return (
    <>
      <PageHeader
        title="Mise en avant"
        subtitle="Faites découvrir vos produits aux bonnes clientes. Un placement ne contourne jamais le score d'adaptation : un produit n'est montré qu'aux peaux à qui il convient."
        actions={
          <PillButton onClick={() => setDrawerOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Créer une promotion
          </PillButton>
        }
      />

      <Panel>
        <PanelHeader title="Vos promotions" sub="Les réductions s'affichent sur la fiche produit et dans les routines." />
        {promotions.loading ? (
          <p className="py-10 text-center text-partner-muted">Chargement…</p>
        ) : list.length === 0 ? (
          <EmptyState>Aucune promotion pour le moment.</EmptyState>
        ) : (
          <>
            <div className="hidden overflow-x-auto min-[640px]:block">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="text-left text-[12.5px] text-partner-muted">
                    <th className="whitespace-nowrap border-b border-partner-border px-3 py-2.5 font-semibold">Promotion</th>
                    <th className="whitespace-nowrap border-b border-partner-border px-3 py-2.5 font-semibold">Produits</th>
                    <th className="whitespace-nowrap border-b border-partner-border px-3 py-2.5 text-right font-semibold">Réduction</th>
                    <th className="whitespace-nowrap border-b border-partner-border px-3 py-2.5 font-semibold">Période</th>
                    <th className="whitespace-nowrap border-b border-partner-border px-3 py-2.5 text-right font-semibold">Utilisations</th>
                    <th className="whitespace-nowrap border-b border-partner-border px-3 py-2.5 font-semibold">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((p) => (
                    <tr key={p.id} className="border-b border-partner-border last:border-0">
                      <td className="px-3 py-3 font-semibold">{p.nom}</td>
                      <td className="px-3 py-3">{p.produitsNoms.join(", ")}</td>
                      <td className="px-3 py-3 text-right tabular-nums">-{p.reduction} %</td>
                      <td className="whitespace-nowrap px-3 py-3">{period(p)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{p.utilisations}</td>
                      <td className="px-3 py-3">
                        <StatusPill tone={PROMO_PILL[p.status].tone}>{PROMO_PILL[p.status].label}</StatusPill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="m-0 flex list-none flex-col gap-3 p-0 min-[640px]:hidden">
              {list.map((p) => (
                <li key={p.id} className="rounded-2xl border border-partner-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <b className="leading-tight">{p.nom}</b>
                    <StatusPill tone={PROMO_PILL[p.status].tone}>{PROMO_PILL[p.status].label}</StatusPill>
                  </div>
                  <div className="mt-1 text-[13px] text-partner-muted">{p.produitsNoms.join(", ")}</div>
                  <div className="mt-2 flex flex-wrap justify-between gap-2 text-[13px]">
                    <span className="font-semibold">-{p.reduction} %</span>
                    <span>{period(p)}</span>
                    <span className="text-partner-muted">{p.utilisations} utilisations</span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>

      <div className="grid grid-cols-4 gap-[18px] max-[1180px]:grid-cols-2 max-[560px]:grid-cols-1">
        {SLOTS.map((slot) => (
          <div key={slot.kind} className="flex flex-col gap-2.5 rounded-[22px] border border-partner-border bg-partner-card p-5">
            <h3 className="font-partner-heading text-[19px] text-partner-heading">{slot.title}</h3>
            <p className="m-0 text-sm text-partner-muted">{slot.text}</p>
            <div className="text-[15px] font-bold">{slot.price}</div>
            <div className="text-[13px] text-partner-muted">{slot.reach}</div>
            <PillButton variant="ghost" size="sm" className="mt-auto self-start" onClick={() => book(slot.kind)} disabled={booking === slot.kind}>
              {slot.cta}
            </PillButton>
          </div>
        ))}
      </div>

      <PromotionDrawer
        open={drawerOpen}
        products={products.data ?? []}
        onClose={() => setDrawerOpen(false)}
        onCreated={() => {
          setDrawerOpen(false);
          show("Promotion créée.");
          void promotions.reload();
        }}
      />
      <Toast message={message} />
    </>
  );
}

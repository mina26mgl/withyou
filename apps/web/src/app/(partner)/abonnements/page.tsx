"use client";

import { OfferCard } from "@/components/partner/OfferCard";
import { PageHeader } from "@/components/partner/PageHeader";
import { usePartnerSummary } from "@/components/partner/PartnerSummaryContext";
import { Toast, useToast } from "@/components/partner/Toast";
import { EmptyState, LoadError } from "@/components/partner/ui-blocks";
import { partnerApi } from "@/lib/partnerApi";
import { usePartnerData } from "@/lib/usePartnerData";

export default function AbonnementsPage() {
  const { data, loading, error, errorMessage, reload, getToken } = usePartnerData((token) => partnerApi.listSubscriptions(token));
  const { refresh } = usePartnerSummary();
  const { message, show } = useToast();

  return (
    <div className="flex flex-col gap-[18px]">
      <PageHeader
        title="Abonnements"
        subtitle="En plus de la commission sur vos ventes, débloquez des outils pour mieux comprendre vos clientes et vous faire découvrir. Mensuel ou annuel, sans engagement au-delà de la période."
      />
      {error ? (
        <LoadError what="les abonnements" message={errorMessage} />
      ) : !data || data.length === 0 ? (
        <EmptyState>{loading ? "Chargement…" : "Aucune offre n'est proposée pour le moment."}</EmptyState>
      ) : (
        data.map((offer) => (
          <OfferCard
            key={offer.id}
            offer={offer}
            getToken={getToken}
            onChanged={(toast) => {
              void reload();
              refresh();
              show(toast);
            }}
          />
        ))
      )}
      <Toast message={message} />
    </div>
  );
}

"use client";

import { Lock } from "lucide-react";
import type { PaidFeature } from "@withyou/shared-types";
import { partnerApi } from "@/lib/partnerApi";
import { usePartnerData } from "@/lib/usePartnerData";
import { OfferCard } from "./OfferCard";
import { PageHeader } from "./PageHeader";
import { usePartnerSummary } from "./PartnerSummaryContext";
import { Toast, useToast } from "./Toast";
import { LoadError, Panel } from "./ui-blocks";

/**
 * Écran payant : sans abonnement actif, il est remplacé par la présentation de
 * l'offre qui le débloque (le serveur refuse de toute façon les données).
 */
export function SubscriptionGate({
  feature,
  title,
  subtitle,
  children,
}: {
  feature: PaidFeature;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const { summary } = usePartnerSummary();
  if (!summary) return <p className="py-20 text-center text-partner-muted">Chargement…</p>;
  if (summary.features.includes(feature)) return <>{children}</>;
  return <Locked feature={feature} title={title} subtitle={subtitle} />;
}

function Locked({ feature, title, subtitle }: { feature: PaidFeature; title: string; subtitle: string }) {
  const { data, loading, error, errorMessage, reload, getToken } = usePartnerData((token) => partnerApi.listSubscriptions(token));
  const { message, show } = useToast();
  const offer = data?.find((o) => o.fonctionnalite === feature);
  const { summary } = usePartnerSummary();

  return (
    <div className="flex flex-col gap-[18px]">
      <PageHeader title={title} subtitle={subtitle} />
      {error ? (
        <LoadError what="les abonnements" message={errorMessage} />
      ) : loading ? (
        <p className="py-10 text-center text-partner-muted">Chargement…</p>
      ) : offer ? (
        <>
          <p className="m-0 flex items-center gap-2 text-sm text-partner-muted">
            <Lock className="h-4 w-4" aria-hidden="true" />
            Cet écran fait partie d&apos;un abonnement, en plus de la commission sur vos ventes.
          </p>
          <OfferCard
            offer={offer}
            getToken={getToken}
            large
            onChanged={(toast) => {
              void reload();
              show(toast);
            }}
          />
        </>
      ) : (
        <Panel>
          <div className="flex items-start gap-3 text-sm">
            <Lock className="mt-0.5 h-5 w-5 flex-none text-partner-heading" aria-hidden="true" />
            <div>
              <b className="block text-partner-heading">Bientôt disponible</b>
              <span className="text-partner-muted">
                Cet écran fera partie d&apos;un abonnement.{" "}
                {summary?.accountManager ? `${summary.accountManager}, votre contact chez withyou,` : "L'équipe withyou"} peut vous en dire plus.
              </span>
            </div>
          </div>
        </Panel>
      )}
      <Toast message={message} />
    </div>
  );
}

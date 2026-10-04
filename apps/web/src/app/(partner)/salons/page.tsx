"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { PartnerSalonTest, SalonTestStatus } from "@withyou/shared-types";
import { PageHeader } from "@/components/partner/PageHeader";
import { PillButton } from "@/components/partner/PillButton";
import { StatusPill } from "@/components/partner/StatusPill";
import { Toast, useToast } from "@/components/partner/Toast";
import { EmptyState, KpiGrid, LoadError, Panel } from "@/components/partner/ui-blocks";
import { partnerApi } from "@/lib/partnerApi";
import { fmtDecimal } from "@/lib/partnerFormat";
import { usePartnerData } from "@/lib/usePartnerData";
import { SalonTestDrawer } from "./SalonTestDrawer";

const PILL: Record<SalonTestStatus, { tone: "ok" | "mute" | "info"; label: string }> = {
  DONE: { tone: "ok", label: "Terminé" },
  PENDING: { tone: "mute", label: "En attente d'un salon" },
  RUNNING: { tone: "info", label: "En cours" },
};

function waiting(t: PartnerSalonTest): string {
  return t.status === "PENDING"
    ? "Nous cherchons le salon partenaire qui correspond à votre produit et à votre cible."
    : "Les échantillons sont en salon. Les premiers retours arrivent sous 10 jours.";
}

export default function SalonsPage() {
  const tests = usePartnerData((token) => partnerApi.listSalonTests(token));
  const products = usePartnerData((token) => partnerApi.listProducts(token));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { message, show } = useToast();

  const summary = tests.data?.summary;

  return (
    <>
      <PageHeader
        title="Tests en salon"
        subtitle="Faites tester vos produits par les clientes de nos 100 salons partenaires, et récupérez leurs retours avant de lancer ou d'ajuster un soin."
        actions={
          <PillButton onClick={() => setDrawerOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Proposer un test
          </PillButton>
        }
      />

      {tests.loading && !tests.data ? (
        <p className="py-20 text-center text-partner-muted">Chargement des tests…</p>
      ) : tests.error || !tests.data ? (
        <LoadError what="vos tests en salon" message={tests.errorMessage} />
      ) : (
        <>
          <KpiGrid
            columns={3}
            items={[
              { label: "Tests réalisés", value: String(summary?.tests ?? 0) },
              { label: "Clientes testeuses", value: String(summary?.testeuses ?? 0) },
              { label: "Satisfaction moyenne", value: summary?.satisfaction == null ? "—" : `${fmtDecimal(summary.satisfaction)} / 5` },
            ]}
          />

          {tests.data.tests.length === 0 && (
            <Panel>
              <EmptyState>Aucun test pour le moment. Proposez un produit : nous trouvons le salon qui correspond à votre cible.</EmptyState>
            </Panel>
          )}

          {tests.data.tests.map((t) => (
            <Panel key={t.id}>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 max-[560px]:grid-cols-1">
                <div>
                  <h2 className="font-partner-heading text-[22px] leading-tight text-partner-heading">{t.produitNom}</h2>
                  <div className="mt-1 text-partner-muted">
                    {t.salonNom ? `${t.salonNom}, ${t.salonWilaya}` : "Salon à attribuer"}
                  </div>
                  {t.citation ? (
                    <p className="mb-0 mt-3 max-w-[46ch] font-partner-heading text-[19px] leading-[1.35] text-partner-heading">« {t.citation} »</p>
                  ) : (
                    <p className="mb-0 mt-3 text-partner-muted">{waiting(t)}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-[22px] text-[13px] text-partner-muted">
                    <div>
                      <b className="block text-[17px] tabular-nums text-partner-ink">{t.status === "PENDING" ? t.echantillons : t.testeuses}</b>
                      {t.status === "PENDING" ? "échantillons demandés" : "clientes"}
                    </div>
                    {t.score !== null && (
                      <div>
                        <b className="block text-[17px] tabular-nums text-partner-ink">{fmtDecimal(t.score)} / 5</b>
                        satisfaction
                      </div>
                    )}
                  </div>
                </div>
                <StatusPill tone={PILL[t.status].tone}>{PILL[t.status].label}</StatusPill>
              </div>
            </Panel>
          ))}
        </>
      )}

      <SalonTestDrawer
        open={drawerOpen}
        products={products.data ?? []}
        onClose={() => setDrawerOpen(false)}
        onCreated={() => {
          setDrawerOpen(false);
          show("Demande envoyée. Nous vous proposons un salon sous 5 jours.");
          void tests.reload();
        }}
      />
      <Toast message={message} />
    </>
  );
}

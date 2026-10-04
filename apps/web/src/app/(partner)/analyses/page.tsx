"use client";

import { useState } from "react";
import type { AnalyticsPeriod, PrivacyRows } from "@withyou/shared-types";
import { formatPrice } from "@withyou/shared-utils";
import { AreaChart } from "@/components/partner/AreaChart";
import { PageHeader } from "@/components/partner/PageHeader";
import { PillLink } from "@/components/partner/PillButton";
import { BarRow, EmptyState, Insight, KpiGrid, LoadError, Panel, PanelHeader, Tabs } from "@/components/partner/ui-blocks";
import { partnerApi } from "@/lib/partnerApi";
import { fmtDecimal, fmtInt } from "@/lib/partnerFormat";
import { usePartnerData } from "@/lib/usePartnerData";
import { SubscriptionGate } from "@/components/partner/SubscriptionGate";

const PERIODS: { key: AnalyticsPeriod; label: string }[] = [
  { key: 7, label: "7 jours" },
  { key: 30, label: "30 jours" },
  { key: 90, label: "90 jours" },
];

function PrivacyBars({ rows }: { rows: PrivacyRows }) {
  if (rows.insufficient) {
    return (
      <p className="mb-3 rounded-xl bg-partner-bg px-3 py-2.5 text-[13.5px] text-partner-muted">
        Pas assez de données. Un groupe n&apos;est affiché qu&apos;à partir de {rows.minimum} clientes.
      </p>
    );
  }
  return (
    <div>
      {rows.rows.map((r) => (
        <BarRow key={r.label} label={r.label} pct={r.pct} />
      ))}
    </div>
  );
}

function Step({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="mb-3">
      <div className="mb-[5px] flex justify-between text-[13.5px]">
        <span>{label}</span>
        <b className="tabular-nums">{fmtInt(value)}</b>
      </div>
      <div className="relative h-[30px] overflow-hidden rounded-[10px] bg-partner-leafBg">
        <b className="absolute inset-y-0 left-0 rounded-[10px] bg-partner-leaf opacity-85" style={{ width: `${max ? Math.min(100, (value / max) * 100) : 0}%` }} />
      </div>
    </div>
  );
}

function DropRate({ from, to }: { from: number; to: number }) {
  if (!from) return null;
  return <div className="-mt-1 mb-2.5 ml-0.5 text-xs text-partner-muted">{fmtDecimal((to / from) * 100)} % passent à l&apos;étape suivante</div>;
}

/** Écran payant : abonnement « Analyses avancées ». */
export default function AnalysesPage() {
  return (
    <SubscriptionGate
      feature="ANALYTICS"
      title="Ventes et analyses"
      subtitle="Comprenez qui achète vos produits, ce qu'elles cherchent, et pourquoi certaines repartent sans acheter."
    >
      <AnalysesContent />
    </SubscriptionGate>
  );
}

function AnalysesContent() {
  const [period, setPeriod] = useState<AnalyticsPeriod>(30);
  const { data, loading, error, errorMessage } = usePartnerData((token) => partnerApi.getAnalytics(token, period), String(period));

  return (
    <>
      <PageHeader
        title="Ventes et analyses"
        subtitle="Comprenez qui achète vos produits, ce qu'elles cherchent, et pourquoi certaines repartent sans acheter."
        actions={<Tabs label="Période" items={PERIODS} value={period} onChange={setPeriod} />}
      />

      {loading && !data ? (
        <p className="py-20 text-center text-partner-muted">Chargement des analyses…</p>
      ) : error || !data ? (
        <LoadError what="les analyses" message={errorMessage} />
      ) : (
        <>
          <KpiGrid
            items={[
              { label: "Chiffre d'affaires", value: formatPrice(data.kpis.revenue) },
              { label: "Produits vendus", value: fmtInt(data.kpis.unitsSold) },
              { label: "Panier moyen", value: formatPrice(data.kpis.avgBasket) },
              { label: "Taux de conversion", value: data.kpis.conversionRate === null ? "—" : `${fmtDecimal(data.kpis.conversionRate)} %` },
            ]}
          />

          <Panel>
            <PanelHeader title="Chiffre d'affaires" sub={`Sur les ${data.period} derniers jours, en dinars.`} />
            <AreaChart values={data.series} height={230} label={`Évolution du chiffre d'affaires sur ${data.period} jours`} labels={data.axisLabels} />
          </Panel>

          <div className="grid grid-cols-2 gap-[18px] max-[900px]:grid-cols-1">
            <Panel>
              <PanelHeader title="Le parcours des clientes" sub="De la découverte de votre page jusqu'à l'achat." />
              <Step label="Visites de votre page" value={data.funnel.visits} max={data.funnel.visits} />
              <DropRate from={data.funnel.visits} to={data.funnel.opened} />
              <Step label="Fiches produits ouvertes" value={data.funnel.opened} max={data.funnel.visits} />
              <DropRate from={data.funnel.opened} to={data.funnel.kept} />
              <Step label="Produits gardés" value={data.funnel.kept} max={data.funnel.visits} />
              <DropRate from={data.funnel.kept} to={data.funnel.purchases} />
              <Step label="Achats" value={data.funnel.purchases} max={data.funnel.visits} />
            </Panel>

            <Panel>
              <PanelHeader
                title="Qui achète vos produits"
                sub="Types de peau déclarés par les clientes qui gardent vos produits. Aucun groupe de moins de 20 clientes n'est affiché."
              />
              <PrivacyBars rows={data.skinTypes} />
              <h3 className="mb-3 mt-5 font-partner-heading text-lg text-partner-heading">Wilayas</h3>
              <PrivacyBars rows={data.wilayas} />
            </Panel>
          </div>

          <div className="grid grid-cols-2 gap-[18px] max-[900px]:grid-cols-1">
            <Panel>
              <PanelHeader title="Ce qu'elles cherchaient" sub="Recherches qui ont mené à vos produits." />
              {data.queries.length ? (
                <ul className="m-0 list-none p-0">
                  {data.queries.map((q) => (
                    <li key={q.query} className="flex justify-between gap-3 border-b border-partner-border py-2.5 text-sm last:border-0">
                      <span>« {q.query} »</span>
                      <b className="tabular-nums">{fmtInt(q.count)}</b>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState>Aucune recherche n&apos;a encore mené à vos produits.</EmptyState>
              )}
            </Panel>

            <Panel>
              <PanelHeader title="À retenir" sub="Des pistes tirées de vos données, mises à jour chaque lundi." />
              {data.insights.length ? (
                <div className="flex flex-col gap-3">
                  {data.insights.map((insight) => (
                    <Insight
                      key={insight.text}
                        action={
                          insight.productId ? (
                            <PillLink href={`/produits?edit=${insight.productId}`} size="sm">
                              {insight.cta ?? "Voir la fiche"}
                            </PillLink>
                          ) : undefined
                        }
                      >
                        {insight.text}
                    </Insight>
                  ))}
                </div>
              ) : (
                <EmptyState>Rien à signaler pour le moment.</EmptyState>
              )}
            </Panel>
          </div>
        </>
      )}
    </>
  );
}

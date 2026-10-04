"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import type { AdminAnalytics } from "@withyou/shared-types";
import { formatPrice } from "@withyou/shared-utils";
import { AreaChart } from "@/components/partner/AreaChart";
import { PageHeader } from "@/components/partner/PageHeader";
import { BarRow, EmptyState, KpiGrid, LoadError, Panel, PanelHeader, Tabs } from "@/components/partner/ui-blocks";
import { adminApi } from "@/lib/adminApi";
import { usePartnerData } from "@/lib/usePartnerData";

type Period = 7 | 30 | 90;
const fmtN = (n: number) => n.toLocaleString("fr-FR");
const shortDate = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

/** « +14 % » par rapport à la période précédente (rien si elle était vide). */
function evolution(now: number, prev: number): { note?: string; tone?: "up" | "down" | "muted" } {
  if (!prev) return now ? { note: "première période avec des données", tone: "muted" } : {};
  const d = Math.round(((now - prev) / prev) * 100);
  return { note: `${d >= 0 ? "+" : ""}${d} % vs période précédente`, tone: d >= 0 ? "up" : "down" };
}

export default function AdminAnalyticsPage() {
  const [period, setPeriod] = useState<Period>(30);
  const { data, loading, error, errorMessage } = usePartnerData((token) => adminApi.analytics(token, period), String(period));

  return (
    <>
      <PageHeader
        title="Analyses"
        subtitle="La santé de la plateforme et la demande qui n'est pas encore couverte, calculées sur les données réelles."
        actions={
          <Tabs<Period>
            label="Période"
            value={period}
            onChange={setPeriod}
            items={[7, 30, 90].map((p) => ({ key: p as Period, label: `${p} jours` }))}
          />
        }
      />
      {error ? (
        <LoadError what="les analyses" message={errorMessage} />
      ) : !data || loading ? (
        <p className="py-10 text-center text-partner-muted">Chargement…</p>
      ) : (
        <Content a={data} />
      )}
    </>
  );
}

function Content({ a }: { a: AdminAnalytics }) {
  const k = a.kpis;
  const top = a.funnel[0]?.value ?? 0;
  const hasEvents = a.funnel.slice(1, 4).some((s) => s.value > 0);

  return (
    <>
      <KpiGrid
        items={[
          { label: "Volume de ventes", value: formatPrice(k.ventes), ...evolution(k.ventes, k.ventesPrev) },
          { label: "Revenu withyou", value: formatPrice(k.revenu), ...evolution(k.revenu, k.revenuPrev) },
          { label: "Commandes", value: fmtN(k.commandes), ...evolution(k.commandes, k.commandesPrev) },
          { label: "Panier moyen", value: formatPrice(k.panierMoyen), ...evolution(k.panierMoyen, k.panierMoyenPrev) },
        ]}
      />

      <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-[18px] max-[1180px]:grid-cols-1">
        <Panel>
          <PanelHeader title="Volume de ventes" sub="Toutes marques confondues, en dinars, jour par jour." />
          {k.commandes === 0 ? (
            <EmptyState>Aucune commande sur cette période.</EmptyState>
          ) : (
            <AreaChart
              values={a.series}
              label="Évolution du volume de ventes"
              labels={[shortDate(a.axis[0]), shortDate(a.axis[1]), shortDate(a.axis[2])]}
            />
          )}
        </Panel>
        <Panel>
          <PanelHeader title="D'où vient le revenu" sub="Part de chaque source dans le revenu withyou." />
          {k.revenu === 0 ? (
            <EmptyState>Pas encore de revenu sur cette période.</EmptyState>
          ) : (
            <>
              {a.revenueSources.map((s) => (
                <BarRow key={s.label} label={s.label} pct={s.pct} />
              ))}
              <ul className="m-0 mt-3 list-none p-0 text-[13px] text-partner-muted">
                {a.revenueSources.map((s) => (
                  <li key={s.label} className="flex justify-between py-0.5">
                    <span>{s.label}</span>
                    <b className="tabular-nums text-partner-ink">{formatPrice(s.montant)}</b>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-2 gap-[18px] max-[1180px]:grid-cols-1">
        <Panel>
          <PanelHeader title="Parcours des nouvelles clientes" sub={`Clientes arrivées sur ${a.period} jours, de l'inscription à l'achat.`} />
          {top === 0 ? (
            <EmptyState>Aucune nouvelle cliente sur cette période.</EmptyState>
          ) : (
            <>
              {a.funnel.map((s, i) => (
                <div key={s.label}>
                  <div className="mb-3">
                    <div className="mb-1.5 flex justify-between text-[13.5px]">
                      <span>{s.label}</span>
                      <b className="tabular-nums">{fmtN(s.value)}</b>
                    </div>
                    <div className="relative h-[30px] overflow-hidden rounded-[10px] bg-partner-leafBg">
                      <b className="absolute inset-y-0 left-0 rounded-[10px] bg-partner-leaf opacity-85" style={{ width: `${top ? (s.value / top) * 100 : 0}%` }} />
                    </div>
                  </div>
                  {i < a.funnel.length - 1 && s.value > 0 && (
                    <div className="-mt-1 mb-2.5 ml-0.5 text-xs text-partner-muted">
                      {Math.round((a.funnel[i + 1].value / s.value) * 1000) / 10} % passent à l&apos;étape suivante
                    </div>
                  )}
                </div>
              ))}
              {!hasEvents && (
                <p className="mb-0 mt-2 text-[12.5px] text-partner-muted">
                  Les étapes « questionnaire », « produit ouvert » et « produit gardé » se rempliront avec l&apos;activité des clientes dans l&apos;app.
                </p>
              )}
            </>
          )}
        </Panel>
        <Panel>
          <PanelHeader title="Meilleures marques" sub="Volume de ventes par marque sur la période." />
          {a.topBrands.length === 0 ? (
            <EmptyState>Aucune vente sur cette période.</EmptyState>
          ) : (
            <ul className="m-0 list-none p-0">
              {a.topBrands.map((b) => (
                <li key={b.marque} className="flex justify-between gap-3 border-b border-partner-border py-2.5 text-sm last:border-b-0">
                  <span>{b.marque}</span>
                  <b className="tabular-nums">{formatPrice(b.montant)}</b>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-2 gap-[18px] max-[1180px]:grid-cols-1">
        <Panel>
          <PanelHeader title="Ce qu'elles cherchent" sub="Recherches les plus fréquentes : des marques et produits à recruter." />
          {a.topSearches.length === 0 ? (
            <EmptyState>Aucune recherche enregistrée sur cette période.</EmptyState>
          ) : (
            <ul className="m-0 list-none p-0">
              {a.topSearches.map((q) => (
                <li key={q.query} className="flex justify-between gap-3 border-b border-partner-border py-2.5 text-sm last:border-b-0">
                  <span>« {q.query} »</span>
                  <b className="tabular-nums">{fmtN(q.count)}</b>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel>
          <PanelHeader title="Profils et wilayas" sub="Données agrégées de toutes les clientes." />
          <h3 className="mb-3 text-[15px] font-bold text-partner-heading">Types de peau</h3>
          {a.skinTypes.length === 0 ? (
            <p className="mb-4 text-sm text-partner-muted">Pas encore de profils de peau renseignés.</p>
          ) : (
            a.skinTypes.map((s) => <BarRow key={s.label} label={s.label} pct={s.pct} />)
          )}
          <h3 className="mb-3 mt-4 text-[15px] font-bold text-partner-heading">Wilayas des commandes</h3>
          {a.wilayas.length === 0 ? (
            <p className="text-sm text-partner-muted">Aucune commande sur cette période.</p>
          ) : (
            a.wilayas.map((w) => <BarRow key={w.label} label={w.label} pct={w.pct} />)
          )}
        </Panel>
      </div>

      <div className="flex gap-3 rounded-2xl bg-partner-soft px-4 py-3.5 text-[13.5px]">
        <Lock className="mt-px h-5 w-5 flex-none text-partner-heading" aria-hidden="true" />
        <div>
          Les profils de peau individuels restent internes à withyou. Les marques ne voient que des données agrégées sur au moins 20 clientes.
        </div>
      </div>
    </>
  );
}

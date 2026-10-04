"use client";

import { AlertTriangle, Eye, MessageSquare, Plus } from "lucide-react";
import type { HomeTodo, PartnerHome } from "@withyou/shared-types";
import { formatPrice } from "@withyou/shared-utils";
import { AreaChart } from "@/components/partner/AreaChart";
import { FitBar } from "@/components/partner/FitBar";
import { PageHeader } from "@/components/partner/PageHeader";
import { PillLink } from "@/components/partner/PillButton";
import { ProductVisual } from "@/components/partner/ProductVisual";
import { StatusPill } from "@/components/partner/StatusPill";
import { EmptyState, KpiGrid, LoadError, Panel, PanelHeader, ProgressRing } from "@/components/partner/ui-blocks";
import { partnerApi } from "@/lib/partnerApi";
import { STATUS_PILL, dePlace, displayStatus, fmtDecimal, fmtInt, longDateFr, signed } from "@/lib/partnerFormat";
import { usePartnerData } from "@/lib/usePartnerData";
import { useDaytime } from "@/lib/useDaytime";
import { LaunchChecklist } from "@/components/partner/LaunchChecklist";

function storySentence(story: PartnerHome["story"]): { sentence: string; meta: string } {
  const women = story.keptThisWeek <= 1 ? `${story.keptThisWeek} femme a gardé` : `${story.keptThisWeek} femmes ont gardé`;
  const sentence = `Cette semaine, ${women} un de vos produits, et votre page a été vue ${fmtInt(story.pageViewsThisWeek)} fois.`;

  const delta =
    story.keptDelta > 0
      ? `C'est ${story.keptDelta} de plus que la semaine dernière.`
      : story.keptDelta < 0
        ? `C'est ${Math.abs(story.keptDelta)} de moins que la semaine dernière.`
        : "C'est autant que la semaine dernière.";

  const audience: string[] = [];
  if (story.topSkinType) audience.push(`La plupart ont une peau ${story.topSkinType.toLowerCase()}`);
  if (story.topWilayas.length) {
    const where = story.topWilayas.map(dePlace).join(" ou ");
    audience.push(audience.length ? `et viennent ${where}` : `La plupart viennent ${where}`);
  }
  return { sentence, meta: `${delta}${audience.length ? ` ${audience.join(" ")}.` : ""}` };
}

function TodoIcon({ todo }: { todo: HomeTodo }) {
  if (todo.kind === "PAGE_INCOMPLETE") return <ProgressRing pct={todo.progress ?? 0} />;
  return todo.kind === "OUT_OF_STOCK" ? (
    <AlertTriangle className="h-[18px] w-[18px]" aria-hidden="true" />
  ) : (
    <MessageSquare className="h-[18px] w-[18px]" aria-hidden="true" />
  );
}

export default function AccueilPage() {
  const { data, loading, error, errorMessage } = usePartnerData((token) => partnerApi.getHome(token));
  const { greeting } = useDaytime();

  if (loading) return <p className="py-20 text-center text-partner-muted">Chargement de votre tableau de bord…</p>;
  if (error || !data) return <LoadError what="votre tableau de bord" message={errorMessage} />;

  const { kpis } = data;
  const { sentence, meta } = storySentence(data.story);
  const compare = "par rapport aux 30 jours précédents";
  const axis: [string, string, string] = [
    longDateFr(data.periodStart),
    longDateFr(new Date(new Date(data.periodStart).getTime() + 15 * 86_400_000).toISOString()),
    longDateFr(new Date().toISOString()),
  ];

  return (
    <>
      <PageHeader
        title={data.contactFirstName ? `${greeting} ${data.contactFirstName}.` : `${greeting}.`}
        subtitle={`Voici comment ${data.brandName} se porte depuis le ${longDateFr(data.periodStart)}.`}
        actions={
          <>
            <PillLink href="/page-marque" variant="ghost">
              <Eye className="h-4 w-4" aria-hidden="true" />
              Modifier ma page
            </PillLink>
            <PillLink href="/produits?new=1">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Ajouter un produit
            </PillLink>
          </>
        }
      />
      <LaunchChecklist />

      <section className="rounded-3xl border border-partner-border bg-partner-card px-[30px] pb-[26px] pt-[30px] max-[560px]:px-5">
        <p className="m-0 max-w-[34ch] font-partner-heading text-[clamp(22px,2.4vw,31px)] leading-[1.28] text-partner-heading">{sentence}</p>
        <div className="mt-3 max-w-[62ch] text-sm text-partner-muted">{meta}</div>
      </section>

      <KpiGrid
        items={[
          {
            label: "Chiffre d'affaires",
            value: formatPrice(kpis.revenue30d),
            note: kpis.revenueDeltaPct === null ? "Premiers résultats" : `${signed(kpis.revenueDeltaPct)} % ${compare}`,
            tone: kpis.revenueDeltaPct !== null && kpis.revenueDeltaPct < 0 ? "down" : "up",
          },
          { label: "Produits vendus", value: fmtInt(kpis.unitsSold30d), note: `${signed(kpis.unitsDelta)} ${compare}`, tone: kpis.unitsDelta < 0 ? "down" : "up" },
          {
            label: "Visites de votre page",
            value: fmtInt(kpis.visits30d),
            note: kpis.visitsDeltaPct === null ? "Premiers résultats" : `${signed(kpis.visitsDeltaPct)} %`,
            tone: kpis.visitsDeltaPct !== null && kpis.visitsDeltaPct < 0 ? "down" : "up",
          },
          {
            label: "Note moyenne",
            value: kpis.ratingAvg === null ? "—" : `${fmtDecimal(kpis.ratingAvg)} / 5`,
            note: `${kpis.reviewCount} avis`,
          },
        ]}
      />

      <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-[18px] max-[1180px]:grid-cols-1">
        <Panel>
          <PanelHeader
            title="Chiffre d'affaires"
            sub="30 derniers jours, en dinars"
            aside={<span className="text-[22px] font-bold tabular-nums">{formatPrice(kpis.revenue30d)}</span>}
          />
          <AreaChart values={data.revenueSeries} label="Évolution du chiffre d'affaires sur 30 jours" labels={axis} />
        </Panel>

        <Panel>
          <PanelHeader title="À faire" sub="Ce qui attend une action de votre part." />
          {data.todos.length ? (
            <ul className="m-0 list-none p-0">
              {data.todos.map((todo) => (
                <li key={todo.kind} className="flex items-center gap-3 border-b border-partner-border py-3 last:border-0">
                  <span className="grid h-[38px] w-[38px] flex-none place-items-center rounded-xl bg-partner-bg text-partner-heading">
                    <TodoIcon todo={todo} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block text-sm leading-tight">{todo.title}</b>
                    <span className="text-[12.5px] text-partner-muted">{todo.detail}</span>
                  </span>
                  <PillLink href={todo.href} variant="ghost" size="sm">
                    {todo.cta}
                  </PillLink>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState>Tout est à jour. Profitez-en pour proposer un test en salon.</EmptyState>
          )}
        </Panel>
      </div>

      <Panel>
        <PanelHeader
          title="Vos produits les plus gardés"
          sub="Classés par ventes sur 30 jours. Le score indique à quel point le produit correspond aux profils des clientes qui le voient."
          aside={
            <PillLink href="/produits" variant="ghost" size="sm">
              Tous les produits
            </PillLink>
          }
        />
        {data.topProducts.length === 0 ? (
          <EmptyState>Aucun produit pour le moment.</EmptyState>
        ) : (
          <>
            <div className="hidden overflow-x-auto min-[640px]:block">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="text-left text-[12.5px] text-partner-muted">
                    <th className="whitespace-nowrap border-b border-partner-border px-3 py-2.5 font-semibold">Produit</th>
                    <th className="whitespace-nowrap border-b border-partner-border px-3 py-2.5 text-right font-semibold">Ventes</th>
                    <th className="whitespace-nowrap border-b border-partner-border px-3 py-2.5 text-right font-semibold">Revenu</th>
                    <th className="whitespace-nowrap border-b border-partner-border px-3 py-2.5 font-semibold">Adapté</th>
                    <th className="whitespace-nowrap border-b border-partner-border px-3 py-2.5 font-semibold">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topProducts.map((p) => {
                    const status = STATUS_PILL[displayStatus(p)];
                    return (
                      <tr key={p.id} className="border-b border-partner-border last:border-0">
                        <td className="px-3 py-3">
                          <div className="flex min-w-[250px] items-center gap-3">
                            <div className="h-12 w-12 flex-none overflow-hidden rounded-xl bg-partner-bg">
                              <ProductVisual imageUrl={p.imageUrl} category={p.categorieNom} name={p.nom} />
                            </div>
                            <div>
                              <b className="block font-semibold leading-tight">{p.nom}</b>
                              <span className="text-[12.5px] text-partner-muted">{p.categorieNom}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">{p.ventes30j}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">{formatPrice(p.revenue30j)}</td>
                        <td className="px-3 py-3">
                          <FitBar value={p.fitScore} />
                        </td>
                        <td className="px-3 py-3">
                          <StatusPill tone={status.tone}>{status.label}</StatusPill>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <ul className="m-0 flex list-none flex-col gap-3 p-0 min-[640px]:hidden">
              {data.topProducts.map((p) => {
                const status = STATUS_PILL[displayStatus(p)];
                return (
                  <li key={p.id} className="rounded-2xl border border-partner-border p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 flex-none overflow-hidden rounded-xl bg-partner-bg">
                        <ProductVisual imageUrl={p.imageUrl} category={p.categorieNom} name={p.nom} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <b className="block text-sm leading-tight">{p.nom}</b>
                        <span className="text-[12.5px] text-partner-muted">{p.categorieNom}</span>
                      </div>
                    </div>
                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[13px]">
                      <span className="font-semibold">{p.ventes30j} ventes</span>
                      <span className="text-partner-muted">{formatPrice(p.revenue30j)}</span>
                      <StatusPill tone={status.tone}>{status.label}</StatusPill>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Panel>
    </>
  );
}

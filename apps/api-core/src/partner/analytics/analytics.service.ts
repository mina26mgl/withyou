import { BadRequestException, Injectable } from '@nestjs/common';
import type { AnalyticsInsight, AnalyticsPeriod, PartnerAnalytics } from '@withyou/shared-types';
import { PrismaService } from '../../prisma/prisma.service';
import { DAY_MS, PartnerStatsService } from '../common/partner-stats.service';
import { groupWithPrivacyFloor } from '../common/privacy';

const PERIODS: AnalyticsPeriod[] = [7, 30, 90];

function shortDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

function ordinal(n: number): string {
  return n === 1 ? '1re' : `${n}e`;
}

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 4);
}

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stats: PartnerStatsService,
  ) {}

  parsePeriod(raw: string | undefined): AnalyticsPeriod {
    const n = Number(raw ?? 30);
    if (!PERIODS.includes(n as AnalyticsPeriod)) {
      throw new BadRequestException('La période doit être de 7, 30 ou 90 jours.');
    }
    return n as AnalyticsPeriod;
  }

  async get(marqueId: string, period: AnalyticsPeriod, now = new Date()): Promise<PartnerAnalytics> {
    const from = new Date(now.getTime() - period * DAY_MS);
    const tomorrow = new Date(now.getTime() + DAY_MS);

    const [lines, events, products] = await Promise.all([
      this.stats.brandLines(marqueId, from, tomorrow),
      this.prisma.analytics_event.findMany({
        where: { id_marque: marqueId, created_at: { gte: from } },
        select: { type: true, id_produit: true, query: true, skin_type: true, id_consumer: true },
      }),
      this.prisma.produit.findMany({
        where: { id_marque: marqueId },
        select: { id_product: true, nom: true, status: true, ingredients: true },
      }),
    ]);

    const totals = this.stats.totals(lines);
    const count = (type: string) => events.filter((e) => e.type === type).length;
    const visits = count('PAGE_VIEW');
    const opened = count('PRODUCT_OPEN');
    const kept = count('PRODUCT_KEPT');

    const queryCounts = new Map<string, number>();
    for (const e of events) {
      if (e.type !== 'SEARCH' || !e.query) continue;
      const q = e.query.trim().toLowerCase();
      queryCounts.set(q, (queryCounts.get(q) ?? 0) + 1);
    }
    const queries = [...queryCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([query, n]) => ({ query, count: n }));

    const mid = new Date(from.getTime() + ((period - 1) / 2) * DAY_MS);
    const start = new Date(now.getTime() - (period - 1) * DAY_MS);

    return {
      period,
      kpis: {
        revenue: Math.round(totals.revenue),
        unitsSold: totals.units,
        avgBasket: totals.orders > 0 ? Math.round(totals.revenue / totals.orders) : 0,
        conversionRate: visits > 0 ? Math.round((totals.orders / visits) * 1000) / 10 : null,
      },
      series: this.stats.dailySeries(lines, period, now),
      axisLabels: [shortDate(start), shortDate(mid), shortDate(now)],
      funnel: { visits, opened, kept, purchases: totals.orders },
      skinTypes: groupWithPrivacyFloor(
        events
          .filter((e) => e.type === 'PRODUCT_KEPT')
          .map((e) => ({ label: e.skin_type ?? '', consumerId: e.id_consumer })),
        false,
      ),
      wilayas: groupWithPrivacyFloor(
        lines.map((l) => ({ label: l.wilaya, consumerId: l.consumerId })),
        true,
      ),
      queries,
      insights: this.insights(products, events, queries),
    };
  }

  private insights(
    products: { id_product: string; nom: string; status: string; ingredients: string[] }[],
    events: { type: string; id_produit: string | null }[],
    queries: { query: string; count: number }[],
  ): AnalyticsInsight[] {
    const out: AnalyticsInsight[] = [];

    const opens = (id: string) => events.filter((e) => e.type === 'PRODUCT_OPEN' && e.id_produit === id).length;
    const kept = (id: string) => events.filter((e) => e.type === 'PRODUCT_KEPT' && e.id_produit === id).length;
    const totalOpens = events.filter((e) => e.type === 'PRODUCT_OPEN').length;
    const avgRate = totalOpens > 0 ? events.filter((e) => e.type === 'PRODUCT_KEPT').length / totalOpens : 0;

    const weak = products
      .filter((p) => p.status === 'ONLINE' && p.ingredients.length === 0 && opens(p.id_product) >= 20)
      .map((p) => ({ p, rate: kept(p.id_product) / opens(p.id_product) }))
      .filter((x) => x.rate < avgRate * 0.6)
      .sort((a, b) => a.rate - b.rate)[0];
    if (weak) {
      const pct = (r: number) => (Math.round(r * 1000) / 10).toString().replace('.', ',');
      out.push({
        text: `${pct(weak.rate)} % des clientes qui ouvrent la fiche de ${weak.p.nom} la gardent, contre ${pct(avgRate)} % en moyenne. Sa liste d'ingrédients est vide, donc l'IA ne peut pas la recommander avec confiance.`,
        productId: weak.p.id_product,
        cta: 'Compléter la fiche',
      });
    }

    const inReview = products.filter((p) => p.status === 'IN_REVIEW');
    for (const [index, q] of queries.entries()) {
      const match = inReview.find((p) => tokens(p.nom).some((t) => tokens(q.query).includes(t)));
      if (match) {
        out.push({
          text: `« ${q.query} » est la ${ordinal(index + 1)} recherche qui mène à vous. Votre produit « ${match.nom} » est encore en vérification : il apparaîtra dans ces résultats dès sa validation.`,
        });
        break;
      }
    }

    return out;
  }
}

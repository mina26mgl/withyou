import { Injectable } from '@nestjs/common';
import type { HomeTodo, PartnerHome, PartnerProductRow } from '@withyou/shared-types';
import { PrismaService } from '../../prisma/prisma.service';
import { DAY_MS, PartnerStatsService, pctChange } from '../common/partner-stats.service';
import { groupWithPrivacyFloor } from '../common/privacy';
import { SummaryService } from '../summary/summary.service';

@Injectable()
export class HomeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stats: PartnerStatsService,
    private readonly summary: SummaryService,
  ) {}

  async get(marqueId: string, partenaireId: string, now = new Date()): Promise<PartnerHome> {
    const d30 = new Date(now.getTime() - 30 * DAY_MS);
    const d60 = new Date(now.getTime() - 60 * DAY_MS);
    const d7 = new Date(now.getTime() - 7 * DAY_MS);
    const d14 = new Date(now.getTime() - 14 * DAY_MS);
    const tomorrow = new Date(now.getTime() + DAY_MS);

    const [marque, contactFirstName, lines60, events, products, reviewAgg, unanswered, completion] = await Promise.all([
      this.prisma.marque.findUniqueOrThrow({ where: { id_marque: marqueId }, select: { nom_marque: true } }),
      this.summary.contactFirstName(partenaireId, marqueId),
      this.stats.brandLines(marqueId, d60, tomorrow),
      this.prisma.analytics_event.findMany({
        where: { id_marque: marqueId, created_at: { gte: d60 } },
        select: { type: true, created_at: true, skin_type: true, id_consumer: true },
      }),
      this.prisma.produit.findMany({
        where: { id_marque: marqueId },
        include: { categorie: true, produit_image: { orderBy: { ordre: 'asc' }, take: 1 } },
      }),
      this.prisma.avis.aggregate({ where: { id_marque: marqueId }, _avg: { stars: true }, _count: true }),
      this.prisma.avis.count({ where: { id_marque: marqueId, reply: null } }),
      this.stats.pageCompletion(marqueId),
    ]);

    const lines30 = lines60.filter((l) => l.date >= d30);
    const linesPrev = lines60.filter((l) => l.date < d30);
    const cur = this.stats.totals(lines30);
    const prev = this.stats.totals(linesPrev);

    const ev = (type: string, from: Date, to: Date) =>
      events.filter((e) => e.type === type && e.created_at >= from && e.created_at < to);

    const visits30 = ev('PAGE_VIEW', d30, tomorrow).length;
    const visitsPrev = ev('PAGE_VIEW', d60, d30).length;
    const keptWeek = ev('PRODUCT_KEPT', d7, tomorrow);
    const keptPrevWeek = ev('PRODUCT_KEPT', d14, d7);

    const skin = groupWithPrivacyFloor(
      ev('PRODUCT_KEPT', d30, tomorrow).map((e) => ({ label: e.skin_type ?? '', consumerId: e.id_consumer })),
      false,
    );
    const wilayas = groupWithPrivacyFloor(
      lines30.map((l) => ({ label: l.wilaya, consumerId: l.consumerId })),
      false,
    );

    const sales = this.stats.byProduct(lines30);
    const rows: PartnerProductRow[] = products.map((p) => ({
      id: p.id_product,
      nom: p.nom,
      categorieNom: p.categorie.nom,
      imageUrl: p.produit_image[0]?.url ?? null,
      prix: Number(p.prix),
      stock: p.stock,
      statut: p.status,
      ventes30j: sales.get(p.id_product)?.units ?? 0,
      revenue30j: Math.round(sales.get(p.id_product)?.revenue ?? 0),
      fitScore: null,
    }));

    const todos: HomeTodo[] = [];
    const outOfStock = rows.find((r) => r.statut === 'ONLINE' && r.stock === 0);
    if (outOfStock) {
      todos.push({
        kind: 'OUT_OF_STOCK',
        title: `${outOfStock.nom} est en rupture`,
        detail: "Il n'apparaît plus dans les routines recommandées.",
        href: '/produits',
        cta: 'Mettre à jour',
      });
    }
    if (unanswered > 0) {
      todos.push({
        kind: 'UNANSWERED_REVIEWS',
        title: `${unanswered} avis sans réponse`,
        detail: 'Une réponse de la fondatrice rassure les prochaines clientes.',
        href: '/avis',
        cta: 'Répondre',
      });
    }
    if (completion.pct < 100) {
      todos.push({
        kind: 'PAGE_INCOMPLETE',
        title: `Votre page est complète à ${completion.pct} %`,
        detail: `${completion.missing[0]}.`,
        href: '/page-marque',
        cta: 'Compléter',
        progress: completion.pct,
      });
    }

    const keptDelta = keptWeek.length - keptPrevWeek.length;

    return {
      brandName: marque.nom_marque,
      contactFirstName,
      periodStart: d30.toISOString(),
      story: {
        keptThisWeek: keptWeek.length,
        keptDelta,
        pageViewsThisWeek: ev('PAGE_VIEW', d7, tomorrow).length,
        topSkinType: skin.insufficient ? null : (skin.rows[0]?.label ?? null),
        topWilayas: wilayas.insufficient ? [] : wilayas.rows.slice(0, 2).map((r) => r.label),
      },
      kpis: {
        revenue30d: Math.round(cur.revenue),
        revenueDeltaPct: pctChange(cur.revenue, prev.revenue),
        unitsSold30d: cur.units,
        unitsDelta: cur.units - prev.units,
        visits30d: visits30,
        visitsDeltaPct: pctChange(visits30, visitsPrev),
        ratingAvg: reviewAgg._avg.stars ? Math.round(reviewAgg._avg.stars * 10) / 10 : null,
        reviewCount: reviewAgg._count,
      },
      revenueSeries: this.stats.dailySeries(lines30, 30, now),
      todos,
      topProducts: [...rows].sort((a, b) => b.ventes30j - a.ventes30j).slice(0, 4),
    };
  }
}

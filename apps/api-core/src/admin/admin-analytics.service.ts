import { BadRequestException, Injectable } from '@nestjs/common';
import type { AdminAnalytics } from '@withyou/shared-types';
import { PrismaService } from '../prisma/prisma.service';

const DAY = 86_400_000;
export const ANALYTICS_PERIODS = [7, 30, 90] as const;

const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0);

/** Vue d'ensemble de la plateforme pour la console, calculée sur les données réelles. */
@Injectable()
export class AdminAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(period: number): Promise<AdminAnalytics> {
    if (!(ANALYTICS_PERIODS as readonly number[]).includes(period)) throw new BadRequestException('Période : 7, 30 ou 90 jours.');
    const now = new Date();
    const since = new Date(now.getTime() - period * DAY);
    const prevSince = new Date(since.getTime() - period * DAY);

    const [orders, prevOrders, subs, prevSubs] = await Promise.all([
      this.prisma.order.findMany({
        where: { created_at: { gte: since, lte: now } },
        select: {
          id_order: true,
          id_consumer: true,
          created_at: true,
          montant_total: true,
          montant_comission: true,
          wilaya_livraison: true,
          ligne_order: { select: { quantite: true, prix_unitaire: true, produit: { select: { marque: { select: { nom_marque: true, draft: true } } } } } },
        },
      }),
      this.prisma.order.findMany({ where: { created_at: { gte: prevSince, lt: since } }, select: { montant_total: true, montant_comission: true } }),
      // Abonnements des marques démarrés sur la période (encaissés à l'activation).
      this.prisma.abonnement_marque.findMany({ where: { debut: { gte: since, lte: now } }, select: { prix: true } }),
      this.prisma.abonnement_marque.findMany({ where: { debut: { gte: prevSince, lt: since } }, select: { prix: true } }),
    ]);

    const sum = <T>(rows: T[], f: (r: T) => number) => rows.reduce((a, r) => a + f(r), 0);
    const ventes = sum(orders, (o) => Number(o.montant_total));
    const commissions = sum(orders, (o) => Number(o.montant_comission));
    const abonnements = sum(subs, (s) => Number(s.prix));
    const prevVentes = sum(prevOrders, (o) => Number(o.montant_total));
    const prevRevenu = sum(prevOrders, (o) => Number(o.montant_comission)) + sum(prevSubs, (s) => Number(s.prix));

    // Ventes jour par jour.
    const series = Array.from({ length: period }, () => 0);
    for (const o of orders) {
      const i = Math.min(period - 1, Math.floor(((o.created_at?.getTime() ?? now.getTime()) - since.getTime()) / DAY));
      if (i >= 0) series[i] += Number(o.montant_total);
    }

    // Parcours des clientes arrivées sur la période.
    const newClients = await this.prisma.user.findMany({
      where: { role: 'CONSUMER', created_at: { gte: since, lte: now } },
      select: { consomateur: { select: { id_consumer: true, onboarding_done: true } } },
    });
    const consumerIds = newClients.flatMap((u) => u.consomateur.map((c) => c.id_consumer));
    const distinctEvents = async (type: 'PRODUCT_OPEN' | 'PRODUCT_KEPT') =>
      (
        await this.prisma.analytics_event.groupBy({
          by: ['id_consumer'],
          where: { type, created_at: { gte: since, lte: now }, id_consumer: { in: consumerIds } },
        })
      ).length;
    const buyers = new Set(orders.filter((o) => consumerIds.includes(o.id_consumer)).map((o) => o.id_consumer)).size;

    const [searches, skins] = await Promise.all([
      this.prisma.analytics_event.groupBy({
        by: ['query'],
        where: { type: 'SEARCH', created_at: { gte: since, lte: now }, query: { not: null } },
        _count: true,
        orderBy: { _count: { query: 'desc' } },
        take: 6,
      }),
      this.prisma.analytics_event.groupBy({
        by: ['skin_type'],
        where: { created_at: { gte: since, lte: now }, skin_type: { not: null } },
        _count: true,
      }),
    ]);

    const byWilaya = new Map<string, number>();
    for (const o of orders) byWilaya.set(o.wilaya_livraison, (byWilaya.get(o.wilaya_livraison) ?? 0) + 1);
    const wilayas = [...byWilaya.entries()].sort((a, b) => b[1] - a[1]);
    const topWilayas = wilayas.slice(0, 4);
    const others = wilayas.slice(4).reduce((a, [, n]) => a + n, 0);

    const byBrand = new Map<string, number>();
    for (const o of orders) {
      for (const l of o.ligne_order) {
        const m = l.produit.marque;
        const name = (m.draft as { name?: string } | null)?.name?.trim() || m.nom_marque;
        byBrand.set(name, (byBrand.get(name) ?? 0) + Number(l.prix_unitaire) * l.quantite);
      }
    }
    const skinTotal = skins.reduce((a, s) => a + s._count, 0);

    const mid = new Date(since.getTime() + (period / 2) * DAY);
    return {
      period,
      axis: [since.toISOString(), mid.toISOString(), now.toISOString()],
      kpis: {
        ventes,
        ventesPrev: prevVentes,
        revenu: commissions + abonnements,
        revenuPrev: prevRevenu,
        commandes: orders.length,
        commandesPrev: prevOrders.length,
        panierMoyen: orders.length ? Math.round(ventes / orders.length) : 0,
        panierMoyenPrev: prevOrders.length ? Math.round(prevVentes / prevOrders.length) : 0,
      },
      series,
      revenueSources: [
        { label: 'Commissions', montant: commissions, pct: pct(commissions, commissions + abonnements) },
        { label: 'Abonnements', montant: abonnements, pct: pct(abonnements, commissions + abonnements) },
      ],
      funnel: [
        { label: 'Comptes clientes créés', value: consumerIds.length },
        { label: 'Questionnaire terminé', value: newClients.filter((u) => u.consomateur.some((c) => c.onboarding_done)).length },
        { label: 'Produit ouvert', value: await distinctEvents('PRODUCT_OPEN') },
        { label: 'Produit gardé', value: await distinctEvents('PRODUCT_KEPT') },
        { label: 'Achat', value: buyers },
      ],
      topSearches: searches.map((s) => ({ query: s.query ?? '', count: s._count })),
      skinTypes: skins.map((s) => ({ label: s.skin_type ?? '', pct: pct(s._count, skinTotal) })).sort((a, b) => b.pct - a.pct),
      wilayas: [
        ...topWilayas.map(([label, n]) => ({ label, pct: pct(n, orders.length) })),
        ...(others ? [{ label: 'Autres', pct: pct(others, orders.length) }] : []),
      ],
      topBrands: [...byBrand.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([marque, montant]) => ({ marque, montant })),
    };
  }
}

import { Injectable } from '@nestjs/common';
import { isVideoUrl } from '@withyou/shared-utils';
import { PrismaService } from '../../prisma/prisma.service';
import { BrandPageService } from '../brand-page/brand-page.service';

export const DAY_MS = 24 * 60 * 60 * 1000;

export interface BrandLine {
  productId: string;
  units: number;
  revenue: number;
  orderId: string;
  consumerId: string;
  wilaya: string;
  date: Date;
}

export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Percentage change, or null when there is no previous value to compare to. */
export function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

@Injectable()
export class PartnerStatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly brandPage: BrandPageService,
  ) {}

  /** Every order line of this brand's products created in [from, to). */
  async brandLines(marqueId: string, from: Date, to: Date): Promise<BrandLine[]> {
    const lines = await this.prisma.ligne_order.findMany({
      where: { produit: { id_marque: marqueId }, order: { created_at: { gte: from, lt: to } } },
      select: {
        id_product: true,
        id_order: true,
        quantite: true,
        prix_unitaire: true,
        order: { select: { created_at: true, wilaya_livraison: true, id_consumer: true } },
      },
    });

    return lines.map((l) => ({
      productId: l.id_product,
      units: l.quantite,
      revenue: Number(l.prix_unitaire) * l.quantite,
      orderId: l.id_order,
      consumerId: l.order.id_consumer,
      wilaya: l.order.wilaya_livraison,
      date: l.order.created_at ?? from,
    }));
  }

  totals(lines: BrandLine[]) {
    return {
      revenue: lines.reduce((s, l) => s + l.revenue, 0),
      units: lines.reduce((s, l) => s + l.units, 0),
      orders: new Set(lines.map((l) => l.orderId)).size,
    };
  }

  byProduct(lines: BrandLine[]): Map<string, { units: number; revenue: number }> {
    const map = new Map<string, { units: number; revenue: number }>();
    for (const l of lines) {
      const cur = map.get(l.productId) ?? { units: 0, revenue: 0 };
      cur.units += l.units;
      cur.revenue += l.revenue;
      map.set(l.productId, cur);
    }
    return map;
  }

  /** One revenue value per day for the `days` days ending today (UTC). */
  dailySeries(lines: BrandLine[], days: number, now = new Date()): number[] {
    const today = startOfUtcDay(now);
    const buckets = new Map<string, number>();
    for (const l of lines) buckets.set(dayKey(l.date), (buckets.get(dayKey(l.date)) ?? 0) + l.revenue);
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(today.getTime() - (days - 1 - i) * DAY_MS);
      return Math.round(buckets.get(dayKey(d)) ?? 0);
    });
  }

  /** Same checklist as the prototype's "Votre page est complète à X %". */
  async pageCompletion(marqueId: string): Promise<{ pct: number; missing: string[] }> {
    const { draft } = await this.brandPage.getState(marqueId);
    const onlineProducts = await this.prisma.produit.count({ where: { id_marque: marqueId, status: 'ONLINE' } });

    const checks: [boolean, string][] = [
      [!!draft.coverUrl, 'Ajoutez une image de couverture'],
      ...(isVideoUrl(draft.coverUrl)
        ? ([[!!draft.coverImageUrl, 'Ajoutez une image avec votre vidéo de couverture']] as [boolean, string][])
        : []),
      [!!draft.logoUrl, 'Ajoutez votre logo'],
      [draft.story.length >= 120, 'Racontez votre histoire en quelques lignes'],
      [draft.origin.length >= 30, "Dites d'où vient la marque"],
      [draft.founders.length > 0, 'Présentez les visages de la marque'],
      [draft.commitments.length >= 3, 'Choisissez au moins 3 engagements'],
      [onlineProducts >= 3, 'Mettez au moins 3 produits en ligne'],
    ];

    const done = checks.filter(([ok]) => ok).length;
    return {
      pct: Math.round((done / checks.length) * 100),
      missing: checks.filter(([ok]) => !ok).map(([, label]) => label),
    };
  }
}

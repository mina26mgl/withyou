import type { PaidFeature, SubscriptionPeriod, SubscriptionStatus } from '@withyou/shared-types';
import type { PrismaService } from '../prisma/prisma.service';

/** Fin d'une période : même jour le mois (ou l'année) suivant. */
export function addPeriod(from: Date, periode: SubscriptionPeriod): Date {
  const d = new Date(from);
  if (periode === 'ANNUEL') d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

/** Un abonnement activé dont la date de fin est passée est « expiré » (jamais stocké). */
export function statusOf(row: { statut: string; fin: Date | null }, now = new Date()): SubscriptionStatus {
  if (row.statut === 'ACTIF' && row.fin && row.fin <= now) return 'EXPIRE';
  return row.statut as SubscriptionStatus;
}

/** Fonctionnalités payantes débloquées aujourd'hui pour une marque. */
export async function activeFeatures(prisma: PrismaService, marqueId: string): Promise<PaidFeature[]> {
  const now = new Date();
  const rows = await prisma.abonnement_marque.findMany({
    where: { id_marque: marqueId, statut: 'ACTIF', debut: { lte: now }, fin: { gt: now } },
    select: { offre: { select: { fonctionnalite: true } } },
  });
  return [...new Set(rows.map((r) => r.offre.fonctionnalite).filter((f): f is PaidFeature => !!f))];
}

import { Injectable } from '@nestjs/common';
import type { PartnerSummary } from '@withyou/shared-types';
import { PrismaService } from '../../prisma/prisma.service';
import { BrandPageService } from '../brand-page/brand-page.service';
import { activeFeatures } from '../../subscriptions/subscription-rules';

@Injectable()
export class SummaryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly brandPage: BrandPageService,
  ) {}

  async contactFirstName(partenaireId: string, marqueId: string): Promise<string | null> {
    const contact = await this.prisma.partenaire_contact.findUnique({
      where: { id_partenaire: partenaireId },
      include: { user: { include: { consomateur: true } } },
    });
    const prenom = contact?.prenom?.trim() || contact?.user.consomateur[0]?.prenom?.trim();
    if (prenom) return prenom;

    const founder = await this.prisma.marque_visage.findFirst({
      where: { id_marque: marqueId },
      include: { visage: true },
    });
    return founder?.visage.prenom?.trim() || null;
  }

  private async userEmail(partenaireId: string): Promise<string | null> {
    const contact = await this.prisma.partenaire_contact.findUnique({
      where: { id_partenaire: partenaireId },
      include: { user: { select: { email: true } } },
    });
    return contact?.user.email ?? null;
  }

  async get(marqueId: string, partenaireId: string): Promise<PartnerSummary> {
    const [{ draft, published, pageStatus }, unansweredReviews, contactFirstName, userEmail, approvals, manager, features, products] = await Promise.all([
      this.brandPage.getState(marqueId),
      this.prisma.avis.count({ where: { id_marque: marqueId, reply: null } }),
      this.contactFirstName(partenaireId, marqueId),
      this.userEmail(partenaireId),
      this.prisma.validation_request.count({ where: { id_marque: marqueId, kind: 'PAGE', status: 'APPROVED' } }),
      this.prisma.marque.findUnique({ where: { id_marque: marqueId }, select: { charge_compte: { select: { prenom: true } } } }),
      activeFeatures(this.prisma, marqueId),
      this.prisma.produit.groupBy({ by: ['status'], where: { id_marque: marqueId }, _count: true }),
    ]);
    const count = (status: string) => products.find((p) => p.status === status)?._count ?? 0;

    return {
      brandName: draft.name,
      logoUrl: draft.logoUrl,
      accentColor: draft.accentColor,
      contactFirstName,
      userEmail,
      unansweredReviews,
      // Never submitted (still DRAFT) and nothing ever published on the live page.
      brandSetupPending: pageStatus === 'DRAFT' && !published.story?.trim(),
      verified: approvals > 0,
      accountManager: manager?.charge_compte?.prenom ?? null,
      features,
      launch: {
        pageStatus,
        productsOnline: count('ONLINE'),
        productsInReview: count('IN_REVIEW'),
        productsTotal: products.reduce((a, p) => a + p._count, 0),
      },
    };
  }
}

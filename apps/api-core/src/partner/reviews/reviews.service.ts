import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { PartnerReview, PartnerReviewsResponse, ReviewFilter } from '@withyou/shared-types';
import { PrismaService } from '../../prisma/prisma.service';

type ReviewRow = {
  id_avis: string;
  auteur: string;
  stars: number;
  skin_type: string | null;
  texte: string;
  created_at: Date;
  reply: string | null;
  verified: boolean;
  produit: { nom: string };
};

function toDto(r: ReviewRow): PartnerReview {
  return {
    id: r.id_avis,
    auteur: r.auteur,
    stars: r.stars,
    produitNom: r.produit.nom,
    skinType: r.skin_type,
    texte: r.texte,
    createdAt: r.created_at.toISOString(),
    reply: r.reply,
    verified: r.verified,
  };
}

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  parseFilter(raw: string | undefined): ReviewFilter {
    return raw === 'open' || raw === 'low' ? raw : 'all';
  }

  async list(marqueId: string, filter: ReviewFilter): Promise<PartnerReviewsResponse> {
    const all = await this.prisma.avis.findMany({
      where: { id_marque: marqueId },
      include: { produit: { select: { nom: true } } },
      orderBy: { created_at: 'desc' },
    });

    const distribution = [5, 4, 3, 2, 1].map((stars) => ({
      stars,
      pct: all.length ? Math.round((all.filter((r) => r.stars === stars).length / all.length) * 100) : 0,
    }));
    const avg = all.length ? Math.round((all.reduce((s, r) => s + r.stars, 0) / all.length) * 10) / 10 : null;

    const visible = all.filter(
      (r) => filter === 'all' || (filter === 'open' && !r.reply) || (filter === 'low' && r.stars <= 3),
    );

    return {
      summary: { avg, count: all.length, distribution },
      unanswered: all.filter((r) => !r.reply).length,
      reviews: visible.map(toDto),
    };
  }

  async reply(marqueId: string, id: string, text: string): Promise<PartnerReview> {
    const trimmed = text.trim();
    if (!trimmed) throw new BadRequestException('Écrivez votre réponse avant de la publier.');

    const review = await this.prisma.avis.findFirst({ where: { id_avis: id, id_marque: marqueId } });
    if (!review) throw new NotFoundException('Avis introuvable.');
    if (review.reply) throw new ConflictException('Vous avez déjà répondu à cet avis.');

    const updated = await this.prisma.avis.update({
      where: { id_avis: id },
      data: { reply: trimmed, replied_at: new Date() },
      include: { produit: { select: { nom: true } } },
    });
    return toDto(updated);
  }
}

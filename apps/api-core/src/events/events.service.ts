import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './create-event.dto';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Records a consumer behaviour event for brand analytics. Silently ignores
   * events that point at nothing publishable — this endpoint is public, so it
   * must never reveal whether a brand or product exists.
   */
  async record(dto: CreateEventDto): Promise<void> {
    let marqueId: string | null = null;
    let produitId: string | null = null;

    if (dto.produitId) {
      const produit = await this.prisma.produit.findFirst({
        where: { id_product: dto.produitId, status: 'ONLINE', marque: { page_status: 'LIVE', compte_status: 'ACTIVE' } },
        select: { id_product: true, id_marque: true },
      });
      if (!produit) return;
      produitId = produit.id_product;
      marqueId = produit.id_marque;
    } else if (dto.slug) {
      const marque = await this.prisma.marque.findFirst({
        where: { slug: dto.slug, page_status: 'LIVE', compte_status: 'ACTIVE' },
        select: { id_marque: true },
      });
      if (!marque) return;
      marqueId = marque.id_marque;
    }

    if (!marqueId) return;

    await this.prisma.analytics_event.create({
      data: {
        type: dto.type,
        id_marque: marqueId,
        id_produit: produitId,
        query: dto.type === 'SEARCH' ? (dto.query?.trim().toLowerCase() ?? null) : null,
        skin_type: dto.skinType ?? null,
        wilaya: dto.wilaya ?? null,
      },
    });
  }
}

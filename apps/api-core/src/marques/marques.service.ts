import { Injectable, NotFoundException } from '@nestjs/common';
import type { PublicBrandCard, PublicBrandPage } from '@withyou/shared-types';
import { brandCoverImage } from '@withyou/shared-utils';
import { PrismaService } from '../prisma/prisma.service';
import { marqueWithBrandContent, toPublishedBrandContent } from './brand-content.mapper';
import { loadBrandExtras } from './brand-extras';

@Injectable()
export class MarquesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Marques visibles par les clientes : page publiée et compte non suspendu. */
  async findPublished(): Promise<PublicBrandCard[]> {
    const marques = await this.prisma.marque.findMany({
      where: { page_status: 'LIVE', compte_status: 'ACTIVE' },
      include: { identity_marque: true },
      orderBy: { nom_marque: 'asc' },
    });
    return marques.map((m) => ({
      slug: m.slug,
      name: m.nom_marque,
      imageUrl: brandCoverImage(m.identity_marque?.banner_url, m.identity_marque?.banner_poster_url),
      logoUrl: m.identity_marque?.logo_url ?? null,
    }));
  }

  async findBySlug(slug: string): Promise<PublicBrandPage> {
    const marque = await this.prisma.marque.findUnique({
      where: { slug },
      ...marqueWithBrandContent,
    });

    if (!marque || marque.page_status !== 'LIVE' || marque.compte_status !== 'ACTIVE') {
      throw new NotFoundException('Marque introuvable.');
    }

    const content = toPublishedBrandContent(marque);
    return {
      slug: marque.slug,
      content,
      ...(await loadBrandExtras(this.prisma, marque.id_marque, content)),
    };
  }
}

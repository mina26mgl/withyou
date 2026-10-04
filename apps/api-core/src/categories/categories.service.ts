import { Injectable } from '@nestjs/common';
import type { Categorie } from '@withyou/shared-types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Categorie[]> {
    const categories = await this.prisma.categorie.findMany({ orderBy: { nom: 'asc' } });
    return categories.map((c) => ({ id: c.id_cat, nom: c.nom, slug: c.slug, parentId: c.id_parent }));
  }
}

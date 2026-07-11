import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProduitDto } from './dto/create-produit.dto';

@Injectable()
export class ProduitsService {
  constructor(private readonly prisma: PrismaService) {}

  findActive() {
    return this.prisma.produit.findMany({ where: { statut: 'ACTIVE', deletedAt: null } });
  }

  findById(id: string) {
    return this.prisma.produit.findUnique({ where: { id } });
  }

  async findByPartenaire(userId: string) {
    const partenaire = await this.prisma.partenaire.findUnique({ where: { userId } });
    if (!partenaire) return [];
    return this.prisma.produit.findMany({ where: { partenaireId: partenaire.id, deletedAt: null } });
  }

  async create(userId: string, dto: CreateProduitDto) {
    const partenaire = await this.prisma.partenaire.findUniqueOrThrow({ where: { userId } });
    return this.prisma.produit.create({
      data: {
        ...dto,
        partenaireId: partenaire.id,
        imagesUrls: dto.imagesUrls ?? [],
      },
    });
  }
}

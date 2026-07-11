import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommandesService {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string) {
    const consommateur = await this.prisma.consommateur.findUnique({ where: { userId } });
    if (!consommateur) return [];

    return this.prisma.commande.findMany({
      where: { consommateurId: consommateur.id },
      include: { lignes: true, paiement: true, livraison: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}

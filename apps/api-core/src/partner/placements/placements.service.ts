import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePlacementDto } from './create-placement.dto';

@Injectable()
export class PlacementsService {
  constructor(private readonly prisma: PrismaService) {}

  async request(marqueId: string, dto: CreatePlacementDto) {
    if (dto.produitId) {
      const owns = await this.prisma.produit.count({ where: { id_product: dto.produitId, id_marque: marqueId } });
      if (!owns) throw new BadRequestException('Produit introuvable.');
    }
    const created = await this.prisma.placement_request.create({
      data: { id_marque: marqueId, kind: dto.kind, id_produit: dto.produitId ?? null },
    });
    return { id: created.id_request, kind: created.kind, status: created.status };
  }
}

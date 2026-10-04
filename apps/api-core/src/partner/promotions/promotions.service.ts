import { BadRequestException, Injectable } from '@nestjs/common';
import type { PartnerPromotion, PromotionStatus } from '@withyou/shared-types';
import { PrismaService } from '../../prisma/prisma.service';
import { startOfUtcDay } from '../common/partner-stats.service';
import { CreatePromotionDto } from './create-promotion.dto';

type PromotionRow = {
  id_promotion: string;
  nom: string;
  reduction: number;
  date_debut: Date;
  date_fin: Date;
  utilisations: number;
  produits: { produit: { nom: string } }[];
};

export function promotionStatus(debut: Date, fin: Date, now = new Date()): PromotionStatus {
  const today = startOfUtcDay(now).getTime();
  if (today < debut.getTime()) return 'SCHEDULED';
  if (today > fin.getTime()) return 'ENDED';
  return 'ACTIVE';
}

function toDto(p: PromotionRow): PartnerPromotion {
  return {
    id: p.id_promotion,
    nom: p.nom,
    reduction: p.reduction,
    produitsNoms: p.produits.map((x) => x.produit.nom.split(',')[0]),
    dateDebut: p.date_debut.toISOString().slice(0, 10),
    dateFin: p.date_fin.toISOString().slice(0, 10),
    utilisations: p.utilisations,
    status: promotionStatus(p.date_debut, p.date_fin),
  };
}

const include = { produits: { include: { produit: { select: { nom: true } } } } } as const;

@Injectable()
export class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(marqueId: string): Promise<PartnerPromotion[]> {
    const rows = await this.prisma.promotion.findMany({
      where: { id_marque: marqueId },
      include,
      orderBy: { created_at: 'desc' },
    });
    return rows.map(toDto);
  }

  async create(marqueId: string, dto: CreatePromotionDto): Promise<PartnerPromotion> {
    if (!dto.nom.trim()) throw new BadRequestException('Donnez un nom à la promotion.');
    if (dto.produitIds.length === 0) throw new BadRequestException('Choisissez au moins un produit.');
    if (!(dto.reduction >= 5 && dto.reduction <= 50)) {
      throw new BadRequestException('La réduction doit être entre 5 et 50 %.');
    }
    const debut = new Date(dto.dateDebut);
    const fin = new Date(dto.dateFin);
    if (Number.isNaN(debut.getTime()) || Number.isNaN(fin.getTime()) || fin < debut) {
      throw new BadRequestException('La date de fin doit suivre la date de début.');
    }

    const ids = [...new Set(dto.produitIds)];
    const owned = await this.prisma.produit.count({
      where: { id_product: { in: ids }, id_marque: marqueId, status: 'ONLINE' },
    });
    if (owned !== ids.length) {
      throw new BadRequestException('Seuls vos produits en ligne peuvent être en promotion.');
    }

    const created = await this.prisma.promotion.create({
      data: {
        id_marque: marqueId,
        nom: dto.nom.trim(),
        reduction: dto.reduction,
        date_debut: debut,
        date_fin: fin,
        produits: { create: ids.map((id) => ({ id_produit: id })) },
      },
      include,
    });
    return toDto(created);
  }
}

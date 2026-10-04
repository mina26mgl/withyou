import { BadRequestException, Injectable } from '@nestjs/common';
import type { PartnerSalonTest, PartnerSalonTestsResponse } from '@withyou/shared-types';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSalonTestDto } from './create-salon-test.dto';

const include = { produit: { select: { nom: true } }, salon: true } as const;

type Row = {
  id_test: string;
  status: 'PENDING' | 'RUNNING' | 'DONE';
  echantillons: number;
  testeuses: number;
  score: { toString(): string } | null;
  citation: string | null;
  produit: { nom: string };
  salon: { nom: string; wilaya: string } | null;
};

function toDto(t: Row): PartnerSalonTest {
  return {
    id: t.id_test,
    produitNom: t.produit.nom,
    salonNom: t.salon?.nom ?? null,
    salonWilaya: t.salon?.wilaya ?? null,
    status: t.status,
    echantillons: t.echantillons,
    testeuses: t.testeuses,
    score: t.score ? Number(t.score.toString()) : null,
    citation: t.citation,
  };
}

@Injectable()
export class SalonTestsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(marqueId: string): Promise<PartnerSalonTestsResponse> {
    const rows = await this.prisma.salon_test.findMany({
      where: { id_marque: marqueId },
      include,
      orderBy: { created_at: 'desc' },
    });
    const tests = rows.map(toDto);
    const scored = tests.filter((t) => t.score !== null);
    return {
      summary: {
        tests: tests.length,
        testeuses: tests.reduce((s, t) => s + t.testeuses, 0),
        satisfaction: scored.length
          ? Math.round((scored.reduce((s, t) => s + (t.score ?? 0), 0) / scored.length) * 10) / 10
          : null,
      },
      tests,
    };
  }

  async create(marqueId: string, dto: CreateSalonTestDto): Promise<PartnerSalonTest> {
    if (!(dto.echantillons >= 5 && dto.echantillons <= 50)) {
      throw new BadRequestException("Le nombre d'échantillons doit être entre 5 et 50.");
    }
    const produit = await this.prisma.produit.findFirst({
      where: { id_product: dto.produitId, id_marque: marqueId, status: { not: 'DRAFT' } },
    });
    if (!produit) throw new BadRequestException('Choisissez un produit déjà envoyé en vérification ou en ligne.');

    const created = await this.prisma.salon_test.create({
      data: {
        id_marque: marqueId,
        id_produit: dto.produitId,
        echantillons: dto.echantillons,
        wilaya_souhaitee: dto.wilaya && dto.wilaya !== 'Peu importe' ? dto.wilaya : null,
        question: dto.question?.trim() || null,
      },
      include,
    });
    return toDto(created);
  }
}

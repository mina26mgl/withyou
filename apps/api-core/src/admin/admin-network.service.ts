import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AdminSalon, AdminSpecialist } from '@withyou/shared-types';
import { slugify } from '@withyou/shared-utils';
import { PrismaService } from '../prisma/prisma.service';
import type { SalonDto, SpecialistDto } from './admin-network.dto';

const clean = (v: string | null | undefined) => (v?.trim() ? v.trim() : null);

/** Réseau terrain de withyou : salons partenaires et spécialistes beauté. */
@Injectable()
export class AdminNetworkService {
  constructor(private readonly prisma: PrismaService) {}

  private audit(adminId: string, action: string, targetType: string, id: string, after: unknown) {
    return this.prisma.audit_log.create({
      data: { actor_admin_id: adminId, action, target_type: targetType, target_id: id, after: after as Prisma.InputJsonValue },
    });
  }

  /* --------------------------------- Salons --------------------------------- */

  async salons(): Promise<AdminSalon[]> {
    const rows = await this.prisma.salon.findMany({
      orderBy: [{ active: 'desc' }, { nom: 'asc' }],
      include: { _count: { select: { salon_test: true } } },
    });
    return rows.map((s) => ({
      id: s.id_salon,
      nom: s.nom,
      type: s.type,
      wilaya: s.wilaya,
      ville: s.ville,
      code: s.code,
      formee: s.formee,
      active: s.active,
      telephone: s.telephone,
      tests: s._count.salon_test,
    }));
  }

  /** « Salon Lumière » → LUMIERE10 (puis LUMIERE11… si déjà pris). */
  private async freeCode(nom: string, exceptId?: string): Promise<string> {
    const base =
      slugify(nom.replace(/^(salon|institut|espace)\s+/i, ''))
        .replace(/-/g, '')
        .toUpperCase()
        .slice(0, 12) || 'SALON';
    for (let n = 10; ; n++) {
      const code = `${base}${n}`;
      const taken = await this.prisma.salon.findFirst({ where: { code, ...(exceptId ? { NOT: { id_salon: exceptId } } : {}) } });
      if (!taken) return code;
    }
  }

  private async salonData(dto: SalonDto, exceptId?: string) {
    return {
      nom: dto.nom.trim(),
      type: dto.type.trim(),
      wilaya: dto.wilaya,
      ville: clean(dto.ville),
      code: dto.code?.trim() || (await this.freeCode(dto.nom, exceptId)),
      formee: dto.formee,
      active: dto.active,
      telephone: clean(dto.telephone),
    };
  }

  private rethrowCode(e: unknown, code: string): never {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw new ConflictException(`Le code partenaire ${code} est déjà utilisé par un autre salon.`);
    }
    throw e;
  }

  async createSalon(adminId: string, dto: SalonDto) {
    const data = await this.salonData(dto);
    try {
      const s = await this.prisma.salon.create({ data });
      await this.audit(adminId, 'SALON_CREATED', 'salon', s.id_salon, data);
      return { id: s.id_salon, code: s.code };
    } catch (e) {
      this.rethrowCode(e, data.code);
    }
  }

  async updateSalon(adminId: string, id: string, dto: SalonDto) {
    if (!(await this.prisma.salon.findUnique({ where: { id_salon: id } }))) throw new NotFoundException('Salon introuvable.');
    const data = await this.salonData(dto, id);
    try {
      await this.prisma.salon.update({ where: { id_salon: id }, data });
    } catch (e) {
      this.rethrowCode(e, data.code);
    }
    await this.audit(adminId, 'SALON_UPDATED', 'salon', id, data);
  }

  /* ------------------------------ Spécialistes ------------------------------ */

  async specialists(): Promise<AdminSpecialist[]> {
    const rows = await this.prisma.specialiste.findMany({ orderBy: [{ actif: 'desc' }, { prenom: 'asc' }] });
    return rows.map((s) => ({
      id: s.id_specialiste,
      categorie: s.categorie,
      prenom: s.prenom,
      nom: s.nom,
      role: s.role,
      wilaya: s.wilaya,
      description: s.description,
      disponibilites: s.disponibilites,
      audience: s.audience,
      reseau: s.reseau,
      telephone: s.telephone,
      email: s.email,
      actif: s.actif,
    }));
  }

  private specialistData(dto: SpecialistDto) {
    return {
      categorie: dto.categorie,
      prenom: dto.prenom.trim(),
      nom: dto.nom.trim(),
      role: dto.role.trim(),
      wilaya: dto.wilaya,
      description: dto.description.trim(),
      disponibilites: clean(dto.disponibilites),
      audience: clean(dto.audience),
      reseau: clean(dto.reseau),
      telephone: clean(dto.telephone),
      email: clean(dto.email),
      actif: dto.actif,
    };
  }

  async createSpecialist(adminId: string, dto: SpecialistDto) {
    const s = await this.prisma.specialiste.create({ data: this.specialistData(dto) });
    await this.audit(adminId, 'SPECIALIST_CREATED', 'specialiste', s.id_specialiste, { categorie: dto.categorie, role: dto.role });
    return { id: s.id_specialiste };
  }

  async updateSpecialist(adminId: string, id: string, dto: SpecialistDto) {
    if (!(await this.prisma.specialiste.findUnique({ where: { id_specialiste: id } }))) throw new NotFoundException('Spécialiste introuvable.');
    await this.prisma.specialiste.update({ where: { id_specialiste: id }, data: this.specialistData(dto) });
    await this.audit(adminId, 'SPECIALIST_UPDATED', 'specialiste', id, { categorie: dto.categorie, role: dto.role, actif: dto.actif });
  }
}

import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AdminBoxDetail, AdminBoxItem, AdminBoxSummary, AdminCatalogProduct, BoxItemState } from '@withyou/shared-types';
import type { BoxDto, BoxItemDto } from './admin-box.dto';
import { PrismaService } from '../prisma/prisma.service';

const iso = (d: Date) => d.toISOString().slice(0, 10);

function itemState(p: { quantite_necessaire: number; quantite_confirmee: number; marque_a_repondu: boolean }): BoxItemState {
  if (!p.marque_a_repondu) return 'ATTENTE';
  return p.quantite_confirmee >= p.quantite_necessaire ? 'REUNI' : 'MANQUE';
}

const toItem = (p: Prisma.box_produitGetPayload<object>): AdminBoxItem => ({
  id: p.id_box_produit,
  idProduit: p.id_produit,
  nom: p.nom_produit,
  marque: p.marque,
  variantes: p.variantes,
  besoin: p.quantite_necessaire,
  confirme: p.quantite_confirmee,
  etat: itemState(p),
  relanceAt: p.relance_at?.toISOString() ?? null,
});

@Injectable()
export class AdminBoxService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<AdminBoxSummary[]> {
    const boxes = await this.prisma.box_rituel.findMany({ orderBy: { mois: 'desc' } });
    return boxes.map((b) => ({ id: b.id_box, nom: b.nom, mois: iso(b.mois), statut: b.statut, demo: b.demo }));
  }

  /** Box en préparation dont l'assemblage est le plus proche (celle « du moment »). */
  async current() {
    const today = new Date(new Date().toISOString().slice(0, 10));
    return (
      (await this.prisma.box_rituel.findFirst({
        where: { statut: 'PREPARATION', date_assemblage: { gte: today } },
        orderBy: { date_assemblage: 'asc' },
      })) ?? (await this.prisma.box_rituel.findFirst({ where: { statut: 'PREPARATION' }, orderBy: { mois: 'asc' } }))
    );
  }

  async shortages(): Promise<{ id: string; nom: string; manques: AdminBoxItem[] } | null> {
    const box = await this.current();
    if (!box) return null;
    const produits = await this.prisma.box_produit.findMany({ where: { id_box: box.id_box }, orderBy: { nom_produit: 'asc' } });
    return { id: box.id_box, nom: box.nom, manques: produits.map(toItem).filter((p) => p.etat !== 'REUNI') };
  }

  async detail(id: string): Promise<AdminBoxDetail> {
    const b = await this.prisma.box_rituel.findUnique({
      where: { id_box: id },
      include: {
        variantes: { orderBy: { abonnees: 'desc' } },
        produits: { orderBy: { nom_produit: 'asc' } },
        candidatures: { orderBy: { created_at: 'asc' } },
      },
    });
    if (!b) throw new NotFoundException('Box introuvable.');
    return {
      id: b.id_box,
      nom: b.nom,
      mois: iso(b.mois),
      statut: b.statut,
      demo: b.demo,
      dateAssemblage: iso(b.date_assemblage),
      dateExpedition: iso(b.date_expedition),
      variantes: b.variantes.map((v) => ({ typePeau: v.type_peau, abonnees: v.abonnees })),
      produits: b.produits.map(toItem),
      candidatures: b.candidatures.map((c) => ({ id: c.id_candidature, marque: c.marque, produit: c.nom_produit, variante: c.variante, statut: c.statut })),
    };
  }

  private audit(adminId: string, action: string, targetType: string, id: string, after: unknown) {
    return this.prisma.audit_log.create({
      data: { actor_admin_id: adminId, action, target_type: targetType, target_id: id, after: after as Prisma.InputJsonValue },
    });
  }

  /** Relance d'une marque pour un produit pas encore réuni. */
  async relance(adminId: string, itemId: string) {
    const p = await this.prisma.box_produit.findUnique({ where: { id_box_produit: itemId } });
    if (!p) throw new NotFoundException('Produit introuvable.');
    if (itemState(p) === 'REUNI') throw new BadRequestException('Ce produit est déjà réuni.');
    await this.prisma.box_produit.update({ where: { id_box_produit: itemId }, data: { relance_at: new Date() } });
    await this.audit(adminId, 'BOX_RELANCE', 'box_produit', itemId, { marque: p.marque, produit: p.nom_produit });
  }

  async decide(adminId: string, candidatureId: string, statut: 'RETENUE' | 'REFUSEE') {
    const c = await this.prisma.box_candidature.findUnique({ where: { id_candidature: candidatureId } });
    if (!c) throw new NotFoundException('Candidature introuvable.');
    if (c.statut !== 'NOUVELLE') throw new BadRequestException('Cette candidature a déjà été traitée.');
    await this.prisma.box_candidature.update({ where: { id_candidature: candidatureId }, data: { statut } });
    // Retenue : le produit entre dans la box, pour la variante demandée (« Toutes » = toutes).
    if (statut === 'RETENUE') {
      const variants = await this.prisma.box_variante.findMany({ where: { id_box: c.id_box }, select: { type_peau: true } });
      const all = variants.map((v) => v.type_peau);
      const chosen = /toutes/i.test(c.variante) ? all : all.filter((t) => t.toLowerCase() === c.variante.toLowerCase());
      await this.addItem(adminId, c.id_box, { nom: c.nom_produit, marque: c.marque, variantes: chosen.length ? chosen : all });
    }
    await this.audit(adminId, statut === 'RETENUE' ? 'BOX_CANDIDATURE_RETENUE' : 'BOX_CANDIDATURE_REFUSEE', 'box_candidature', candidatureId, {
      marque: c.marque,
      produit: c.nom_produit,
    });
  }

  /* --------------------------- Création et édition --------------------------- */

  /** Quantité nécessaire : abonnées des variantes qui reçoivent le produit. */
  private async need(boxId: string, variantes: string[]) {
    const v = await this.prisma.box_variante.findMany({ where: { id_box: boxId, type_peau: { in: variantes } } });
    return v.reduce((a, x) => a + x.abonnees, 0);
  }

  private async checkVariants(boxId: string, variantes: string[]) {
    const known = (await this.prisma.box_variante.findMany({ where: { id_box: boxId }, select: { type_peau: true } })).map((v) => v.type_peau);
    const unknown = variantes.filter((v) => !known.includes(v));
    if (unknown.length) throw new BadRequestException(`Variante inconnue dans cette box : ${unknown.join(', ')}.`);
  }

  private dates(dto: BoxDto) {
    const assemblage = new Date(dto.dateAssemblage);
    const expedition = new Date(dto.dateExpedition);
    if (expedition < assemblage) throw new BadRequestException("L'expédition ne peut pas précéder l'assemblage.");
    return { date_assemblage: assemblage, date_expedition: expedition };
  }

  private uniqueVariants(dto: BoxDto) {
    const names = dto.variantes.map((v) => v.typePeau.trim());
    if (new Set(names.map((n) => n.toLowerCase())).size !== names.length) throw new BadRequestException('Deux variantes portent le même nom.');
    return dto.variantes.map((v) => ({ type_peau: v.typePeau.trim(), abonnees: v.abonnees }));
  }

  async createBox(adminId: string, dto: BoxDto) {
    if (!dto.mois) throw new BadRequestException('Choisissez le mois de la box.');
    const mois = new Date(`${dto.mois}-01`);
    if (await this.prisma.box_rituel.findUnique({ where: { mois } })) throw new ConflictException('Une box existe déjà pour ce mois.');
    const b = await this.prisma.box_rituel.create({
      data: { nom: dto.nom.trim(), mois, ...this.dates(dto), variantes: { create: this.uniqueVariants(dto) } },
    });
    await this.audit(adminId, 'BOX_CREATED', 'box_rituel', b.id_box, { nom: b.nom, mois: dto.mois });
    return { id: b.id_box };
  }

  /** Modifie la box ; si les abonnées changent, les besoins de ses produits sont recalculés. */
  async updateBox(adminId: string, id: string, dto: BoxDto) {
    const box = await this.prisma.box_rituel.findUnique({ where: { id_box: id }, include: { produits: true } });
    if (!box) throw new NotFoundException('Box introuvable.');
    const variants = this.uniqueVariants(dto);
    const names = variants.map((v) => v.type_peau);
    const used = [...new Set(box.produits.flatMap((p) => p.variantes))].filter((v) => !names.includes(v));
    if (used.length) throw new BadRequestException(`Des produits sont prévus pour : ${used.join(', ')}. Retirez-les de ces produits avant de supprimer la variante.`);

    await this.prisma.$transaction(async (tx) => {
      await tx.box_rituel.update({
        where: { id_box: id },
        data: { nom: dto.nom.trim(), ...this.dates(dto), ...(dto.statut ? { statut: dto.statut } : {}) },
      });
      await tx.box_variante.deleteMany({ where: { id_box: id, type_peau: { notIn: names } } });
      for (const v of variants) {
        await tx.box_variante.upsert({
          where: { id_box_type_peau: { id_box: id, type_peau: v.type_peau } },
          update: { abonnees: v.abonnees },
          create: { id_box: id, ...v },
        });
      }
      const by = new Map(variants.map((v) => [v.type_peau, v.abonnees]));
      for (const p of box.produits) {
        const besoin = p.variantes.reduce((a, t) => a + (by.get(t) ?? 0), 0);
        if (besoin !== p.quantite_necessaire) await tx.box_produit.update({ where: { id_box_produit: p.id_box_produit }, data: { quantite_necessaire: besoin } });
      }
    });
    await this.audit(adminId, 'BOX_UPDATED', 'box_rituel', id, { nom: dto.nom, statut: dto.statut });
  }

  /** Produits du catalogue qu'on peut mettre dans une box. */
  async catalogue(): Promise<AdminCatalogProduct[]> {
    const produits = await this.prisma.produit.findMany({
      where: { status: { in: ['ONLINE', 'IN_REVIEW'] } },
      orderBy: { nom: 'asc' },
      select: { id_product: true, nom: true, status: true, marque: { select: { nom_marque: true, draft: true } } },
    });
    return produits.map((p) => ({
      id: p.id_product,
      nom: p.nom,
      marque: (p.marque.draft as { name?: string } | null)?.name?.trim() || p.marque.nom_marque,
      statut: p.status,
    }));
  }

  async addItem(adminId: string, boxId: string, dto: BoxItemDto) {
    if (!(await this.prisma.box_rituel.findUnique({ where: { id_box: boxId } }))) throw new NotFoundException('Box introuvable.');
    await this.checkVariants(boxId, dto.variantes);
    let nom = dto.nom?.trim() ?? '';
    let marque = dto.marque?.trim() ?? '';
    if (dto.idProduit) {
      const p = (await this.catalogue()).find((x) => x.id === dto.idProduit);
      if (!p) throw new NotFoundException('Produit du catalogue introuvable.');
      nom = p.nom;
      marque = p.marque;
    }
    if (nom.length < 2 || marque.length < 2) throw new BadRequestException('Indiquez le produit et sa marque.');
    const item = await this.prisma.box_produit.create({
      data: {
        id_box: boxId,
        id_produit: dto.idProduit ?? null,
        nom_produit: nom,
        marque,
        variantes: dto.variantes,
        quantite_necessaire: await this.need(boxId, dto.variantes),
        quantite_confirmee: dto.quantiteConfirmee ?? 0,
        marque_a_repondu: dto.marqueARepondu ?? dto.quantiteConfirmee !== undefined,
      },
    });
    await this.audit(adminId, 'BOX_PRODUCT_ADDED', 'box_produit', item.id_box_produit, { nom, marque });
    return { id: item.id_box_produit };
  }

  async updateItem(adminId: string, itemId: string, dto: BoxItemDto) {
    const p = await this.prisma.box_produit.findUnique({ where: { id_box_produit: itemId } });
    if (!p) throw new NotFoundException('Produit introuvable.');
    await this.checkVariants(p.id_box, dto.variantes);
    await this.prisma.box_produit.update({
      where: { id_box_produit: itemId },
      data: {
        ...(!p.id_produit && dto.nom?.trim() ? { nom_produit: dto.nom.trim() } : {}),
        ...(!p.id_produit && dto.marque?.trim() ? { marque: dto.marque.trim() } : {}),
        variantes: dto.variantes,
        quantite_necessaire: await this.need(p.id_box, dto.variantes),
        ...(dto.quantiteConfirmee !== undefined ? { quantite_confirmee: dto.quantiteConfirmee } : {}),
        ...(dto.marqueARepondu !== undefined ? { marque_a_repondu: dto.marqueARepondu } : {}),
      },
    });
    await this.audit(adminId, 'BOX_PRODUCT_UPDATED', 'box_produit', itemId, { confirme: dto.quantiteConfirmee });
  }

  async removeItem(adminId: string, itemId: string) {
    const p = await this.prisma.box_produit.findUnique({ where: { id_box_produit: itemId } });
    if (!p) throw new NotFoundException('Produit introuvable.');
    await this.prisma.box_produit.delete({ where: { id_box_produit: itemId } });
    await this.audit(adminId, 'BOX_PRODUCT_REMOVED', 'box_produit', itemId, { nom: p.nom_produit, marque: p.marque });
  }
}

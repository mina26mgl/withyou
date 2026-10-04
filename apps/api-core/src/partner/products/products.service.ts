import { randomUUID } from 'crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { PackItem, ProduitDocumentType } from '@withyou/shared-types';
import { PackItemDto, UpsertProductDto } from '../dto/upsert-product.dto';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const productWithRelations = Prisma.validator<Prisma.produitDefaultArgs>()({
  include: {
    categorie: true,
    produit_image: { orderBy: { ordre: 'asc' } },
    produit_document: { orderBy: { ordre: 'asc' } },
    // Dernière décision de withyou : son message s'affiche si le produit a été refusé.
    validation_request: { where: { kind: 'PRODUCT', status: 'REJECTED' }, orderBy: { resolved_at: 'desc' }, take: 1 },
    pack_contenu: {
      orderBy: { ordre: 'asc' },
      include: { composant: { include: { produit_image: { orderBy: { ordre: 'asc' }, take: 1 } } } },
    },
  },
});
type ProductWithRelations = Prisma.produitGetPayload<typeof productWithRelations>;

/** Conservation par défaut quand la marque n'a rien précisé. */
const DEFAULT_CONSERVATION = 'Température ambiante';

/** Modes choisis, sans doublon ni vide ; undefined si la marque n'en a envoyé aucun. */
function cleanModes(modes: string[] | undefined): string[] | undefined {
  const cleaned = [...new Set((modes ?? []).map((m) => m.trim()).filter(Boolean))];
  return cleaned.length ? cleaned : undefined;
}

/**
 * Contenu d'un pack vérifié, et tout ce qui s'en déduit : la marque ne choisit
 * que les photos, les produits, le nom, le prix et la description.
 */
interface ResolvedPack {
  items: { id_produit: string; quantite: number; ordre: number }[];
  /** Catégorie du premier produit du pack. */
  categorieId: string;
  /** Ingrédients de tous les produits du pack, sans doublon. */
  ingredients: string[];
  skinTypes: string[];
  needs: string[];
  /** Moment commun à tous les produits, sinon « Les deux ». */
  moment: string;
  modesConservation: string[];
  /** Conservation la plus courte parmi les produits du pack. */
  dureeConservationJours: number | null;
  /** Nombre de packs complets qu'on peut composer avec le stock des produits. */
  stock: number;
  /** Produits encore en brouillon ou refusés (bloquent l'envoi en vérification). */
  notReady: string[];
}

const union = (lists: string[][]) => [...new Set(lists.flat())];

/** Nombre de packs complets qu'on peut composer avec le stock de chaque produit. */
function packStock(items: { quantite: number; composant: { stock: number } }[]): number {
  return items.length ? Math.min(...items.map((i) => Math.floor(i.composant.stock / i.quantite))) : 0;
}

function splitInci(inci: string | undefined): string[] {
  if (!inci?.trim()) return [];
  return inci
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(marqueId: string) {
    const produits = await this.prisma.produit.findMany({
      where: { id_marque: marqueId },
      orderBy: { created_at: 'desc' },
      ...productWithRelations,
    });

    if (produits.length === 0) return [];

    const since = new Date(Date.now() - THIRTY_DAYS_MS);
    const lines = await this.prisma.ligne_order.findMany({
      where: {
        id_product: { in: produits.map((p) => p.id_product) },
        order: { created_at: { gte: since } },
      },
      select: { id_product: true, quantite: true },
    });
    const salesByProduct = new Map<string, number>();
    for (const line of lines) {
      salesByProduct.set(line.id_product, (salesByProduct.get(line.id_product) ?? 0) + line.quantite);
    }

    return produits.map((p) => this.toDto(p, salesByProduct.get(p.id_product) ?? 0));
  }

  async findOne(marqueId: string, id: string) {
    const produit = await this.prisma.produit.findFirst({
      where: { id_product: id, id_marque: marqueId },
      ...productWithRelations,
    });
    if (!produit) throw new NotFoundException('Produit introuvable.');
    return this.toDto(produit, 0);
  }

  async create(marqueId: string, dto: UpsertProductDto) {
    const id = randomUUID();
    const pack = dto.isPack ? await this.resolvePack(marqueId, id, dto.packItems) : null;
    this.validate(dto, pack);
    // Commission par défaut de la marque ; withyou peut ensuite la négocier produit par produit.
    const marque = await this.prisma.marque.findUniqueOrThrow({ where: { id_marque: marqueId }, select: { commission_rate: true } });

    await this.prisma.produit.create({
      data: {
        id_product: id,
        id_marque: marqueId,
        id_categori: pack ? pack.categorieId : dto.categorieId!,
        nom: dto.nom,
        description: dto.description,
        ingredients: pack ? pack.ingredients : splitInci(dto.inci),
        prix: dto.prix,
        stock: pack ? pack.stock : dto.stock!,
        status: dto.mode === 'draft' ? 'DRAFT' : 'IN_REVIEW',
        mode_conservation: pack ? pack.modesConservation : (cleanModes(dto.modesConservation) ?? [DEFAULT_CONSERVATION]),
        duree_conservation_jours: pack ? pack.dureeConservationJours : (dto.dureeConservationJours ?? null),
        is_pack: Boolean(pack),
        size: pack ? null : dto.size,
        skin_types: pack ? pack.skinTypes : dto.skinTypes,
        needs: pack ? pack.needs : dto.needs,
        moment: pack ? pack.moment : dto.moment,
        comission_negocie: marque.commission_rate,
        created_at: new Date(),
        updated_at: new Date(),
        produit_image: { create: this.toImageCreates(dto.images) },
        produit_document: { create: this.toDocumentCreates(dto.documents) },
        pack_contenu: pack ? { create: pack.items.map(({ id_produit, quantite, ordre }) => ({ id_produit, quantite, ordre })) } : undefined,
      },
    });
    if (dto.mode === 'review') await this.requestValidation(marqueId, id);

    return this.findOne(marqueId, id);
  }

  async update(marqueId: string, id: string, dto: UpsertProductDto) {
    const existing = await this.prisma.produit.findFirst({ where: { id_product: id, id_marque: marqueId } });
    if (!existing) throw new NotFoundException('Produit introuvable.');
    // Un produit reste ce qu'il est : pack ou produit simple.
    const pack = existing.is_pack ? await this.resolvePack(marqueId, id, dto.packItems) : null;
    this.validate(dto, pack);

    const wasOnline = existing.status === 'ONLINE';
    const nextStatus = dto.mode === 'draft' ? 'DRAFT' : wasOnline ? 'ONLINE' : 'IN_REVIEW';
    // TODO(admin-validation): once status flips to ONLINE via the admin validation
    // flow (not yet built), trigger reindexing in api-ai/Qdrant here or from that flow.

    await this.prisma.$transaction([
      this.prisma.produit.update({
        where: { id_product: id },
        data: {
          id_categori: pack ? pack.categorieId : dto.categorieId!,
          nom: dto.nom,
          description: dto.description,
          ingredients: pack ? pack.ingredients : splitInci(dto.inci),
          prix: dto.prix,
          stock: pack ? pack.stock : dto.stock!,
          status: nextStatus,
          size: pack ? null : dto.size,
          skin_types: pack ? pack.skinTypes : dto.skinTypes,
          needs: pack ? pack.needs : dto.needs,
          moment: pack ? pack.moment : dto.moment,
          mode_conservation: pack ? pack.modesConservation : (cleanModes(dto.modesConservation) ?? existing.mode_conservation),
          duree_conservation_jours: pack ? pack.dureeConservationJours : (dto.dureeConservationJours ?? null),
          updated_at: new Date(),
        },
      }),
      ...(pack
        ? [
            this.prisma.pack_produit.deleteMany({ where: { id_pack: id } }),
            this.prisma.pack_produit.createMany({ data: pack.items.map((item) => ({ ...item, id_pack: id })) }),
          ]
        : []),
      this.prisma.produit_image.deleteMany({ where: { id_produit: id } }),
      // Absent du corps (ancien client) : on garde les documents existants.
      ...(dto.documents
        ? [
            this.prisma.produit_document.deleteMany({ where: { id_produit: id } }),
            this.prisma.produit_document.createMany({
              data: this.toDocumentCreates(dto.documents).map((d) => ({ ...d, id_produit: id })),
            }),
          ]
        : []),
      ...(dto.images?.length
        ? [
            this.prisma.produit_image.createMany({
              data: dto.images.map((img) => ({
                id_produit: id,
                url: img.url,
                ordre: img.ordre,
                is_principale: img.isPrincipale,
              })),
            }),
          ]
        : []),
    ]);

    if (nextStatus === 'IN_REVIEW') await this.requestValidation(marqueId, id);

    return this.findOne(marqueId, id);
  }

  /** Envoi en vérification : une demande datée apparaît dans la console admin. */
  private async requestValidation(marqueId: string, produitId: string) {
    await this.prisma.$transaction([
      this.prisma.validation_request.deleteMany({ where: { id_produit: produitId, kind: 'PRODUCT', status: 'PENDING' } }),
      this.prisma.validation_request.create({ data: { id_marque: marqueId, id_produit: produitId, kind: 'PRODUCT' } }),
    ]);
  }

  /**
   * Contenu d'un pack : au moins 2 produits distincts de la marque, jamais un
   * autre pack ni le pack lui-même. Les ingrédients et la conservation du pack
   * en découlent.
   */
  private async resolvePack(marqueId: string, packId: string, items: PackItemDto[] | undefined): Promise<ResolvedPack> {
    const ids = (items ?? []).map((i) => i.produitId);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException("Un produit ne peut apparaître qu'une fois dans le pack : ajustez plutôt sa quantité.");
    }
    if (ids.length < 2) {
      throw new BadRequestException('Un pack contient au moins 2 de vos produits.');
    }
    const produits = await this.prisma.produit.findMany({
      where: { id_product: { in: ids }, id_marque: marqueId, is_pack: false, NOT: { id_product: packId } },
      select: {
        id_product: true,
        nom: true,
        status: true,
        id_categori: true,
        stock: true,
        ingredients: true,
        skin_types: true,
        needs: true,
        moment: true,
        mode_conservation: true,
        duree_conservation_jours: true,
      },
    });
    if (produits.length !== ids.length) {
      throw new BadRequestException("Un pack ne peut contenir que vos propres produits (pas d'autres packs).");
    }
    const byId = new Map(produits.map((p) => [p.id_product, p]));
    const ordered = ids.map((id) => byId.get(id)!);
    const durees = ordered.map((p) => p.duree_conservation_jours).filter((d): d is number => d != null);
    const moments = new Set(ordered.map((p) => p.moment ?? 'Les deux'));
    const packItems = (items ?? []).map((i, ordre) => ({ id_produit: i.produitId, quantite: i.quantite, ordre }));
    return {
      items: packItems,
      categorieId: ordered[0].id_categori,
      ingredients: union(ordered.map((p) => p.ingredients)),
      skinTypes: union(ordered.map((p) => p.skin_types)),
      needs: union(ordered.map((p) => p.needs)),
      moment: moments.size === 1 ? [...moments][0] : 'Les deux',
      modesConservation: union(ordered.map((p) => p.mode_conservation)),
      dureeConservationJours: durees.length ? Math.min(...durees) : null,
      stock: packStock(packItems.map((i) => ({ quantite: i.quantite, composant: byId.get(i.id_produit)! }))),
      notReady: ordered.filter((p) => p.status === 'DRAFT' || p.status === 'REJECTED').map((p) => p.nom),
    };
  }

  private validate(dto: UpsertProductDto, pack: ResolvedPack | null) {
    if (!dto.nom?.trim()) {
      throw new BadRequestException('Ajoutez le nom du produit.');
    }
    if (!(dto.prix > 0)) {
      throw new BadRequestException('Indiquez un prix supérieur à 0 DZD.');
    }
    if (pack && dto.mode === 'review') {
      if (pack.notReady.length) {
        throw new BadRequestException(
          `Envoyez d'abord en vérification les produits du pack encore en brouillon ou refusés : ${pack.notReady.join(', ')}.`,
        );
      }
      if (!pack.ingredients.length) {
        throw new BadRequestException("Les produits du pack n'ont pas encore de liste INCI.");
      }
    }
    if (!pack && (!dto.categorieId || dto.stock == null)) {
      throw new BadRequestException('Choisissez une catégorie et indiquez le stock.');
    }
    if (!pack && dto.mode === 'review' && !dto.inci?.trim()) {
      throw new BadRequestException('Ajoutez la liste INCI pour envoyer en vérification.');
    }
    // Même règle que la vérification automatique de la console (« Types de peau et besoins renseignés »).
    const skinTypes = pack ? pack.skinTypes : dto.skinTypes;
    const needs = pack ? pack.needs : dto.needs;
    if (dto.mode === 'review' && (!skinTypes?.length || !needs?.length)) {
      throw new BadRequestException(
        pack
          ? 'Les produits du pack doivent avoir au moins un type de peau et un besoin pour envoyer en vérification.'
          : 'Choisissez au moins un type de peau et un besoin (section « Pour qui ») pour envoyer en vérification.',
      );
    }
    if (dto.mode === 'review' && !(pack ? pack.dureeConservationJours : dto.dureeConservationJours)) {
      throw new BadRequestException('Indiquez la durée de conservation après ouverture pour envoyer en vérification.');
    }
  }

  private toImageCreates(images: UpsertProductDto['images']) {
    return (images ?? []).map((img) => ({
      url: img.url,
      ordre: img.ordre,
      is_principale: img.isPrincipale,
    }));
  }

  private toDocumentCreates(documents: UpsertProductDto['documents']) {
    return (documents ?? []).map((d, i) => ({ nom: d.nom.trim() || 'Document', url: d.url, type: d.type, taille: d.taille ?? null, ordre: i }));
  }

  private toDto(p: ProductWithRelations, ventes30j: number) {
    return {
      id: p.id_product,
      partenaireId: p.id_marque,
      categorieId: p.id_categori,
      categorieNom: p.categorie.nom,
      nom: p.nom,
      description: p.description,
      ingredients: p.ingredients.join(', '),
      prix: Number(p.prix),
      // Pack : calculé à chaque lecture, pour suivre le stock de ses produits.
      stock: p.is_pack ? packStock(p.pack_contenu) : p.stock,
      statut: p.status,
      imagesUrls: p.produit_image.map((img) => img.url),
      images: p.produit_image.map((img) => ({
        id: img.id_image,
        url: img.url,
        ordre: img.ordre,
        isPrincipale: img.is_principale,
        altText: img.alt_text,
      })),
      documents: p.produit_document.map((d) => ({
        nom: d.nom,
        url: d.url,
        type: d.type as ProduitDocumentType,
        taille: d.taille,
      })),
      size: p.size,
      skinTypes: p.skin_types,
      needs: p.needs,
      moment: p.moment,
      ventes30j,
      // No AI adaptation-score pipeline exists yet — always null until that ships.
      fitScore: null,
      modesConservation: p.mode_conservation,
      dureeConservationJours: p.duree_conservation_jours,
      rejectionMessage: p.status === 'REJECTED' ? (p.validation_request[0]?.rejection_message ?? null) : null,
      isPack: p.is_pack,
      packItems: p.pack_contenu.map(
        (item): PackItem => ({
          produitId: item.id_produit,
          nom: item.composant.nom,
          quantite: item.quantite,
          prix: Number(item.composant.prix),
          imageUrl: item.composant.produit_image[0]?.url ?? null,
          statut: item.composant.status,
        }),
      ),
      createdAt: p.created_at?.toISOString() ?? new Date().toISOString(),
      updatedAt: p.updated_at?.toISOString() ?? new Date().toISOString(),
    };
  }
}

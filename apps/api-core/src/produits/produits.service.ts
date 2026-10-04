import { randomUUID } from 'crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { PackItem, ProduitDocumentType, PublicProduct, PublicProductDetail } from '@withyou/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProduitDto } from './dto/create-produit.dto';

/**
 * Ce que voit une cliente : produit en ligne, marque publiée et non suspendue.
 * Un pack n'est visible que si tous ses produits sont eux-mêmes en ligne.
 */
export const PUBLIC_PRODUCT_WHERE = {
  status: 'ONLINE',
  marque: { page_status: 'LIVE', compte_status: 'ACTIVE' },
  OR: [{ is_pack: false }, { pack_contenu: { every: { composant: { status: 'ONLINE' } } } }],
} satisfies Prisma.produitWhereInput;

const publicProductArgs = Prisma.validator<Prisma.produitDefaultArgs>()({
  include: {
    marque: { include: { identity_marque: true } },
    produit_image: { orderBy: { ordre: 'asc' } },
  },
});

function toPublicProduct(p: Prisma.produitGetPayload<typeof publicProductArgs>): PublicProduct {
  return {
    id: p.id_product,
    nom: p.nom,
    description: p.description,
    ingredients: p.ingredients,
    prix: Number(p.prix),
    discount: p.discount != null ? Number(p.discount) : null,
    size: p.size,
    moment: p.moment,
    skinTypes: p.skin_types,
    needs: p.needs,
    imagesUrls: p.produit_image.map((i) => i.url),
    marque: { nom: p.marque.nom_marque, slug: p.marque.slug, logoUrl: p.marque.identity_marque?.logo_url ?? null },
    isPack: p.is_pack,
  };
}

@Injectable()
export class ProduitsService {
  constructor(private readonly prisma: PrismaService) {}

  async findPublic(): Promise<PublicProduct[]> {
    const produits = await this.prisma.produit.findMany({
      where: PUBLIC_PRODUCT_WHERE,
      ...publicProductArgs,
      orderBy: { nom: 'asc' },
    });
    return produits.map(toPublicProduct);
  }

  /**
   * Fiche complète d'un produit en ligne, avec ses avis vérifiés. Un produit hors
   * ligne (brouillon, en revue, refusé) n'existe pas pour une cliente.
   */
  async findPublicById(id: string): Promise<PublicProductDetail> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const produit = isUuid
      ? await this.prisma.produit.findFirst({
          where: { id_product: id, ...PUBLIC_PRODUCT_WHERE },
          include: {
            ...publicProductArgs.include,
            categorie: true,
            produit_document: { orderBy: { ordre: 'asc' } },
            pack_contenu: {
              orderBy: { ordre: 'asc' },
              include: { composant: { include: { produit_image: { orderBy: { ordre: 'asc' }, take: 1 } } } },
            },
          },
        })
      : null;
    if (!produit) {
      throw new NotFoundException('Produit introuvable.');
    }

    const [avis, stats] = await Promise.all([
      this.prisma.avis.findMany({
        where: { id_produit: produit.id_product, verified: true },
        orderBy: { created_at: 'desc' },
        take: 20,
      }),
      this.prisma.avis.aggregate({
        where: { id_produit: produit.id_product, verified: true },
        _avg: { stars: true },
        _count: true,
      }),
    ]);

    const packItems = produit.pack_contenu.map(
      (item): PackItem => ({
        produitId: item.id_produit,
        nom: item.composant.nom,
        quantite: item.quantite,
        prix: Number(item.composant.prix),
        imageUrl: item.composant.produit_image[0]?.url ?? null,
      }),
    );

    return {
      ...toPublicProduct(produit),
      packItems,
      packValeur: produit.is_pack ? packItems.reduce((sum, i) => sum + i.prix * i.quantite, 0) : null,
      categorie: produit.categorie?.nom ?? null,
      modesConservation: produit.mode_conservation,
      dureeConservationJours: produit.duree_conservation_jours,
      // Pack : en stock tant que chacun de ses produits l'est en quantité suffisante.
      enStock: produit.is_pack
        ? produit.pack_contenu.every((i) => i.composant.stock >= i.quantite)
        : produit.stock > 0,
      documents: produit.produit_document.map((d) => ({ nom: d.nom, url: d.url, type: d.type as ProduitDocumentType })),
      avis: avis.map((a) => ({
        id: a.id_avis,
        auteur: a.auteur,
        stars: a.stars,
        texte: a.texte,
        skinType: a.skin_type,
        reply: a.reply,
        createdAt: a.created_at.toISOString(),
      })),
      avisStats: stats._count ? { average: Number(stats._avg.stars ?? 0), count: stats._count } : null,
    };
  }

  async findByPartenaire(userId: string) {
    const contact = await this.prisma.partenaire_contact.findFirst({ where: { id_usr: userId } });
    if (!contact) return [];
    return this.prisma.produit.findMany({ where: { id_marque: contact.id_marque } });
  }

  async create(userId: string, dto: CreateProduitDto) {
    const contact = await this.prisma.partenaire_contact.findFirstOrThrow({ where: { id_usr: userId } });
    return this.prisma.produit.create({
      data: {
        id_product: randomUUID(),
        id_marque: contact.id_marque,
        id_categori: dto.categorieId,
        nom: dto.nom,
        description: dto.description,
        ingredients: dto.ingredients ?? [],
        prix: dto.prix,
        stock: dto.stock,
        status: 'DRAFT',
        mode_conservation: dto.modesConservation,
        comission_negocie: dto.comissionNegocie,
      },
    });
  }
}
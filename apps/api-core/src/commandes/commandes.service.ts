import { randomInt, randomUUID } from 'crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { ConsumerOrder } from '@withyou/shared-types';
import { normalizeDzPhone, validateWilaya } from '@withyou/shared-utils';
import { PrismaService } from '../prisma/prisma.service';
import { PUBLIC_PRODUCT_WHERE } from '../produits/produits.service';
import { UsersService } from '../users/users.service';
import { CreateCommandeDto } from './create-commande.dto';

/** Frais affichés sur /checkout tant que le tarif par transporteur n'est pas branché. */
export const FRAIS_LIVRAISON = 300;

/** Sans 0/O ni 1/I pour qu'un numéro se lise sans ambiguïté au téléphone. */
const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function randomCode(length = 8): string {
  return Array.from({ length }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');
}

@Injectable()
export class CommandesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) {}

  /** Commandes de la cliente connectée, de la plus récente à la plus ancienne (page /commandes). */
  async findMine(clerkUserId: string): Promise<ConsumerOrder[]> {
    const user = await this.users.findOrProvisionByClerkId(clerkUserId);
    if (!user) return [];
    const consumer = await this.users.findConsommateurByUserId(user.id_usr);
    if (!consumer) return [];

    const orders = await this.prisma.order.findMany({
      where: { id_consumer: consumer.id_consumer },
      orderBy: { created_at: 'desc' },
      include: {
        ligne_order: {
          include: {
            produit: { select: { nom: true, produit_image: { orderBy: { ordre: 'asc' }, take: 1, select: { url: true } } } },
          },
        },
      },
    });

    return orders.map((o) => ({
      id: o.id_order,
      numero: o.code_suivi,
      statut: o.status,
      createdAt: o.created_at?.toISOString() ?? null,
      total: Number(o.montant_total),
      lignes: o.ligne_order.map((l) => ({
        produitId: l.id_product,
        nom: l.produit.nom,
        imageUrl: l.produit.produit_image[0]?.url ?? null,
        prixUnitaire: Number(l.prix_unitaire),
        quantite: l.quantite,
      })),
    }));
  }

  /**
   * Commande glissée sur /checkout : enregistrée « confirmee ». Les prix et la
   * commission viennent de la base, jamais du navigateur.
   */
  async create(clerkUserId: string, dto: CreateCommandeDto): Promise<{ id: string; numero: string; total: number }> {
    const user = await this.users.findOrProvisionByClerkId(clerkUserId);
    if (!user) throw new NotFoundException('Impossible de retrouver votre compte.');
    await this.users.ensureConsumer(user.id_usr);
    const consumer = await this.users.findConsommateurByUserId(user.id_usr);
    if (!consumer) throw new NotFoundException('Impossible de retrouver votre profil cliente.');

    const telephone = normalizeDzPhone(dto.telephone);
    if (!telephone) throw new BadRequestException('Numéro de téléphone invalide.');
    if (!validateWilaya(dto.wilaya)) throw new BadRequestException('Wilaya inconnue.');
    const adresse = dto.adresse?.trim() ?? '';
    if (dto.typeLivraison === 'domicile' && !adresse) throw new BadRequestException("Indiquez l'adresse de livraison.");

    // Un même produit ajouté deux fois devient une seule ligne (unique_product_per_order).
    const quantites = new Map<string, number>();
    for (const l of dto.lignes) quantites.set(l.produitId, (quantites.get(l.produitId) ?? 0) + l.quantite);

    const produits = await this.prisma.produit.findMany({
      where: { ...PUBLIC_PRODUCT_WHERE, id_product: { in: [...quantites.keys()] } },
      select: { id_product: true, id_marque: true, prix: true, comission_negocie: true },
    });
    if (produits.length !== quantites.size) {
      throw new BadRequestException("Un produit de votre trousse n'est plus disponible.");
    }

    const lignes = produits.map((p) => {
      const quantite = quantites.get(p.id_product)!;
      const prix = Number(p.prix);
      const rate = Number(p.comission_negocie) / 100;
      return { id_product: p.id_product, quantite, prix, comission: Math.round(prix * rate) };
    });
    const sousTotal = lignes.reduce((sum, l) => sum + l.prix * l.quantite, 0);
    const commission = lignes.reduce((sum, l) => sum + l.comission * l.quantite, 0);
    const total = sousTotal + FRAIS_LIVRAISON;
    const marques = [...new Set(produits.map((p) => p.id_marque))];

    let numero = randomCode();
    while (await this.prisma.order.findFirst({ where: { code_suivi: numero }, select: { id_order: true } })) {
      numero = randomCode();
    }

    const id = randomUUID();
    const now = new Date();
    const [prenom, ...reste] = dto.nomComplet.trim().split(/\s+/);

    await this.prisma.$transaction([
      this.prisma.order.create({
        data: {
          id_order: id,
          id_consumer: consumer.id_consumer,
          status: 'confirmee',
          montant_total: total,
          montant_comission: commission,
          mode_paiement: dto.modePaiement,
          adresse_livraison: dto.typeLivraison === 'bureau' ? adresse || 'Bureau de livraison' : adresse,
          wilaya_livraison: dto.wilaya,
          commune_livraison: dto.commune.trim(),
          code_suivi: numero,
          created_at: now,
          updated_at: now,
          ligne_order: {
            create: lignes.map((l) => ({
              id_ligne: randomUUID(),
              id_product: l.id_product,
              quantite: l.quantite,
              prix_unitaire: l.prix,
              comission: l.comission,
            })),
          },
          paiement: {
            create: { id_paiement: randomUUID(), methode: dto.modePaiement, statut: 'en_attente', montant: total, created_at: now },
          },
          livraison: {
            create: {
              id_ship: randomUUID(),
              // Transporteur choisi ensuite depuis la console admin.
              prestatire: 'À attribuer',
              statut: 'en_attente',
              phone_correspendant: telephone,
              type_livraison: dto.typeLivraison,
              frais_livraison: FRAIS_LIVRAISON,
              created_at: now,
            },
          },
          brand_pickup: { create: marques.map((id_marque) => ({ id_marque })) },
        },
      }),
      // Complète le profil cliente sans écraser ce qu'elle a déjà renseigné.
      this.prisma.consomateur.update({
        where: { id_consumer: consumer.id_consumer },
        data: {
          prenom: consumer.prenom ?? prenom,
          nom: consumer.nom ?? (reste.join(' ') || null),
          phone: consumer.phone ?? telephone,
          wilaya: consumer.wilaya ?? dto.wilaya,
          commune: consumer.commune ?? dto.commune.trim(),
          adresse: consumer.adresse ?? (adresse || null),
        },
      }),
    ]);

    return { id, numero, total };
  }
}

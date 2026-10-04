import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AdminOffer, AdminSubscription, PartnerOffer, SubscriptionOffer, SubscriptionPeriod } from '@withyou/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { addPeriod, statusOf } from './subscription-rules';

type OfferRow = Prisma.offre_abonnementGetPayload<object>;

const toOffer = (o: OfferRow): SubscriptionOffer => ({
  id: o.id_offre,
  nom: o.nom,
  description: o.description,
  fonctionnalite: o.fonctionnalite,
  prixMensuel: Number(o.prix_mensuel),
  prixAnnuel: o.prix_annuel === null ? null : Number(o.prix_annuel),
  actif: o.actif,
});

export interface OfferInput {
  nom: string;
  description: string;
  fonctionnalite: 'ANALYTICS' | 'PROMOTION' | null;
  prixMensuel: number;
  prixAnnuel: number | null;
  actif: boolean;
}

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  private audit(adminId: string, action: string, targetType: string, id: string, after: unknown) {
    return this.prisma.audit_log.create({
      data: { actor_admin_id: adminId, action, target_type: targetType, target_id: id, after: after as Prisma.InputJsonValue },
    });
  }

  /* ------------------------------ Espace marque ----------------------------- */

  /** Offres proposées (actives), et celles auxquelles la marque est ou a été abonnée. */
  async partnerOffers(marqueId: string): Promise<PartnerOffer[]> {
    const [offers, subs] = await Promise.all([
      this.prisma.offre_abonnement.findMany({ orderBy: { nom: 'asc' } }),
      this.prisma.abonnement_marque.findMany({ where: { id_marque: marqueId }, orderBy: { demande_at: 'desc' } }),
    ]);
    return offers
      .map((o) => {
        const s = subs.find((x) => x.id_offre === o.id_offre);
        return {
          ...toOffer(o),
          subscription: s
            ? { id: s.id_abonnement, statut: statusOf(s), periode: s.periode, fin: s.fin?.toISOString() ?? null, message: s.message }
            : null,
        };
      })
      // Une offre retirée du catalogue reste visible si la marque y est abonnée.
      .filter((o) => o.actif || o.subscription?.statut === 'ACTIF');
  }

  async request(marqueId: string, offreId: string, periode: SubscriptionPeriod) {
    const offre = await this.prisma.offre_abonnement.findUnique({ where: { id_offre: offreId } });
    if (!offre || !offre.actif) throw new NotFoundException("Cette offre n'est pas disponible.");
    if (periode === 'ANNUEL' && offre.prix_annuel === null) throw new BadRequestException("Cette offre n'existe pas à l'année.");

    const now = new Date();
    const current = await this.prisma.abonnement_marque.findFirst({
      where: { id_marque: marqueId, id_offre: offreId, OR: [{ statut: 'DEMANDE' }, { statut: 'ACTIF', fin: { gt: now } }] },
    });
    if (current) {
      throw new ConflictException(current.statut === 'DEMANDE' ? 'Votre demande est déjà en cours.' : 'Vous êtes déjà abonnée à cette offre.');
    }
    const s = await this.prisma.abonnement_marque.create({
      data: {
        id_marque: marqueId,
        id_offre: offreId,
        periode,
        prix: periode === 'ANNUEL' ? offre.prix_annuel! : offre.prix_mensuel,
      },
    });
    return { id: s.id_abonnement };
  }

  async cancelRequest(marqueId: string, id: string) {
    const s = await this.prisma.abonnement_marque.findFirst({ where: { id_abonnement: id, id_marque: marqueId } });
    if (!s) throw new NotFoundException('Demande introuvable.');
    if (s.statut !== 'DEMANDE') throw new BadRequestException('Seule une demande en attente peut être annulée.');
    await this.prisma.abonnement_marque.update({ where: { id_abonnement: id }, data: { statut: 'ANNULE' } });
  }

  /* --------------------------------- Console -------------------------------- */

  async adminOffers(): Promise<AdminOffer[]> {
    const now = new Date();
    const offers = await this.prisma.offre_abonnement.findMany({
      orderBy: [{ actif: 'desc' }, { nom: 'asc' }],
      include: { _count: { select: { abonnements: { where: { statut: 'ACTIF', fin: { gt: now } } } } } },
    });
    return offers.map((o) => ({ ...toOffer(o), abonnesActifs: o._count.abonnements }));
  }

  private offerData(dto: OfferInput) {
    return {
      nom: dto.nom.trim(),
      description: dto.description.trim(),
      fonctionnalite: dto.fonctionnalite,
      prix_mensuel: dto.prixMensuel,
      prix_annuel: dto.prixAnnuel,
      actif: dto.actif,
    };
  }

  private async checkOffer(dto: OfferInput, exceptId?: string) {
    if (dto.actif && !(dto.prixMensuel > 0)) {
      throw new BadRequestException('Fixez un prix mensuel avant de proposer cette offre aux marques.');
    }
    // Une fonctionnalité n'est vendue que par une seule offre active, pour que le blocage reste clair.
    if (dto.actif && dto.fonctionnalite) {
      const other = await this.prisma.offre_abonnement.findFirst({
        where: { actif: true, fonctionnalite: dto.fonctionnalite, ...(exceptId ? { NOT: { id_offre: exceptId } } : {}) },
      });
      if (other) throw new ConflictException(`« ${other.nom} » débloque déjà cette fonctionnalité.`);
    }
  }

  async createOffer(adminId: string, dto: OfferInput) {
    await this.checkOffer(dto);
    try {
      const o = await this.prisma.offre_abonnement.create({ data: this.offerData(dto) });
      await this.audit(adminId, 'OFFER_CREATED', 'offre_abonnement', o.id_offre, dto);
      return { id: o.id_offre };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new ConflictException('Une offre porte déjà ce nom.');
      throw e;
    }
  }

  async updateOffer(adminId: string, id: string, dto: OfferInput) {
    if (!(await this.prisma.offre_abonnement.findUnique({ where: { id_offre: id } }))) throw new NotFoundException('Offre introuvable.');
    await this.checkOffer(dto, id);
    try {
      await this.prisma.offre_abonnement.update({ where: { id_offre: id }, data: this.offerData(dto) });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new ConflictException('Une offre porte déjà ce nom.');
      throw e;
    }
    await this.audit(adminId, 'OFFER_UPDATED', 'offre_abonnement', id, dto);
  }

  async adminSubscriptions(): Promise<AdminSubscription[]> {
    const rows = await this.prisma.abonnement_marque.findMany({
      orderBy: { demande_at: 'desc' },
      take: 300,
      include: {
        offre: true,
        admin: { select: { prenom: true, nom: true } },
        marque: { select: { nom_marque: true, draft: true, identity_marque: { select: { logo_url: true } } } },
      },
    });
    return rows.map((s) => {
      const draft = s.marque.draft as { name?: string; logoUrl?: string | null } | null;
      return {
        id: s.id_abonnement,
        marqueId: s.id_marque,
        marque: draft?.name?.trim() || s.marque.nom_marque,
        logoUrl: draft?.logoUrl ?? s.marque.identity_marque?.logo_url ?? null,
        offre: s.offre.nom,
        fonctionnalite: s.offre.fonctionnalite,
        periode: s.periode,
        prix: Number(s.prix),
        statut: statusOf(s),
        demandeAt: s.demande_at.toISOString(),
        debut: s.debut?.toISOString() ?? null,
        fin: s.fin?.toISOString() ?? null,
        activePar: s.admin ? `${s.admin.prenom} ${s.admin.nom.charAt(0)}.` : null,
        message: s.message,
      };
    });
  }

  /** Paiement reçu : l'abonnement démarre (aujourd'hui) pour une période. */
  async activate(adminId: string, id: string) {
    const s = await this.prisma.abonnement_marque.findUnique({ where: { id_abonnement: id } });
    if (!s) throw new NotFoundException('Abonnement introuvable.');
    if (s.statut !== 'DEMANDE') throw new BadRequestException("Cette demande n'est plus en attente.");
    const debut = new Date();
    await this.prisma.abonnement_marque.update({
      where: { id_abonnement: id },
      data: { statut: 'ACTIF', debut, fin: addPeriod(debut, s.periode), active_par: adminId },
    });
    await this.audit(adminId, 'SUBSCRIPTION_ACTIVATED', 'abonnement_marque', id, { periode: s.periode, prix: Number(s.prix) });
  }

  /** Nouveau paiement : la période repart de la fin actuelle (ou d'aujourd'hui si expiré). */
  async renew(adminId: string, id: string) {
    const s = await this.prisma.abonnement_marque.findUnique({ where: { id_abonnement: id } });
    if (!s) throw new NotFoundException('Abonnement introuvable.');
    if (s.statut !== 'ACTIF') throw new BadRequestException('Seul un abonnement activé peut être renouvelé.');
    const now = new Date();
    const from = s.fin && s.fin > now ? s.fin : now;
    const fin = addPeriod(from, s.periode);
    await this.prisma.abonnement_marque.update({
      where: { id_abonnement: id },
      data: { fin, ...(s.fin && s.fin <= now ? { debut: now } : {}), active_par: adminId },
    });
    await this.audit(adminId, 'SUBSCRIPTION_RENEWED', 'abonnement_marque', id, { fin: fin.toISOString() });
  }

  async refuse(adminId: string, id: string, message: string) {
    const s = await this.prisma.abonnement_marque.findUnique({ where: { id_abonnement: id } });
    if (!s) throw new NotFoundException('Abonnement introuvable.');
    if (s.statut !== 'DEMANDE') throw new BadRequestException("Cette demande n'est plus en attente.");
    await this.prisma.abonnement_marque.update({ where: { id_abonnement: id }, data: { statut: 'REFUSE', message: message.trim() } });
    await this.audit(adminId, 'SUBSCRIPTION_REFUSED', 'abonnement_marque', id, { message });
  }

  /** Arrêt immédiat (ex. impayé) : la fonctionnalité est bloquée tout de suite. */
  async stop(adminId: string, id: string, message: string) {
    const s = await this.prisma.abonnement_marque.findUnique({ where: { id_abonnement: id } });
    if (!s) throw new NotFoundException('Abonnement introuvable.');
    if (s.statut !== 'ACTIF') throw new BadRequestException("Cet abonnement n'est pas actif.");
    await this.prisma.abonnement_marque.update({ where: { id_abonnement: id }, data: { statut: 'ANNULE', fin: new Date(), message: message.trim() } });
    await this.audit(adminId, 'SUBSCRIPTION_STOPPED', 'abonnement_marque', id, { message });
  }
}

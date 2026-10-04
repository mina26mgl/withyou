import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AdminCarrier, AdminDeliveries, AdminIncidentType, AdminTicket } from '@withyou/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import type { CarrierDto, OpenTicketDto } from './admin.dto';

const DAY_MS = 86_400_000;
/** Sans réponse du transporteur au bout de ce délai, le ticket passe « à relancer ». */
const RELANCE_AFTER_MS = 24 * 3_600_000;

const adminName = (a: { prenom: string; nom: string } | null) => (a ? `${a.prenom} ${a.nom.charAt(0)}.`.trim() : '');
const key = (n: string) => n.trim().toLowerCase();

@Injectable()
export class AdminDeliveriesService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(): Promise<AdminDeliveries> {
    const [carriers, shipments, incidents, tickets] = await Promise.all([
      this.prisma.transporteur.findMany({ orderBy: [{ actif: 'desc' }, { nom: 'asc' }] }),
      this.prisma.livraison.findMany({
        select: { prestatire: true, date_expidition: true, date_livraison: true, id_order: true },
      }),
      this.prisma.order_incident.findMany({
        where: { resolved_at: null, type: { in: ['CARRIER', 'CLIENT'] } },
        orderBy: { opened_at: 'asc' },
        include: {
          order: {
            select: {
              code_suivi: true,
              wilaya_livraison: true,
              consomateur: { select: { prenom: true, nom: true } },
              livraison: { select: { prestatire: true }, take: 1 },
            },
          },
        },
      }),
      this.prisma.ticket_transporteur.findMany({
        orderBy: [{ statut: 'asc' }, { opened_at: 'desc' }],
        take: 100,
        include: {
          order: { select: { code_suivi: true } },
          ouvert_par: { select: { prenom: true, nom: true } },
          resolu_par: { select: { prenom: true, nom: true } },
        },
      }),
    ]);

    const emailOf = new Map(carriers.map((t) => [key(t.nom), t.email]));
    const now = Date.now();
    const ticketRows: AdminTicket[] = tickets.map((t) => {
      const lastPing = (t.derniere_relance_at ?? t.opened_at).getTime();
      return {
        id: t.id_ticket,
        orderId: t.id_order,
        orderCode: t.order.code_suivi,
        transporteur: t.transporteur,
        codeSuivi: t.code_suivi,
        motif: t.motif,
        message: t.message,
        statut: t.statut,
        openedAt: t.opened_at.toISOString(),
        openedBy: adminName(t.ouvert_par),
        reponse: t.reponse,
        reponseAt: t.reponse_at?.toISOString() ?? null,
        relances: t.relances,
        derniereRelanceAt: t.derniere_relance_at?.toISOString() ?? null,
        resolvedAt: t.resolved_at?.toISOString() ?? null,
        resolvedBy: t.resolu_par ? adminName(t.resolu_par) : null,
        aRelancer: t.statut === 'OUVERT' && now - lastPing > RELANCE_AFTER_MS,
        transporteurEmail: emailOf.get(key(t.transporteur)) ?? null,
      };
    });
    // Ticket non résolu par commande : l'anomalie propose de le voir plutôt que d'en rouvrir un.
    const openTicketByOrder = new Map(ticketRows.filter((t) => t.statut !== 'RESOLU').map((t) => [t.orderId, t.id]));

    const anomalies = incidents.map((i) => {
      const c = i.order.consomateur;
      return {
        id: i.id_incident,
        orderId: i.id_order,
        orderCode: i.order.code_suivi,
        client: c ? [c.prenom, c.nom ? `${c.nom.charAt(0)}.` : ''].filter(Boolean).join(' ') || null : null,
        wilaya: i.order.wilaya_livraison,
        carrier: i.order.livraison[0]?.prestatire ?? null,
        type: i.type as AdminIncidentType,
        reason: i.reason,
        openedAt: i.opened_at.toISOString(),
        ticketId: openTicketByOrder.get(i.id_order) ?? null,
      };
    });

    // Chiffres réels par transporteur, rapprochés par nom (livraison.prestatire).
    return {
      carriers: carriers.map((t): AdminCarrier => {
        const mine = shipments.filter((s) => key(s.prestatire) === key(t.nom));
        const delivered = mine.filter((s) => s.date_livraison && s.date_expidition);
        const avg = delivered.length
          ? delivered.reduce((a, s) => a + (s.date_livraison!.getTime() - s.date_expidition!.getTime()), 0) / delivered.length / DAY_MS
          : null;
        return {
          id: t.id_transporteur,
          nom: t.nom,
          wilayas: t.wilayas,
          coutColis: Number(t.cout_colis),
          delaiJours: t.delai_jours === null ? null : Number(t.delai_jours),
          telephone: t.telephone,
          email: t.email,
          actif: t.actif,
          stats: {
            enCours: mine.filter((s) => s.date_expidition && !s.date_livraison).length,
            livres: mine.filter((s) => s.date_livraison).length,
            delaiMoyenJours: avg === null ? null : Math.round(avg * 10) / 10,
            anomalies: anomalies.filter((a) => a.carrier && key(a.carrier) === key(t.nom)).length,
          },
        };
      }),
      anomalies,
      tickets: ticketRows,
    };
  }

  /* ----------------------------- Transporteurs ----------------------------- */

  private data(dto: CarrierDto) {
    return {
      nom: dto.nom.trim(),
      // Toutes les wilayas cochées = pas de restriction.
      wilayas: dto.wilayas.length >= 58 ? [] : [...new Set(dto.wilayas)],
      cout_colis: dto.coutColis,
      delai_jours: dto.delaiJours ?? null,
      telephone: dto.telephone?.trim() || null,
      email: dto.email?.trim() || null,
      ...(dto.actif === undefined ? {} : { actif: dto.actif }),
    };
  }

  private async audit(adminId: string, action: string, targetType: string, id: string, after: unknown) {
    await this.prisma.audit_log.create({
      data: { actor_admin_id: adminId, action, target_type: targetType, target_id: id, after: after as Prisma.InputJsonValue },
    });
  }

  async create(adminId: string, dto: CarrierDto) {
    try {
      const t = await this.prisma.transporteur.create({ data: this.data(dto) });
      await this.audit(adminId, 'CARRIER_CREATED', 'transporteur', t.id_transporteur, dto);
      return { id: t.id_transporteur };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`Un service de livraison « ${dto.nom.trim()} » existe déjà.`);
      }
      throw e;
    }
  }

  async update(adminId: string, id: string, dto: CarrierDto) {
    const existing = await this.prisma.transporteur.findUnique({ where: { id_transporteur: id } });
    if (!existing) throw new NotFoundException('Service de livraison introuvable.');
    try {
      await this.prisma.transporteur.update({ where: { id_transporteur: id }, data: this.data(dto) });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`Un service de livraison « ${dto.nom.trim()} » existe déjà.`);
      }
      throw e;
    }
    await this.audit(adminId, 'CARRIER_UPDATED', 'transporteur', id, dto);
  }

  /* -------------------------------- Tickets -------------------------------- */

  async openTicket(adminId: string, dto: OpenTicketDto): Promise<{ id: string }> {
    const order = await this.prisma.order.findUnique({
      where: { id_order: dto.orderId },
      include: {
        livraison: { orderBy: { created_at: 'desc' }, take: 1 },
        order_incident: {
          where: { resolved_at: null, type: { in: ['CARRIER', 'CLIENT'] } },
          orderBy: { opened_at: 'asc' },
          take: 1,
        },
        ticket_transporteur: { where: { statut: { not: 'RESOLU' } }, take: 1 },
      },
    });
    if (!order) throw new NotFoundException('Commande introuvable.');
    const ship = order.livraison[0];
    if (!ship) throw new BadRequestException("Cette commande n'a pas encore été confiée à un transporteur.");
    if (order.ticket_transporteur.length) throw new ConflictException('Un ticket est déjà ouvert pour cette commande.');

    const ticket = await this.prisma.ticket_transporteur.create({
      data: {
        id_order: order.id_order,
        id_incident: order.order_incident[0]?.id_incident ?? null,
        transporteur: ship.prestatire,
        code_suivi: ship.code_suivi,
        motif: dto.motif,
        message: dto.message.trim(),
        opened_by: adminId,
      },
    });
    await this.audit(adminId, 'TICKET_OPENED', 'ticket_transporteur', ticket.id_ticket, {
      orderId: dto.orderId,
      transporteur: ship.prestatire,
      motif: dto.motif,
    });
    return { id: ticket.id_ticket };
  }

  private async unresolvedTicket(id: string) {
    const t = await this.prisma.ticket_transporteur.findUnique({ where: { id_ticket: id } });
    if (!t) throw new NotFoundException('Ticket introuvable.');
    if (t.statut === 'RESOLU') throw new BadRequestException('Ce ticket est déjà résolu.');
    return t;
  }

  async relance(adminId: string, id: string) {
    const t = await this.unresolvedTicket(id);
    await this.prisma.ticket_transporteur.update({
      where: { id_ticket: id },
      data: { relances: { increment: 1 }, derniere_relance_at: new Date() },
    });
    await this.audit(adminId, 'TICKET_RELANCE', 'ticket_transporteur', id, { relance: t.relances + 1 });
  }

  async reply(adminId: string, id: string, reponse: string) {
    await this.unresolvedTicket(id);
    await this.prisma.ticket_transporteur.update({
      where: { id_ticket: id },
      data: { statut: 'REPONDU', reponse: reponse.trim(), reponse_at: new Date() },
    });
    await this.audit(adminId, 'TICKET_REPLY', 'ticket_transporteur', id, { reponse });
  }

  /** Colis reparti : le ticket est clos, et l'incident de la commande avec lui. */
  async resolve(adminId: string, id: string) {
    const t = await this.unresolvedTicket(id);
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.ticket_transporteur.update({
        where: { id_ticket: id },
        data: { statut: 'RESOLU', resolved_at: now, resolved_by: adminId },
      }),
      ...(t.id_incident
        ? [this.prisma.order_incident.updateMany({ where: { id_incident: t.id_incident, resolved_at: null }, data: { resolved_at: now } })]
        : []),
    ]);
    await this.audit(adminId, 'TICKET_RESOLVED', 'ticket_transporteur', id, { incidentClosed: !!t.id_incident });
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AdminIncidentType, AdminOrderDetail, AdminOrderRow } from '@withyou/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { orderStep } from './order-step';

const orderInclude = Prisma.validator<Prisma.orderDefaultArgs>()({
  include: {
    consomateur: { select: { prenom: true, nom: true, phone: true } },
    ligne_order: { include: { produit: { select: { nom: true, id_marque: true, marque: { select: { nom_marque: true, draft: true } } } } } },
    paiement: { orderBy: { created_at: 'desc' }, take: 1 },
    brand_pickup: { include: { marque: { select: { nom_marque: true, draft: true } } } },
    livraison: { orderBy: { created_at: 'desc' }, take: 1 },
    order_incident: { orderBy: { opened_at: 'asc' } },
    ticket_transporteur: { orderBy: { opened_at: 'asc' } },
  },
});
type OrderWithRelations = Prisma.orderGetPayload<typeof orderInclude>;

/** Nom affiché d'une marque : celui de son brouillon s'il existe (pas encore publié). */
const brandName = (m: { nom_marque: string; draft: Prisma.JsonValue }) =>
  (m.draft as { name?: string } | null)?.name?.trim() || m.nom_marque;

/** « Lina B. » : prénom et initiale, comme dans le prototype. */
const clientName = (c: { prenom: string | null; nom: string | null } | null) =>
  c ? [c.prenom, c.nom ? `${c.nom.charAt(0)}.` : ''].filter(Boolean).join(' ') || null : null;

@Injectable()
export class AdminOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  private toRow(o: OrderWithRelations): AdminOrderRow {
    const open = o.order_incident.find((i) => !i.resolved_at);
    const brands = [...new Set(o.ligne_order.map((l) => brandName(l.produit.marque)))];
    return {
      id: o.id_order,
      code: o.code_suivi,
      client: clientName(o.consomateur),
      wilaya: o.wilaya_livraison,
      brands,
      total: Number(o.montant_total),
      payment: o.mode_paiement,
      carrier: o.livraison[0]?.prestatire ?? null,
      step: orderStep({
        paymentMode: o.mode_paiement,
        paymentStatus: o.paiement[0]?.statut ?? null,
        pickups: o.brand_pickup,
        delivery: o.livraison[0] ?? null,
      }),
      block: open ? { type: open.type as AdminIncidentType, reason: open.reason } : null,
      createdAt: o.created_at?.toISOString() ?? null,
    };
  }

  async list(): Promise<AdminOrderRow[]> {
    const orders = await this.prisma.order.findMany({ ...orderInclude, orderBy: { created_at: 'desc' }, take: 200 });
    return orders.map((o) => this.toRow(o));
  }

  async detail(orderId: string): Promise<AdminOrderDetail> {
    const o = await this.prisma.order.findUnique({ where: { id_order: orderId }, ...orderInclude });
    if (!o) throw new NotFoundException('Commande introuvable.');
    const row = this.toRow(o);

    // Articles regroupés par marque, avec l'état de la collecte chez chacune.
    const byBrand = new Map<string, AdminOrderDetail['brandItems'][number]>();
    for (const l of o.ligne_order) {
      const id = l.produit.id_marque;
      const group = byBrand.get(id) ?? {
        brand: brandName(l.produit.marque),
        received: o.brand_pickup.find((p) => p.id_marque === id)?.received ?? false,
        items: [],
      };
      group.items.push({ nom: l.produit.nom, quantite: l.quantite, prix: Number(l.prix_unitaire) });
      byBrand.set(id, group);
    }

    const pay = o.paiement[0];
    const ship = o.livraison[0];
    const receivedAt = o.brand_pickup.map((p) => p.received_at).filter((d): d is Date => !!d);
    const lastReceived = receivedAt.length === o.brand_pickup.length && receivedAt.length ? new Date(Math.max(...receivedAt.map(Number))) : null;
    const iso = (d: Date | null | undefined) => d?.toISOString() ?? null;

    const timeline: AdminOrderDetail['timeline'] = [{ label: 'Commande confirmée', at: iso(o.created_at) }];
    if (pay?.date_paiement) timeline.push({ label: `Paiement confirmé (${pay.methode})`, at: iso(pay.date_paiement) });
    if (row.step >= 1) timeline.push({ label: 'Demande de collecte envoyée aux marques', at: iso(o.created_at) });
    if (lastReceived) timeline.push({ label: "Articles reçus à l'entrepôt withyou", at: iso(lastReceived) });
    if (ship?.date_expidition) timeline.push({ label: `Remis à ${ship.prestatire}`, at: iso(ship.date_expidition) });
    if (ship?.date_livraison) timeline.push({ label: 'Livrée à la cliente', at: iso(ship.date_livraison) });
    for (const i of o.order_incident) {
      timeline.push({ label: i.resolved_at ? `${i.reason} (résolu)` : i.reason, at: iso(i.opened_at), bad: !i.resolved_at });
    }
    for (const t of o.ticket_transporteur) {
      timeline.push({ label: `Ticket ouvert chez ${t.transporteur} : ${t.motif}`, at: iso(t.opened_at) });
      if (t.derniere_relance_at) timeline.push({ label: `Transporteur relancé (${t.relances} fois)`, at: iso(t.derniere_relance_at) });
      if (t.reponse_at) timeline.push({ label: `Réponse de ${t.transporteur} : ${t.reponse}`, at: iso(t.reponse_at) });
      if (t.resolved_at) timeline.push({ label: 'Ticket résolu', at: iso(t.resolved_at) });
    }
    timeline.sort((a, b) => (a.at ?? '').localeCompare(b.at ?? ''));

    const phone = o.consomateur?.phone;
    return {
      ...row,
      commune: o.commune_livraison,
      address: o.adresse_livraison,
      // Numéro masqué : la console n'a pas besoin du numéro complet pour suivre la commande.
      phone: phone ? `${phone.slice(0, 2)}•• •• •• ${phone.slice(-2)}` : null,
      paymentStatus: pay?.statut ?? null,
      brandItems: [...byBrand.values()],
      timeline,
    };
  }
}

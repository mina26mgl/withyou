import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AdminAccessMember, AdminMe, AdminProfilePage } from '@withyou/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import type { AdminInvitationDto, AdminMemberAccessDto, AdminProfileDto } from './admin-profile.dto';

const ROLE_LABEL: Record<string, string> = { OWNER: 'Direction', OPERATIONS: 'Opérations' };

/**
 * L'avatar par défaut de Clerk (initiales sur fond de couleur) est copié dans
 * user.pdpurl à l'inscription : ce n'est pas une photo choisie, la console
 * affiche alors ses propres initiales.
 */
export function profilePhoto(pdpurl: string | null): string | null {
  if (!pdpurl) return null;
  const m = /^https:\/\/img\.clerk\.com\/([A-Za-z0-9_-]+)/.exec(pdpurl);
  if (m) {
    try {
      const payload = JSON.parse(Buffer.from(m[1], 'base64url').toString('utf8')) as { type?: string };
      if (payload.type === 'default') return null;
    } catch {
      // Pas un avatar Clerk encodé : c'est une vraie image.
    }
  }
  return pdpurl;
}

/** Nom lisible de la cible d'une action, quand le journal l'a gardé. */
function targetName(after: Prisma.JsonValue | null): string | null {
  if (!after || typeof after !== 'object' || Array.isArray(after)) return null;
  const a = after as Record<string, unknown>;
  const v = a.name ?? a.nom ?? a.brand ?? a.email;
  return typeof v === 'string' ? v : null;
}

const fullName = (a: { prenom: string; nom: string }) => `${a.prenom} ${a.nom}`.trim();

/** Page Profil de la console : mon identité, ma photo, l'équipe et ses accès. */
@Injectable()
export class AdminProfileService {
  constructor(private readonly prisma: PrismaService) {}

  private audit(tx: Prisma.TransactionClient, adminId: string, action: string, targetType: string, targetId: string, after?: unknown) {
    return tx.audit_log.create({
      data: {
        actor_admin_id: adminId,
        action,
        target_type: targetType,
        target_id: targetId,
        after: after === undefined ? undefined : (after as Prisma.InputJsonValue),
      },
    });
  }

  async me(adminId: string): Promise<AdminMe> {
    const a = await this.prisma.admin.findUniqueOrThrow({ where: { id_admin: adminId }, include: { user: true } });
    return {
      id: a.id_admin,
      prenom: a.prenom,
      nom: a.nom,
      roleAdmin: a.role_admin,
      email: a.user.email,
      photoUrl: profilePhoto(a.user.pdpurl),
      telephone: a.telephone,
      poste: a.poste,
      since: a.created_at.toISOString(),
    };
  }

  async page(adminId: string): Promise<AdminProfilePage> {
    const [me, admins, lastActions, invitations, activity] = await Promise.all([
      this.me(adminId),
      this.prisma.admin.findMany({
        orderBy: [{ actif: 'desc' }, { prenom: 'asc' }, { nom: 'asc' }],
        include: { user: { select: { email: true, pdpurl: true } }, _count: { select: { marques_suivies: true } } },
      }),
      this.prisma.audit_log.groupBy({ by: ['actor_admin_id'], _max: { created_at: true } }),
      this.prisma.admin_invitation.findMany({
        where: { accepted_at: null, revoked_at: null },
        orderBy: { created_at: 'desc' },
        include: { inviteur: { select: { prenom: true, nom: true } } },
      }),
      this.prisma.audit_log.findMany({ where: { actor_admin_id: adminId }, orderBy: { created_at: 'desc' }, take: 12 }),
    ]);
    const last = new Map(lastActions.map((l) => [l.actor_admin_id, l._max.created_at]));

    const team: AdminAccessMember[] = admins.map((a) => ({
      id: a.id_admin,
      prenom: a.prenom,
      nom: a.nom,
      email: a.user.email,
      photoUrl: profilePhoto(a.user.pdpurl),
      roleAdmin: a.role_admin,
      poste: a.poste,
      actif: a.actif,
      since: a.created_at.toISOString(),
      lastActionAt: last.get(a.id_admin)?.toISOString() ?? null,
      brands: a._count.marques_suivies,
    }));

    return {
      me,
      team,
      invitations: invitations.map((i) => ({
        id: i.id_invitation,
        email: i.email,
        prenom: i.prenom,
        nom: i.nom,
        roleAdmin: i.role_admin,
        poste: i.poste,
        createdAt: i.created_at.toISOString(),
        invitedBy: fullName(i.inviteur),
      })),
      activity: activity.map((l) => ({
        id: l.id_log,
        action: l.action,
        targetType: l.target_type,
        targetName: targetName(l.after),
        createdAt: l.created_at.toISOString(),
      })),
    };
  }

  async update(adminId: string, dto: AdminProfileDto) {
    const clean = (v: string | null | undefined) => (v?.trim() ? v.trim() : null);
    const data = {
      prenom: dto.prenom.trim(),
      nom: dto.nom.trim(),
      telephone: clean(dto.telephone),
      poste: clean(dto.poste),
    };
    if (!data.prenom) throw new BadRequestException('Indiquez votre prénom.');
    await this.prisma.$transaction(async (tx) => {
      await tx.admin.update({ where: { id_admin: adminId }, data: { ...data, updated_at: new Date() } });
      await this.audit(tx, adminId, 'PROFILE_UPDATED', 'admin', adminId, { name: fullName(data) });
    });
  }

  async setPhoto(adminId: string, url: string | null) {
    const admin = await this.prisma.admin.findUniqueOrThrow({ where: { id_admin: adminId } });
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id_usr: admin.id_usr }, data: { pdpurl: url } });
      await this.audit(tx, adminId, url ? 'PROFILE_PHOTO_UPDATED' : 'PROFILE_PHOTO_REMOVED', 'admin', adminId);
    });
  }

  /** Seule la direction (OWNER, accès actif) donne, modifie ou retire des accès. */
  private async requireOwner(adminId: string) {
    const me = await this.prisma.admin.findUniqueOrThrow({ where: { id_admin: adminId } });
    if (me.role_admin !== 'OWNER' || !me.actif) {
      throw new ForbiddenException('Seule la direction peut gérer les accès à la console.');
    }
    return me;
  }

  async invite(adminId: string, dto: AdminInvitationDto): Promise<{ id: string; existingAccount: boolean }> {
    await this.requireOwner(adminId);
    const email = dto.email.trim().toLowerCase();

    const users = await this.prisma.user.findMany({
      where: { email: { equals: email, mode: 'insensitive' } },
      include: { admin: true },
    });
    const member = users.find((u) => u.admin)?.admin;
    if (member?.actif) throw new BadRequestException(`${fullName(member)} fait déjà partie de l'équipe.`);
    if (member) throw new BadRequestException(`L'accès de ${fullName(member)} a été retiré : réactivez-le dans la liste de l'équipe.`);

    const pending = await this.prisma.admin_invitation.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, accepted_at: null, revoked_at: null },
    });
    if (pending) throw new BadRequestException('Un accès est déjà en attente pour cette adresse.');

    const invitation = await this.prisma.$transaction(async (tx) => {
      const created = await tx.admin_invitation.create({
        data: {
          email,
          prenom: dto.prenom.trim(),
          nom: dto.nom.trim(),
          role_admin: dto.roleAdmin,
          poste: dto.poste?.trim() || null,
          invited_by: adminId,
        },
      });
      await this.audit(tx, adminId, 'ADMIN_INVITED', 'admin_invitation', created.id_invitation, {
        name: fullName(created),
        email,
        role: dto.roleAdmin,
      });
      return created;
    });
    return { id: invitation.id_invitation, existingAccount: users.length > 0 };
  }

  async revokeInvitation(adminId: string, invitationId: string) {
    await this.requireOwner(adminId);
    const inv = await this.prisma.admin_invitation.findUnique({ where: { id_invitation: invitationId } });
    if (!inv || inv.accepted_at || inv.revoked_at) throw new NotFoundException('Invitation introuvable ou déjà utilisée.');
    await this.prisma.$transaction(async (tx) => {
      await tx.admin_invitation.update({ where: { id_invitation: invitationId }, data: { revoked_at: new Date() } });
      await this.audit(tx, adminId, 'INVITATION_REVOKED', 'admin_invitation', invitationId, { name: fullName(inv), email: inv.email });
    });
  }

  /** Change le rôle d'un membre, retire ou rend son accès. */
  async updateMember(adminId: string, memberId: string, dto: AdminMemberAccessDto): Promise<{ brandsUnassigned: number }> {
    await this.requireOwner(adminId);
    if (memberId === adminId) {
      // Évite qu'un responsable se ferme la console (ou retire la dernière direction).
      throw new BadRequestException('Vous ne pouvez pas modifier votre propre accès. Demandez à un autre responsable.');
    }
    const member = await this.prisma.admin.findUnique({ where: { id_admin: memberId } });
    if (!member) throw new NotFoundException('Membre introuvable.');

    return this.prisma.$transaction(async (tx) => {
      let brandsUnassigned = 0;
      if (dto.roleAdmin && dto.roleAdmin !== member.role_admin) {
        await tx.admin.update({ where: { id_admin: memberId }, data: { role_admin: dto.roleAdmin, updated_at: new Date() } });
        await this.audit(tx, adminId, 'ADMIN_ROLE_CHANGED', 'admin', memberId, {
          name: fullName(member),
          from: ROLE_LABEL[member.role_admin] ?? member.role_admin,
          to: ROLE_LABEL[dto.roleAdmin],
        });
      }
      if (dto.actif !== undefined && dto.actif !== member.actif) {
        await tx.admin.update({
          where: { id_admin: memberId },
          data: { actif: dto.actif, desactive_at: dto.actif ? null : new Date(), updated_at: new Date() },
        });
        if (!dto.actif) {
          // Les marques qu'il suivait n'ont plus d'interlocuteur : à réassigner.
          brandsUnassigned = (await tx.marque.updateMany({ where: { id_charge_compte: memberId }, data: { id_charge_compte: null } })).count;
        }
        await this.audit(tx, adminId, dto.actif ? 'ADMIN_ACCESS_RESTORED' : 'ADMIN_ACCESS_REMOVED', 'admin', memberId, {
          name: fullName(member),
          ...(dto.actif ? {} : { brandsUnassigned }),
        });
      }
      return { brandsUnassigned };
    });
  }
}

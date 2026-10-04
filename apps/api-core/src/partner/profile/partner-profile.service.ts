import { randomBytes, randomUUID } from 'crypto';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createClerkClient } from '@clerk/backend';
import type { PartnerProfilePage, PartnerTeamMember } from '@withyou/shared-types';
import { PrismaService } from '../../prisma/prisma.service';
import type { PartnerInvitationDto, PartnerMemberRoleDto, PartnerProfileDto } from './partner-profile.dto';

/** Une invitation non utilisée expire au bout de 30 jours. */
const INVITATION_DAYS = 30;

type ContactWithUser = {
  id_partenaire: string;
  prenom: string | null;
  nom: string | null;
  telephone: string | null;
  titre_poste: string;
  role_partenaire: string;
  created_at: Date | null;
  user: { email: string; consomateur?: { prenom: string | null; nom: string | null }[] };
};

function toMember(c: ContactWithUser): PartnerTeamMember {
  const consumer = c.user.consomateur?.[0];
  return {
    id: c.id_partenaire,
    prenom: c.prenom ?? consumer?.prenom ?? null,
    nom: c.nom ?? consumer?.nom ?? null,
    email: c.user.email,
    telephone: c.telephone,
    poste: c.titre_poste,
    role: c.role_partenaire,
    since: c.created_at?.toISOString() ?? null,
  };
}

const fullName = (m: { prenom: string | null; nom: string | null }, fallback: string) =>
  `${m.prenom ?? ''} ${m.nom ?? ''}`.trim() || fallback;

/**
 * Page « Mon profil » de l'espace marque : mes informations et l'équipe de la
 * marque. Le mot de passe et le changement d'adresse passent par Clerk côté
 * navigateur ; l'API ne fait que recopier l'adresse vérifiée.
 */
@Injectable()
export class PartnerProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async page(marqueId: string, partenaireId: string): Promise<PartnerProfilePage> {
    const [marque, contacts, invitations] = await Promise.all([
      this.prisma.marque.findUniqueOrThrow({ where: { id_marque: marqueId }, select: { nom_marque: true, draft: true } }),
      this.prisma.partenaire_contact.findMany({
        where: { id_marque: marqueId },
        orderBy: { created_at: 'asc' },
        include: { user: { select: { email: true, consomateur: { select: { prenom: true, nom: true }, take: 1 } } } },
      }),
      this.prisma.invitation_partenaire.findMany({
        where: { id_marque: marqueId, status: 'PENDING', expires_at: { gt: new Date() } },
        orderBy: { created_at: 'desc' },
        include: { partenaire_contact: { include: { user: { select: { email: true } } } } },
      }),
    ]);
    const team = contacts.map(toMember);
    const me = team.find((m) => m.id === partenaireId);
    if (!me) throw new NotFoundException('Votre compte n’est plus rattaché à cette marque.');

    return {
      brandName: (marque.draft as { name?: string } | null)?.name?.trim() || marque.nom_marque,
      me,
      team,
      invitations: invitations.map((i) => ({
        id: i.id_invitation,
        email: i.email,
        prenom: i.prenom,
        nom: i.nom,
        poste: i.titre_poste,
        role: i.role_partenaire,
        createdAt: i.created_at.toISOString(),
        expiresAt: i.expires_at.toISOString(),
        invitedBy: fullName(i.partenaire_contact, i.partenaire_contact.user.email),
      })),
    };
  }

  async update(partenaireId: string, dto: PartnerProfileDto) {
    await this.prisma.partenaire_contact.update({
      where: { id_partenaire: partenaireId },
      data: {
        prenom: dto.prenom.trim(),
        nom: dto.nom.trim() || null,
        telephone: dto.telephone?.trim() || null,
        titre_poste: dto.poste.trim(),
        updated_at: new Date(),
      },
    });
  }

  /**
   * Après un changement d'adresse fait dans Clerk (vérifiée par code), recopie
   * l'adresse principale. Lue chez Clerk, jamais envoyée par le navigateur.
   */
  async syncEmail(clerkUserId: string): Promise<{ email: string }> {
    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
    const u = await clerk.users.getUser(clerkUserId);
    const primary = u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId);
    if (!primary || primary.verification?.status !== 'verified') {
      throw new BadRequestException('La nouvelle adresse n’est pas encore vérifiée.');
    }
    await this.prisma.user.updateMany({ where: { clerk_id: clerkUserId }, data: { email: primary.emailAddress } });
    return { email: primary.emailAddress };
  }

  /** Seul un responsable de la marque gère l'équipe. */
  private async requireOwner(partenaireId: string) {
    const me = await this.prisma.partenaire_contact.findUniqueOrThrow({ where: { id_partenaire: partenaireId } });
    if (me.role_partenaire !== 'OWNER') throw new ForbiddenException('Seul un responsable de la marque peut gérer l’équipe.');
    return me;
  }

  async invite(marqueId: string, partenaireId: string, dto: PartnerInvitationDto): Promise<{ id: string; existingAccount: boolean }> {
    await this.requireOwner(partenaireId);
    const email = dto.email.trim().toLowerCase();

    const users = await this.prisma.user.findMany({
      where: { email: { equals: email, mode: 'insensitive' } },
      include: { partenaire_contact: { include: { marque: { select: { nom_marque: true } } } } },
    });
    const contact = users.flatMap((u) => u.partenaire_contact)[0];
    if (contact?.id_marque === marqueId) throw new BadRequestException('Cette personne fait déjà partie de votre équipe.');
    if (contact) throw new BadRequestException('Cette adresse est déjà rattachée à une autre marque sur withyou.');

    const pending = await this.prisma.invitation_partenaire.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, status: 'PENDING', expires_at: { gt: new Date() } },
    });
    if (pending) throw new BadRequestException('Une invitation est déjà en attente pour cette adresse.');

    const now = new Date();
    const invitation = await this.prisma.invitation_partenaire.create({
      data: {
        id_invitation: randomUUID(),
        id_marque: marqueId,
        email,
        prenom: dto.prenom.trim(),
        nom: dto.nom.trim() || null,
        titre_poste: dto.poste?.trim() || null,
        role_partenaire: dto.role,
        // Pas de lien à cliquer (l'accès s'ouvre à la connexion avec l'adresse) ;
        // la colonne est obligatoire et unique.
        token: randomBytes(24).toString('hex'),
        status: 'PENDING',
        invited_by: partenaireId,
        created_at: now,
        expires_at: new Date(now.getTime() + INVITATION_DAYS * 86_400_000),
      },
    });
    return { id: invitation.id_invitation, existingAccount: users.length > 0 };
  }

  async revokeInvitation(marqueId: string, partenaireId: string, invitationId: string) {
    await this.requireOwner(partenaireId);
    const res = await this.prisma.invitation_partenaire.updateMany({
      where: { id_invitation: invitationId, id_marque: marqueId, status: 'PENDING' },
      data: { status: 'REVOKED' },
    });
    if (!res.count) throw new NotFoundException('Invitation introuvable ou déjà utilisée.');
  }

  private async otherMember(marqueId: string, partenaireId: string, memberId: string) {
    await this.requireOwner(partenaireId);
    if (memberId === partenaireId) {
      throw new BadRequestException('Vous ne pouvez pas modifier votre propre accès. Demandez à un autre responsable.');
    }
    const member = await this.prisma.partenaire_contact.findFirst({ where: { id_partenaire: memberId, id_marque: marqueId } });
    if (!member) throw new NotFoundException('Membre introuvable.');
    return member;
  }

  async setRole(marqueId: string, partenaireId: string, memberId: string, dto: PartnerMemberRoleDto) {
    await this.otherMember(marqueId, partenaireId, memberId);
    await this.prisma.partenaire_contact.update({ where: { id_partenaire: memberId }, data: { role_partenaire: dto.role, updated_at: new Date() } });
  }

  /** Retire un membre : il n'a plus accès à l'espace marque (son compte withyou reste). */
  async remove(marqueId: string, partenaireId: string, memberId: string) {
    await this.otherMember(marqueId, partenaireId, memberId);
    await this.prisma.$transaction([
      // Ses invitations restent visibles, au nom de la personne qui le retire.
      this.prisma.invitation_partenaire.updateMany({ where: { invited_by: memberId }, data: { invited_by: partenaireId } }),
      this.prisma.partenaire_contact.delete({ where: { id_partenaire: memberId } }),
    ]);
  }
}

import { randomUUID } from 'crypto';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createClerkClient } from '@clerk/backend';
import { normalizeDzPhone } from '@withyou/shared-utils';
import { PrismaService } from '../prisma/prisma.service';
import { PUBLIC_PRODUCT_WHERE } from '../produits/produits.service';
import { UpdateOnboardingDto } from './onboarding.dto';

export type AccountType = 'consumer' | 'partner';

/** Âges acceptés pour la date de naissance de l'onboarding. */
const MIN_AGE = 13;
const MAX_AGE = 100;

/** « AAAA-MM-JJ » → date (UTC) ; refuse une date inexistante (31 février) ou un âge hors limites. */
export function parseBirthDate(value: string, today = new Date()): Date {
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    throw new BadRequestException('Date de naissance invalide.');
  }
  let age = today.getUTCFullYear() - y;
  if (today.getUTCMonth() < m - 1 || (today.getUTCMonth() === m - 1 && today.getUTCDate() < d)) age -= 1;
  if (age < MIN_AGE || age > MAX_AGE) throw new BadRequestException('Date de naissance invalide.');
  return date;
}

/** What we need from a Clerk user to create the local rows, whatever the source. */
export interface ClerkProfile {
  clerkId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  imageUrl: string | null;
  /** Clerk `unsafeMetadata`, set by the register page. Client-writable: never trusted for access. */
  unsafeMetadata: Record<string, unknown> | null | undefined;
}

/**
 * The register page stores the chosen account type in Clerk `unsafeMetadata`.
 * Anything other than an explicit partner request falls back to consumer.
 * That is safe even though the client can write this value: choosing
 * "partner" only files a request, it grants no partner access by itself.
 */
export function readSignupChoice(meta: ClerkProfile['unsafeMetadata']): {
  accountType: AccountType;
  nomMarque: string;
  /** Numéro saisi à l'inscription, s'il est valide (forme « 0550123456 »). */
  telephone: string | null;
} {
  const accountType: AccountType = meta?.accountType === 'partner' ? 'partner' : 'consumer';
  const raw = typeof meta?.nomMarque === 'string' ? meta.nomMarque.trim().slice(0, 120) : '';
  const telephone = typeof meta?.telephone === 'string' ? normalizeDzPhone(meta.telephone) : null;
  return { accountType, nomMarque: raw || 'Non renseigné', telephone };
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  findById(idUsr: string) {
    return this.prisma.user.findUnique({ where: { id_usr: idUsr } });
  }

  findByClerkId(clerkId: string) {
    return this.prisma.user.findFirst({ where: { clerk_id: clerkId } });
  }

  findConsommateurByUserId(idUsr: string) {
    return this.prisma.consomateur.findFirst({ where: { id_usr: idUsr } });
  }

  /** Favoris de la cliente, du plus récent au plus ancien (identifiants produit). */
  async listFavoris(idConsumer: string): Promise<string[]> {
    const rows = await this.prisma.wishlist.findMany({
      where: { id_consumer: idConsumer },
      orderBy: { created_at: 'desc' },
      select: { id_produit: true },
    });
    return rows.map((r) => r.id_produit);
  }

  /** Ajoute un produit en ligne aux favoris ; sans effet s'il y est déjà. */
  async addFavori(idConsumer: string, idProduit: string): Promise<void> {
    const produit = await this.prisma.produit.findFirst({
      where: { ...PUBLIC_PRODUCT_WHERE, id_product: idProduit },
      select: { id_product: true },
    });
    if (!produit) throw new NotFoundException('Produit introuvable.');
    await this.prisma.wishlist.upsert({
      where: { id_consumer_id_produit: { id_consumer: idConsumer, id_produit: idProduit } },
      create: { id_consumer: idConsumer, id_produit: idProduit },
      update: {},
    });
  }

  async removeFavori(idConsumer: string, idProduit: string): Promise<void> {
    await this.prisma.wishlist.deleteMany({ where: { id_consumer: idConsumer, id_produit: idProduit } });
  }

  /** Nombre de commandes passées par la cliente (titre « The Renewer » / « The Regular » du profil). */
  countOrders(idConsumer: string) {
    return this.prisma.order.count({ where: { id_consumer: idConsumer } });
  }

  findPartenaireByUserId(idUsr: string) {
    return this.prisma.partenaire_contact.findFirst({ where: { id_usr: idUsr } });
  }

  findDemandePartenaireByUserId(idUsr: string) {
    return this.prisma.demande_partenaire.findUnique({ where: { id_usr: idUsr } });
  }

  /**
   * Creates the local rows for a new Clerk user, depending on the account type
   * chosen at sign-up:
   * - consumer → user (role CONSUMER) + consomateur
   * - partner  → user (role PARTNER) + demande_partenaire (PENDING). No
   *   partenaire_contact yet: that is created when a withyou collaborator
   *   validates the request, so PartnerGuard keeps the account out until then.
   * Idempotent: returns the existing user if the webhook and the on-the-fly
   * sync race each other.
   */
  async provisionFromClerk(profile: ClerkProfile) {
    const existing = await this.findByClerkId(profile.clerkId);
    if (existing) return existing;

    const { accountType, nomMarque, telephone } = readSignupChoice(profile.unsafeMetadata);
    const idUsr = randomUUID();

    const createUser = this.prisma.user.create({
      data: {
        id_usr: idUsr,
        clerk_id: profile.clerkId,
        email: profile.email,
        username: profile.username,
        pdpurl: profile.imageUrl,
        role: accountType === 'partner' ? 'PARTNER' : 'CONSUMER',
        created_at: new Date(),
      },
    });

    const createProfile =
      accountType === 'partner'
        ? this.prisma.demande_partenaire.create({
            data: { id_usr: idUsr, nom_marque: nomMarque, prenom: profile.firstName, nom: profile.lastName, telephone },
          })
        : this.prisma.consomateur.create({
            data: {
              id_consumer: randomUUID(),
              id_usr: idUsr,
              nom: profile.lastName,
              prenom: profile.firstName,
              phone: telephone,
            },
          });

    try {
      await this.prisma.$transaction([createUser, createProfile]);
    } catch (err) {
      // The webhook (or the other path) may have created it a moment ago — use that row.
      const raced = await this.findByClerkId(profile.clerkId);
      if (raced) return raced;
      throw err;
    }

    this.logger.log(
      accountType === 'partner'
        ? `Demande partenaire créée (en attente de validation): clerk_id=${profile.clerkId}, marque="${nomMarque}"`
        : `Consommateur créé depuis Clerk: clerk_id=${profile.clerkId} -> id_usr=${idUsr}`,
    );
    return this.findByClerkId(profile.clerkId);
  }

  /**
   * Accès à la console donné par un responsable withyou (table admin_invitation) :
   * à la première connexion avec l'adresse invitée, crée la ligne admin et passe
   * le compte au rôle ADMIN. Les lignes consommatrice ou partenaire éventuelles
   * sont gardées. L'adresse vient de Clerk, qui l'a vérifiée.
   */
  async acceptAdminInvitation<U extends { id_usr: string; email: string; role: string }>(user: U): Promise<U> {
    if (user.role === 'ADMIN') return user;
    const invitation = await this.prisma.admin_invitation.findFirst({
      where: { email: { equals: user.email.trim(), mode: 'insensitive' }, accepted_at: null, revoked_at: null },
      orderBy: { created_at: 'desc' },
    });
    if (!invitation) return user;
    const existing = await this.prisma.admin.findUnique({ where: { id_usr: user.id_usr } });

    await this.prisma.$transaction([
      existing
        ? this.prisma.admin.update({
            where: { id_admin: existing.id_admin },
            data: { actif: true, desactive_at: null, role_admin: invitation.role_admin, updated_at: new Date() },
          })
        : this.prisma.admin.create({
            data: {
              id_admin: randomUUID(),
              id_usr: user.id_usr,
              prenom: invitation.prenom,
              nom: invitation.nom,
              poste: invitation.poste,
              role_admin: invitation.role_admin,
            },
          }),
      this.prisma.user.update({ where: { id_usr: user.id_usr }, data: { role: 'ADMIN' } }),
      this.prisma.admin_invitation.update({ where: { id_invitation: invitation.id_invitation }, data: { accepted_at: new Date() } }),
    ]);
    this.logger.log(`Invitation console acceptée: ${user.email} (${invitation.role_admin})`);
    return { ...user, role: 'ADMIN' };
  }

  /**
   * Passage de l'espace marque (ou de la console) vers l'app cliente : crée le
   * profil cliente s'il n'existe pas encore, avec le nom connu côté marque ou
   * admin. Idempotent.
   */
  async ensureConsumer(idUsr: string): Promise<{ onboardingDone: boolean }> {
    const consumer = await this.findOrCreateConsumer(idUsr);
    return { onboardingDone: !!consumer.onboarding_done };
  }

  private async findOrCreateConsumer(idUsr: string) {
    const existing = await this.prisma.consomateur.findFirst({ where: { id_usr: idUsr } });
    if (existing) return existing;

    const [contact, admin] = await Promise.all([
      this.prisma.partenaire_contact.findFirst({ where: { id_usr: idUsr } }),
      this.prisma.admin.findUnique({ where: { id_usr: idUsr } }),
    ]);
    const created = await this.prisma.consomateur.create({
      data: {
        id_consumer: randomUUID(),
        id_usr: idUsr,
        prenom: contact?.prenom ?? admin?.prenom ?? null,
        nom: contact?.nom ?? admin?.nom ?? null,
        updated_at: new Date(),
      },
    });
    this.logger.log(`Profil cliente créé depuis l'espace pro: id_usr=${idUsr}`);
    return created;
  }

  /**
   * Enregistre une étape de l'onboarding cliente (nom, quiz de peau). Le profil
   * cliente est créé au besoin : un compte marque ou admin passe aussi par là.
   * Une fois terminé, l'onboarding le reste, même si la cliente refait le quiz.
   */
  async saveOnboarding(idUsr: string, dto: UpdateOnboardingDto) {
    const birthDate = dto.dateNaissance ? parseBirthDate(dto.dateNaissance) : undefined;
    if (dto.preoccupations?.includes('rien') && dto.preoccupations.length > 1) {
      throw new BadRequestException('« Rien de particulier » se choisit seul.');
    }
    const consumer = await this.findOrCreateConsumer(idUsr);
    const [prenom, ...rest] = dto.nomComplet?.trim().split(/\s+/) ?? [];
    const now = new Date();
    return this.prisma.consomateur.update({
      where: { id_consumer: consumer.id_consumer },
      data: {
        ...(prenom ? { prenom, nom: rest.join(' ') || null } : {}),
        ...(dto.genre ? { gender: dto.genre } : {}),
        ...(birthDate ? { birth_date: birthDate } : {}),
        ...(dto.typePeau ? { type_peau: dto.typePeau } : {}),
        ...(dto.preoccupations ? { preoccupations: dto.preoccupations } : {}),
        ...(dto.routineActuelle ? { routine_actuelle: dto.routineActuelle } : {}),
        ...(dto.precautions ? { precautions: dto.precautions } : {}),
        ...(dto.sensibilite !== undefined ? { sensibilite: dto.sensibilite } : {}),
        ...(dto.termine && !consumer.onboarding_done ? { onboarding_done: true, onboarding_done_at: now } : {}),
        updated_at: now,
      },
    });
  }

  /** Photo de profil choisie pendant l'onboarding (ou plus tard depuis le profil). */
  setProfilePhoto(idUsr: string, url: string) {
    return this.prisma.user.update({ where: { id_usr: idUsr }, data: { pdpurl: url } });
  }

  /**
   * Invitation dans l'équipe d'une marque (table invitation_partenaire) : à la
   * première connexion avec l'adresse invitée, crée le partenaire_contact qui
   * ouvre l'espace marque. Une demande « nouvelle marque » faite par erreur à
   * l'inscription est alors retirée. L'adresse vient de Clerk, qui l'a vérifiée.
   */
  async acceptPartnerInvitation<U extends { id_usr: string; email: string; role: string }>(user: U): Promise<U> {
    const contact = await this.prisma.partenaire_contact.findFirst({ where: { id_usr: user.id_usr } });
    if (contact) return user;
    const invitation = await this.prisma.invitation_partenaire.findFirst({
      where: { email: { equals: user.email.trim(), mode: 'insensitive' }, status: 'PENDING', expires_at: { gt: new Date() } },
      orderBy: { created_at: 'desc' },
    });
    if (!invitation) return user;

    const consumer = await this.prisma.consomateur.findFirst({ where: { id_usr: user.id_usr } });
    const role = user.role === 'CONSUMER' ? 'PARTNER' : user.role;
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.partenaire_contact.create({
        data: {
          id_partenaire: randomUUID(),
          id_usr: user.id_usr,
          id_marque: invitation.id_marque,
          role_partenaire: invitation.role_partenaire,
          titre_poste: invitation.titre_poste?.trim() || 'Membre de l\'équipe',
          prenom: invitation.prenom ?? consumer?.prenom ?? null,
          nom: invitation.nom ?? consumer?.nom ?? null,
          created_at: now,
          updated_at: now,
        },
      }),
      this.prisma.invitation_partenaire.update({
        where: { id_invitation: invitation.id_invitation },
        data: { status: 'ACCEPTED', accepted_at: now },
      }),
      this.prisma.demande_partenaire.deleteMany({ where: { id_usr: user.id_usr, status: 'PENDING' } }),
      this.prisma.user.update({ where: { id_usr: user.id_usr }, data: { role } }),
    ]);
    this.logger.log(`Invitation équipe marque acceptée: ${user.email} -> marque ${invitation.id_marque}`);
    return { ...user, role };
  }

  /**
   * Returns the local user for a Clerk id, creating it from Clerk on the fly
   * when the `user.created` webhook has not reached us (local dev has no public
   * URL, and webhooks can lag or fail in production). Same rows the webhook
   * would create.
   */
  async findOrProvisionByClerkId(clerkId: string) {
    const existing = await this.findByClerkId(clerkId);
    if (existing) return existing;

    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
    const user = await clerk.users.getUser(clerkId);
    const email =
      user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress ??
      user.emailAddresses[0]?.emailAddress;
    if (!email) return null;

    return this.provisionFromClerk({
      clerkId,
      email,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      username: user.username ?? null,
      // Sans photo, Clerk fournit un avatar générique : ce n'est pas une photo de profil.
      imageUrl: user.hasImage ? (user.imageUrl ?? null) : null,
      unsafeMetadata: user.unsafeMetadata,
    });
  }
}

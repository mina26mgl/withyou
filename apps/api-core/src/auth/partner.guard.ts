import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ClerkAuthGuard, ClerkRequest } from './clerk-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

export interface PartnerRequest extends ClerkRequest {
  marqueId: string;
  partenaireId: string;
}

/**
 * Verifies the Clerk token, then resolves the caller's own marque via
 * partenaire_contact. Every partner route reads `req.marqueId` from here —
 * never from a client-supplied param — so a marque can only ever touch its
 * own brand page / products / uploads.
 */
@Injectable()
export class PartnerGuard implements CanActivate {
  constructor(
    private readonly clerkAuthGuard: ClerkAuthGuard,
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    await this.clerkAuthGuard.canActivate(context);

    const req = context.switchToHttp().getRequest<PartnerRequest>();
    const found = await this.users.findOrProvisionByClerkId(req.clerkUserId);
    if (!found) {
      throw new ForbiddenException('Impossible de retrouver votre compte.');
    }
    // Personne invitée par sa marque : son accès s'ouvre à la première connexion.
    const user = await this.users.acceptPartnerInvitation(found);

    const contact = await this.prisma.partenaire_contact.findFirst({ where: { id_usr: user.id_usr } });
    if (!contact) {
      const demande = await this.prisma.demande_partenaire.findUnique({ where: { id_usr: user.id_usr } });
      if (demande?.status === 'PENDING') {
        throw new ForbiddenException(
          "Votre demande de partenariat est en cours d'examen. Un collaborateur withyou doit la valider avant l'accès à votre espace marque.",
        );
      }
      if (demande?.status === 'REJECTED') {
        throw new ForbiddenException("Votre demande de partenariat n'a pas été acceptée. Contactez withyou pour en savoir plus.");
      }
      throw new ForbiddenException(
        `Aucune marque partenaire n'est associée à ce compte (${user.email}). Demandez à withyou de rattacher votre compte à votre marque.`,
      );
    }

    req.marqueId = contact.id_marque;
    req.partenaireId = contact.id_partenaire;
    return true;
  }
}

import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ClerkAuthGuard, ClerkRequest } from './clerk-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

export interface AdminRequest extends ClerkRequest {
  adminId: string;
}

/**
 * Console admin : réservée aux collaborateurs withyou, c.-à-d. un compte au rôle
 * ADMIN qui a aussi sa ligne active dans la table admin. Le rôle seul ne suffit pas.
 * Un compte invité par un responsable (admin_invitation) reçoit son accès ici.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly clerkAuthGuard: ClerkAuthGuard,
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    await this.clerkAuthGuard.canActivate(context);

    const req = context.switchToHttp().getRequest<AdminRequest>();
    const found = await this.users.findByClerkId(req.clerkUserId);
    const user = found ? await this.users.acceptAdminInvitation(found) : null;
    const admin = user?.role === 'ADMIN' ? await this.prisma.admin.findUnique({ where: { id_usr: user.id_usr } }) : null;
    if (!admin) {
      throw new ForbiddenException('La console admin est réservée aux collaborateurs withyou.');
    }
    if (!admin.actif) {
      throw new ForbiddenException('Votre accès à la console a été retiré. Contactez un responsable withyou.');
    }

    req.adminId = admin.id_admin;
    return true;
  }
}

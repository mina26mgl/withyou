import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AdminGuard, AdminRequest } from './admin.guard';
import { ClerkAuthGuard } from './clerk-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

const ctx = (req: Partial<AdminRequest>) =>
  ({ switchToHttp: () => ({ getRequest: () => req }) }) as unknown as ExecutionContext;

describe('AdminGuard', () => {
  let prisma: { admin: { findUnique: jest.Mock } };
  let users: { findByClerkId: jest.Mock; acceptAdminInvitation: jest.Mock };
  let guard: AdminGuard;

  beforeEach(() => {
    prisma = { admin: { findUnique: jest.fn() } };
    users = { findByClerkId: jest.fn(), acceptAdminInvitation: jest.fn(async (u) => u) };
    guard = new AdminGuard(
      { canActivate: jest.fn().mockResolvedValue(true) } as unknown as ClerkAuthGuard,
      prisma as unknown as PrismaService,
      users as unknown as UsersService,
    );
  });

  it('lets a withyou collaborator in and exposes their admin id', async () => {
    users.findByClerkId.mockResolvedValue({ id_usr: 'u1', role: 'ADMIN' });
    prisma.admin.findUnique.mockResolvedValue({ id_admin: 'a1', actif: true });
    const req: Partial<AdminRequest> = { clerkUserId: 'c1' };
    await expect(guard.canActivate(ctx(req))).resolves.toBe(true);
    expect(req.adminId).toBe('a1');
  });

  it('refuses a partner or a consumer, without even looking for an admin row', async () => {
    for (const role of ['PARTNER', 'CONSUMER']) {
      users.findByClerkId.mockResolvedValue({ id_usr: 'u2', role });
      await expect(guard.canActivate(ctx({ clerkUserId: 'c2' }))).rejects.toBeInstanceOf(ForbiddenException);
    }
    expect(prisma.admin.findUnique).not.toHaveBeenCalled();
  });

  it('refuses the ADMIN role alone when there is no admin row', async () => {
    users.findByClerkId.mockResolvedValue({ id_usr: 'u3', role: 'ADMIN' });
    prisma.admin.findUnique.mockResolvedValue(null);
    await expect(guard.canActivate(ctx({ clerkUserId: 'c3' }))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refuses a collaborator whose access was withdrawn', async () => {
    users.findByClerkId.mockResolvedValue({ id_usr: 'u5', role: 'ADMIN' });
    prisma.admin.findUnique.mockResolvedValue({ id_admin: 'a5', actif: false });
    await expect(guard.canActivate(ctx({ clerkUserId: 'c5' }))).rejects.toThrow('retiré');
  });

  it('lets an invited consumer in once the invitation turns the account ADMIN', async () => {
    users.findByClerkId.mockResolvedValue({ id_usr: 'u6', role: 'CONSUMER', email: 'x@withyou.dz' });
    users.acceptAdminInvitation.mockResolvedValue({ id_usr: 'u6', role: 'ADMIN', email: 'x@withyou.dz' });
    prisma.admin.findUnique.mockResolvedValue({ id_admin: 'a6', actif: true });
    const req: Partial<AdminRequest> = { clerkUserId: 'c6' };
    await expect(guard.canActivate(ctx(req))).resolves.toBe(true);
    expect(req.adminId).toBe('a6');
  });

  it('refuses an unknown Clerk account', async () => {
    users.findByClerkId.mockResolvedValue(null);
    await expect(guard.canActivate(ctx({ clerkUserId: 'c4' }))).rejects.toBeInstanceOf(ForbiddenException);
  });
});

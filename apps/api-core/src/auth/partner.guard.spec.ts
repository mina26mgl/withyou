import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ClerkAuthGuard } from './clerk-auth.guard';
import { PartnerGuard, PartnerRequest } from './partner.guard';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

function contextFor(req: Partial<PartnerRequest>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => req,
    }),
  } as unknown as ExecutionContext;
}

describe('PartnerGuard', () => {
  let clerkAuthGuard: jest.Mocked<Pick<ClerkAuthGuard, 'canActivate'>>;
  let prisma: { partenaire_contact: { findFirst: jest.Mock }; demande_partenaire: { findUnique: jest.Mock } };
  let users: { findOrProvisionByClerkId: jest.Mock; acceptPartnerInvitation: jest.Mock };
  let guard: PartnerGuard;

  beforeEach(() => {
    clerkAuthGuard = { canActivate: jest.fn().mockResolvedValue(true) };
    prisma = {
      partenaire_contact: { findFirst: jest.fn() },
      demande_partenaire: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    users = { findOrProvisionByClerkId: jest.fn(), acceptPartnerInvitation: jest.fn(async (u) => u) };
    guard = new PartnerGuard(
      clerkAuthGuard as unknown as ClerkAuthGuard,
      prisma as unknown as PrismaService,
      users as unknown as UsersService,
    );
  });

  it('resolves marqueId from the authenticated user\'s own partenaire_contact', async () => {
    users.findOrProvisionByClerkId.mockResolvedValue({ id_usr: 'user-a' });
    prisma.partenaire_contact.findFirst.mockResolvedValue({
      id_marque: 'marque-a',
      id_partenaire: 'contact-a',
    });

    const req: Partial<PartnerRequest> = { clerkUserId: 'clerk-a' };
    const ctx = contextFor(req);

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.marqueId).toBe('marque-a');
    expect(req.partenaireId).toBe('contact-a');
    expect(prisma.partenaire_contact.findFirst).toHaveBeenCalledWith({ where: { id_usr: 'user-a' } });
  });

  it('ignores any client-supplied marqueId and only trusts the server-resolved one', async () => {
    users.findOrProvisionByClerkId.mockResolvedValue({ id_usr: 'user-a' });
    prisma.partenaire_contact.findFirst.mockResolvedValue({
      id_marque: 'marque-a',
      id_partenaire: 'contact-a',
    });

    // A malicious caller could try to smuggle a different marqueId onto the request
    // (e.g. via a spoofed body/param a controller naively merged in) — the guard
    // must overwrite it with the one resolved from the authenticated contact.
    const req: Partial<PartnerRequest> = { clerkUserId: 'clerk-a', marqueId: 'marque-b-spoofed' };
    await guard.canActivate(contextFor(req));

    expect(req.marqueId).toBe('marque-a');
  });

  it('throws ForbiddenException when the Clerk account cannot be resolved locally', async () => {
    users.findOrProvisionByClerkId.mockResolvedValue(null);
    const req: Partial<PartnerRequest> = { clerkUserId: 'clerk-unknown' };

    await expect(guard.canActivate(contextFor(req))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws ForbiddenException when the user has no partenaire_contact (not a partner)', async () => {
    users.findOrProvisionByClerkId.mockResolvedValue({ id_usr: 'user-consumer', email: 'c@x.dz' });
    prisma.partenaire_contact.findFirst.mockResolvedValue(null);
    const req: Partial<PartnerRequest> = { clerkUserId: 'clerk-consumer' };

    await expect(guard.canActivate(contextFor(req))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('keeps a partner whose sign-up request is still PENDING out, with an explicit message', async () => {
    // Choosing "partner" at sign-up only files a demande_partenaire: until a withyou
    // collaborator validates it there is no partenaire_contact, so no access.
    users.findOrProvisionByClerkId.mockResolvedValue({ id_usr: 'user-pending', email: 'p@x.dz' });
    prisma.partenaire_contact.findFirst.mockResolvedValue(null);
    prisma.demande_partenaire.findUnique.mockResolvedValue({ status: 'PENDING' });
    const req: Partial<PartnerRequest> = { clerkUserId: 'clerk-pending' };

    await expect(guard.canActivate(contextFor(req))).rejects.toThrow(/en cours d'examen/);
    expect(req.marqueId).toBeUndefined();
  });
});

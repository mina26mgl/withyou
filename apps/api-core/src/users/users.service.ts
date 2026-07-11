import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findConsommateurByUserId(userId: string) {
    return this.prisma.consommateur.findUnique({ where: { userId }, include: { skinProfile: true } });
  }
}

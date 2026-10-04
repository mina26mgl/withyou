import { Module } from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { StorageModule } from '../storage/storage.module';
import { UsersService } from '../users/users.service';
import { BrandRequestController } from './brand-request.controller';
import { BrandRequestService } from './brand-request.service';

@Module({
  imports: [StorageModule],
  controllers: [BrandRequestController],
  providers: [PrismaService, UsersService, ClerkAuthGuard, BrandRequestService],
})
export class BrandRequestModule {}

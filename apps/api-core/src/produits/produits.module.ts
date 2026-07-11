import { Module } from '@nestjs/common';
import { ProduitsController } from './produits.controller';
import { ProduitsService } from './produits.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [ProduitsController],
  providers: [ProduitsService, PrismaService],
  exports: [ProduitsService],
})
export class ProduitsModule {}

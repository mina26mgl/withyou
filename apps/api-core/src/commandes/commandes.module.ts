import { Module } from '@nestjs/common';
import { CommandesController } from './commandes.controller';
import { CommandesService } from './commandes.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [CommandesController],
  providers: [CommandesService, PrismaService],
  exports: [CommandesService],
})
export class CommandesModule {}

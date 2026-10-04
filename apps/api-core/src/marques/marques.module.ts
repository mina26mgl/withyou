import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MarquesController } from './marques.controller';
import { MarquesService } from './marques.service';

@Module({
  controllers: [MarquesController],
  providers: [MarquesService, PrismaService],
})
export class MarquesModule {}

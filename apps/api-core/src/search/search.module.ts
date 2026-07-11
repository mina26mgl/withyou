import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [SearchController],
  providers: [PrismaService],
})
export class SearchModule {}

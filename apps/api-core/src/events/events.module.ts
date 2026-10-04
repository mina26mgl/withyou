import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }])],
  controllers: [EventsController],
  providers: [EventsService, PrismaService],
})
export class EventsModule {}

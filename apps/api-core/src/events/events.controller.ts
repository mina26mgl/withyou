import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { CreateEventDto } from './create-event.dto';
import { EventsService } from './events.service';

@Controller('events')
@UseGuards(ThrottlerGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @HttpCode(204)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async record(@Body() dto: CreateEventDto): Promise<void> {
    await this.eventsService.record(dto);
  }
}

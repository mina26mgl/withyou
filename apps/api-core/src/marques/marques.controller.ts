import { Controller, Get, Param } from '@nestjs/common';
import { MarquesService } from './marques.service';

@Controller('marques')
export class MarquesController {
  constructor(private readonly marquesService: MarquesService) {}

  @Get()
  findPublished() {
    return this.marquesService.findPublished();
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.marquesService.findBySlug(slug);
  }
}

import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { PartnerGuard, PartnerRequest } from '../../auth/partner.guard';
import { CreateSalonTestDto } from './create-salon-test.dto';
import { SalonTestsService } from './salon-tests.service';

@UseGuards(PartnerGuard)
@Controller('partner/salon-tests')
export class SalonTestsController {
  constructor(private readonly salonTestsService: SalonTestsService) {}

  @Get()
  list(@Req() req: PartnerRequest) {
    return this.salonTestsService.list(req.marqueId);
  }

  @Post()
  create(@Req() req: PartnerRequest, @Body() dto: CreateSalonTestDto) {
    return this.salonTestsService.create(req.marqueId, dto);
  }
}

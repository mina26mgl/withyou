import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { PartnerGuard, PartnerRequest } from '../../auth/partner.guard';
import { HomeService } from './home.service';

@UseGuards(PartnerGuard)
@Controller('partner/home')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Get()
  get(@Req() req: PartnerRequest) {
    return this.homeService.get(req.marqueId, req.partenaireId);
  }
}

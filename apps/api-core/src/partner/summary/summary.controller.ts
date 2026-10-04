import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { PartnerGuard, PartnerRequest } from '../../auth/partner.guard';
import { SummaryService } from './summary.service';

@UseGuards(PartnerGuard)
@Controller('partner/summary')
export class SummaryController {
  constructor(private readonly summaryService: SummaryService) {}

  @Get()
  get(@Req() req: PartnerRequest) {
    return this.summaryService.get(req.marqueId, req.partenaireId);
  }
}

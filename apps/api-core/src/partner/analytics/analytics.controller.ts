import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { FeatureGuard, RequiresFeature } from '../../subscriptions/feature.guard';
import { PartnerGuard, PartnerRequest } from '../../auth/partner.guard';
import { AnalyticsService } from './analytics.service';

@UseGuards(PartnerGuard, FeatureGuard)
@RequiresFeature('ANALYTICS')
@Controller('partner/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get()
  get(@Req() req: PartnerRequest, @Query('period') period?: string) {
    return this.analyticsService.get(req.marqueId, this.analyticsService.parsePeriod(period));
  }
}

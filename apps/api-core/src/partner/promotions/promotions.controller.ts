import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { FeatureGuard, RequiresFeature } from '../../subscriptions/feature.guard';
import { PartnerGuard, PartnerRequest } from '../../auth/partner.guard';
import { CreatePromotionDto } from './create-promotion.dto';
import { PromotionsService } from './promotions.service';

@UseGuards(PartnerGuard, FeatureGuard)
@RequiresFeature('PROMOTION')
@Controller('partner/promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get()
  list(@Req() req: PartnerRequest) {
    return this.promotionsService.list(req.marqueId);
  }

  @Post()
  create(@Req() req: PartnerRequest, @Body() dto: CreatePromotionDto) {
    return this.promotionsService.create(req.marqueId, dto);
  }
}

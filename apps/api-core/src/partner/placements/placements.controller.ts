import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { FeatureGuard, RequiresFeature } from '../../subscriptions/feature.guard';
import { PartnerGuard, PartnerRequest } from '../../auth/partner.guard';
import { CreatePlacementDto } from './create-placement.dto';
import { PlacementsService } from './placements.service';

@UseGuards(PartnerGuard, FeatureGuard)
@RequiresFeature('PROMOTION')
@Controller('partner/placements')
export class PlacementsController {
  constructor(private readonly placementsService: PlacementsService) {}

  @Post()
  request(@Req() req: PartnerRequest, @Body() dto: CreatePlacementDto) {
    return this.placementsService.request(req.marqueId, dto);
  }
}

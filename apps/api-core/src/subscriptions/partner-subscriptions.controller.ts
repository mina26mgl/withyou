import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { PartnerGuard, PartnerRequest } from '../auth/partner.guard';
import { RequestSubscriptionDto } from './subscriptions.dto';
import { SubscriptionsService } from './subscriptions.service';

@UseGuards(PartnerGuard)
@Controller('partner/abonnements')
export class PartnerSubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get()
  list(@Req() req: PartnerRequest) {
    return this.subscriptions.partnerOffers(req.marqueId);
  }

  @Post()
  request(@Req() req: PartnerRequest, @Body() dto: RequestSubscriptionDto) {
    return this.subscriptions.request(req.marqueId, dto.offreId, dto.periode);
  }

  @Post(':id/annuler')
  cancel(@Req() req: PartnerRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.subscriptions.cancelRequest(req.marqueId, id);
  }
}

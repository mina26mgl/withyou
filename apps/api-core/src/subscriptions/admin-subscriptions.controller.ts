import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AdminGuard, AdminRequest } from '../auth/admin.guard';
import { OfferDto, SubscriptionMessageDto } from './subscriptions.dto';
import { SubscriptionsService } from './subscriptions.service';

@UseGuards(AdminGuard)
@Controller('admin')
export class AdminSubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get('offres')
  offers() {
    return this.subscriptions.adminOffers();
  }

  @Post('offres')
  createOffer(@Req() req: AdminRequest, @Body() dto: OfferDto) {
    return this.subscriptions.createOffer(req.adminId, { ...dto, fonctionnalite: dto.fonctionnalite ?? null, prixAnnuel: dto.prixAnnuel ?? null });
  }

  @Patch('offres/:id')
  updateOffer(@Req() req: AdminRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: OfferDto) {
    return this.subscriptions.updateOffer(req.adminId, id, {
      ...dto,
      fonctionnalite: dto.fonctionnalite ?? null,
      prixAnnuel: dto.prixAnnuel ?? null,
    });
  }

  @Get('abonnements')
  list() {
    return this.subscriptions.adminSubscriptions();
  }

  @Post('abonnements/:id/activer')
  activate(@Req() req: AdminRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.subscriptions.activate(req.adminId, id);
  }

  @Post('abonnements/:id/renouveler')
  renew(@Req() req: AdminRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.subscriptions.renew(req.adminId, id);
  }

  @Post('abonnements/:id/refuser')
  refuse(@Req() req: AdminRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: SubscriptionMessageDto) {
    return this.subscriptions.refuse(req.adminId, id, dto.message);
  }

  @Post('abonnements/:id/arreter')
  stop(@Req() req: AdminRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: SubscriptionMessageDto) {
    return this.subscriptions.stop(req.adminId, id, dto.message);
  }
}

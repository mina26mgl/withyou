import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { AdminGuard, AdminRequest } from '../auth/admin.guard';
import { BrandChecksDto, BrandLegalDto, CarrierDto, OpenTicketDto, ProductCommissionDto, RejectDto, TicketReplyDto, UpdateBrandDto } from './admin.dto';
import { AdminDeliveriesService } from './admin-deliveries.service';
import { AdminService } from './admin.service';
import { AdminOrdersService } from './admin-orders.service';
import { AdminAnalyticsService } from './admin-analytics.service';
import { AdminProfileService } from './admin-profile.service';

@UseGuards(AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly profile: AdminProfileService,
    private readonly orders: AdminOrdersService,
    private readonly deliveries: AdminDeliveriesService,
    private readonly analytics: AdminAnalyticsService,
  ) {}

  @Get('me')
  me(@Req() req: AdminRequest) {
    return this.profile.me(req.adminId);
  }

  @Get('analyses')
  analyses(@Query('period') period = '30') {
    return this.analytics.get(Number(period));
  }

  @Get('equipe')
  team() {
    return this.admin.team();
  }

  @Get('overview')
  overview() {
    return this.admin.overview();
  }

  @Get('validations')
  validations() {
    return this.admin.validations();
  }

  @Get('validations/page/:marqueId')
  pageReview(@Param('marqueId', ParseUUIDPipe) marqueId: string) {
    return this.admin.pageReview(marqueId);
  }

  @Post('validations/page/:marqueId/approve')
  approvePage(@Req() req: AdminRequest, @Param('marqueId', ParseUUIDPipe) marqueId: string) {
    return this.admin.approvePage(req.adminId, marqueId);
  }

  @Post('validations/page/:marqueId/reject')
  rejectPage(@Req() req: AdminRequest, @Param('marqueId', ParseUUIDPipe) marqueId: string, @Body() dto: RejectDto) {
    return this.admin.rejectPage(req.adminId, marqueId, dto.message);
  }

  @Post('validations/brand/:demandeId/approve')
  approveBrand(@Req() req: AdminRequest, @Param('demandeId', ParseUUIDPipe) demandeId: string) {
    return this.admin.approveBrandRequest(req.adminId, demandeId);
  }

  @Put('validations/brand/:demandeId/checks')
  brandChecks(@Req() req: AdminRequest, @Param('demandeId', ParseUUIDPipe) demandeId: string, @Body() dto: BrandChecksDto) {
    return this.admin.setBrandChecks(req.adminId, demandeId, dto.checks);
  }

  @Post('validations/brand/:demandeId/reject')
  rejectBrand(@Req() req: AdminRequest, @Param('demandeId', ParseUUIDPipe) demandeId: string, @Body() dto: RejectDto) {
    return this.admin.rejectBrandRequest(req.adminId, demandeId, dto.message);
  }

  @Get('validations/product/:produitId')
  productReview(@Param('produitId', ParseUUIDPipe) produitId: string) {
    return this.admin.productReview(produitId);
  }

  @Post('validations/product/:produitId/approve')
  approveProduct(@Req() req: AdminRequest, @Param('produitId', ParseUUIDPipe) produitId: string) {
    return this.admin.approveProduct(req.adminId, produitId);
  }

  @Post('validations/product/:produitId/reject')
  rejectProduct(@Req() req: AdminRequest, @Param('produitId', ParseUUIDPipe) produitId: string, @Body() dto: RejectDto) {
    return this.admin.rejectProduct(req.adminId, produitId, dto.message);
  }

  @Get('commandes')
  orderList() {
    return this.orders.list();
  }

  @Get('commandes/:id')
  orderDetail(@Param('id', ParseUUIDPipe) id: string) {
    return this.orders.detail(id);
  }

  @Get('livraisons')
  deliveryOverview() {
    return this.deliveries.overview();
  }

  @Post('transporteurs')
  createCarrier(@Req() req: AdminRequest, @Body() dto: CarrierDto) {
    return this.deliveries.create(req.adminId, dto);
  }

  @Patch('transporteurs/:id')
  updateCarrier(@Req() req: AdminRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CarrierDto) {
    return this.deliveries.update(req.adminId, id, dto);
  }

  @Post('tickets')
  openTicket(@Req() req: AdminRequest, @Body() dto: OpenTicketDto) {
    return this.deliveries.openTicket(req.adminId, dto);
  }

  @Post('tickets/:id/relance')
  relanceTicket(@Req() req: AdminRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.deliveries.relance(req.adminId, id);
  }

  @Post('tickets/:id/reponse')
  replyTicket(@Req() req: AdminRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: TicketReplyDto) {
    return this.deliveries.reply(req.adminId, id, dto.reponse);
  }

  @Post('tickets/:id/resoudre')
  resolveTicket(@Req() req: AdminRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.deliveries.resolve(req.adminId, id);
  }

  @Get('marques')
  brands() {
    return this.admin.brands();
  }

  @Get('marques/:id/produits')
  brandProducts(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.brandProducts(id);
  }

  @Patch('produits/:id/commission')
  setProductCommission(@Req() req: AdminRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ProductCommissionDto) {
    return this.admin.setProductCommission(req.adminId, id, dto.commission);
  }

  @Get('marques/:id/legal')
  brandLegal(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.brandLegal(id);
  }

  @Put('marques/:id/legal')
  saveBrandLegal(@Req() req: AdminRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: BrandLegalDto) {
    return this.admin.saveBrandLegal(req.adminId, id, dto);
  }

  @Patch('marques/:id')
  updateBrand(@Req() req: AdminRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBrandDto) {
    return this.admin.updateBrand(req.adminId, id, dto);
  }
}

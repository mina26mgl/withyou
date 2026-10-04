import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AdminGuard, AdminRequest } from '../auth/admin.guard';
import { SalonDto, SpecialistDto } from './admin-network.dto';
import { AdminNetworkService } from './admin-network.service';

@UseGuards(AdminGuard)
@Controller('admin')
export class AdminNetworkController {
  constructor(private readonly network: AdminNetworkService) {}

  @Get('salons')
  salons() {
    return this.network.salons();
  }

  @Post('salons')
  createSalon(@Req() req: AdminRequest, @Body() dto: SalonDto) {
    return this.network.createSalon(req.adminId, dto);
  }

  @Patch('salons/:id')
  updateSalon(@Req() req: AdminRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: SalonDto) {
    return this.network.updateSalon(req.adminId, id, dto);
  }

  @Get('specialistes')
  specialists() {
    return this.network.specialists();
  }

  @Post('specialistes')
  createSpecialist(@Req() req: AdminRequest, @Body() dto: SpecialistDto) {
    return this.network.createSpecialist(req.adminId, dto);
  }

  @Patch('specialistes/:id')
  updateSpecialist(@Req() req: AdminRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: SpecialistDto) {
    return this.network.updateSpecialist(req.adminId, id, dto);
  }
}

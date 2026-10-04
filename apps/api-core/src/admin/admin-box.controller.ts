import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { BoxDto, BoxItemDto } from './admin-box.dto';
import { IsIn } from 'class-validator';
import { AdminGuard, AdminRequest } from '../auth/admin.guard';
import { AdminBoxService } from './admin-box.service';

class DecideDto {
  @IsIn(['RETENUE', 'REFUSEE'])
  statut: 'RETENUE' | 'REFUSEE';
}

@UseGuards(AdminGuard)
@Controller('admin/box')
export class AdminBoxController {
  constructor(private readonly box: AdminBoxService) {}

  @Get()
  list() {
    return this.box.list();
  }

  @Post()
  create(@Req() req: AdminRequest, @Body() dto: BoxDto) {
    return this.box.createBox(req.adminId, dto);
  }

  /** Produits du catalogue qu'on peut mettre dans une box. */
  @Get('catalogue')
  catalogue() {
    return this.box.catalogue();
  }

  /** La box du moment (en préparation, assemblage le plus proche). */
  @Get('courante')
  async current() {
    const b = await this.box.current();
    return b ? this.box.detail(b.id_box) : null;
  }

  @Get(':id')
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.box.detail(id);
  }

  @Patch(':id')
  update(@Req() req: AdminRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: BoxDto) {
    return this.box.updateBox(req.adminId, id, dto);
  }

  @Post(':id/produits')
  addItem(@Req() req: AdminRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: BoxItemDto) {
    return this.box.addItem(req.adminId, id, dto);
  }

  @Patch('produits/:id')
  updateItem(@Req() req: AdminRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: BoxItemDto) {
    return this.box.updateItem(req.adminId, id, dto);
  }

  @Delete('produits/:id')
  removeItem(@Req() req: AdminRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.box.removeItem(req.adminId, id);
  }

  @Post('produits/:id/relance')
  relance(@Req() req: AdminRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.box.relance(req.adminId, id);
  }

  @Post('candidatures/:id')
  decide(@Req() req: AdminRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: DecideDto) {
    return this.box.decide(req.adminId, id, dto.statut);
  }
}

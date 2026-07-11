import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProduitsService } from './produits.service';
import { CreateProduitDto } from './dto/create-produit.dto';

@Controller('produits')
export class ProduitsController {
  constructor(private readonly produitsService: ProduitsService) {}

  @Get()
  findActive() {
    return this.produitsService.findActive();
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  findMine(@Req() req: { user: { userId: string } }) {
    return this.produitsService.findByPartenaire(req.user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.produitsService.findById(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Req() req: { user: { userId: string } }, @Body() dto: CreateProduitDto) {
    return this.produitsService.create(req.user.userId, dto);
  }
}

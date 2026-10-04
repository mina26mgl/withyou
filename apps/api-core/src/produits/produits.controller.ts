import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProduitsService } from './produits.service';
import { CreateProduitDto } from './dto/create-produit.dto';

@Controller('produits')
export class ProduitsController {
  constructor(private readonly produitsService: ProduitsService) {}

  /** Catalogue client : uniquement les produits en ligne des marques publiées. */
  @Get()
  findPublic() {
    return this.produitsService.findPublic();
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  findMine(@Req() req: { user: { userId: string } }) {
    return this.produitsService.findByPartenaire(req.user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.produitsService.findPublicById(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Req() req: { user: { userId: string } }, @Body() dto: CreateProduitDto) {
    return this.produitsService.create(req.user.userId, dto);
  }
}

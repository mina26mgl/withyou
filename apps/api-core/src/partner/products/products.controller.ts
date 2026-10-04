import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { PartnerGuard, PartnerRequest } from '../../auth/partner.guard';
import { UpsertProductDto } from '../dto/upsert-product.dto';
import { AiDescriptionDto, AiDescriptionService } from './ai-description';
import { ProductsService } from './products.service';

@UseGuards(PartnerGuard)
@Controller('partner/products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly aiDescription: AiDescriptionService,
  ) {}

  /** « Rédiger avec l'IA » : description proposée d'après les ingrédients et les types de peau. */
  @Post('ai-description')
  generateDescription(@Body() dto: AiDescriptionDto) {
    return this.aiDescription.generate(dto);
  }

  @Get()
  findAll(@Req() req: PartnerRequest) {
    return this.productsService.findAll(req.marqueId);
  }

  @Get(':id')
  findOne(@Req() req: PartnerRequest, @Param('id') id: string) {
    return this.productsService.findOne(req.marqueId, id);
  }

  @Post()
  create(@Req() req: PartnerRequest, @Body() dto: UpsertProductDto) {
    return this.productsService.create(req.marqueId, dto);
  }

  @Patch(':id')
  update(@Req() req: PartnerRequest, @Param('id') id: string, @Body() dto: UpsertProductDto) {
    return this.productsService.update(req.marqueId, id, dto);
  }
}

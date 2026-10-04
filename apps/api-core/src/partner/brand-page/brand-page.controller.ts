import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { PartnerGuard, PartnerRequest } from '../../auth/partner.guard';
import { UpdateBrandDraftDto } from '../dto/update-brand-draft.dto';
import { BrandPageService } from './brand-page.service';

@UseGuards(PartnerGuard)
@Controller('partner/brand/page')
export class BrandPageController {
  constructor(private readonly brandPageService: BrandPageService) {}

  @Get()
  get(@Req() req: PartnerRequest) {
    return this.brandPageService.getState(req.marqueId);
  }

  /** Produits en ligne et avis vérifiés parmi lesquels la marque choisit ce qu'elle affiche. */
  @Get('extras')
  extras(@Req() req: PartnerRequest) {
    return this.brandPageService.getCandidates(req.marqueId);
  }

  @Patch()
  update(@Req() req: PartnerRequest, @Body() dto: UpdateBrandDraftDto) {
    return this.brandPageService.updateDraft(req.marqueId, dto);
  }

  @Post('submit')
  submit(@Req() req: PartnerRequest) {
    return this.brandPageService.submit(req.marqueId);
  }
}

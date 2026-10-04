import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { PartnerGuard, PartnerRequest } from '../../auth/partner.guard';
import { ReplyReviewDto } from './reply-review.dto';
import { ReviewsService } from './reviews.service';

@UseGuards(PartnerGuard)
@Controller('partner/reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  list(@Req() req: PartnerRequest, @Query('filter') filter?: string) {
    return this.reviewsService.list(req.marqueId, this.reviewsService.parseFilter(filter));
  }

  @Post(':id/reply')
  reply(@Req() req: PartnerRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ReplyReviewDto) {
    return this.reviewsService.reply(req.marqueId, id, dto.text);
  }
}

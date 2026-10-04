import { Module } from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { PartnerGuard } from '../auth/partner.guard';
import { PrismaService } from '../prisma/prisma.service';
import { StorageModule } from '../storage/storage.module';
import { UsersService } from '../users/users.service';
import { AnalyticsController } from './analytics/analytics.controller';
import { AnalyticsService } from './analytics/analytics.service';
import { BrandPageController } from './brand-page/brand-page.controller';
import { BrandPageService } from './brand-page/brand-page.service';
import { PartnerStatsService } from './common/partner-stats.service';
import { HomeController } from './home/home.controller';
import { HomeService } from './home/home.service';
import { PlacementsController } from './placements/placements.controller';
import { PlacementsService } from './placements/placements.service';
import { ProductsController } from './products/products.controller';
import { ProductsService } from './products/products.service';
import { AiDescriptionService } from './products/ai-description';
import { PromotionsController } from './promotions/promotions.controller';
import { PromotionsService } from './promotions/promotions.service';
import { ReviewsController } from './reviews/reviews.controller';
import { ReviewsService } from './reviews/reviews.service';
import { SalonTestsController } from './salon-tests/salon-tests.controller';
import { SalonTestsService } from './salon-tests/salon-tests.service';
import { SummaryController } from './summary/summary.controller';
import { SummaryService } from './summary/summary.service';
import { UploadsController } from './uploads/uploads.controller';
import { PartnerProfileController } from './profile/partner-profile.controller';
import { PartnerProfileService } from './profile/partner-profile.service';
import { FeatureGuard } from '../subscriptions/feature.guard';
import { PartnerSubscriptionsController } from '../subscriptions/partner-subscriptions.controller';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Module({
  imports: [StorageModule],
  controllers: [
    SummaryController,
    HomeController,
    BrandPageController,
    ProductsController,
    AnalyticsController,
    ReviewsController,
    PromotionsController,
    PlacementsController,
    SalonTestsController,
    UploadsController,
    PartnerSubscriptionsController,
    PartnerProfileController,
  ],
  providers: [
    PrismaService,
    UsersService,
    ClerkAuthGuard,
    PartnerGuard,
    PartnerStatsService,
    SummaryService,
    HomeService,
    BrandPageService,
    ProductsService,
    AiDescriptionService,
    AnalyticsService,
    ReviewsService,
    PromotionsService,
    PlacementsService,
    SalonTestsService,
    SubscriptionsService,
    FeatureGuard,
    PartnerProfileService,
  ],
})
export class PartnerModule {}

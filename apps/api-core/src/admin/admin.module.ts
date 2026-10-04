import { Module } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminOrdersService } from './admin-orders.service';
import { AdminDeliveriesService } from './admin-deliveries.service';
import { AdminNetworkController } from './admin-network.controller';
import { AdminBoxController } from './admin-box.controller';
import { AdminBoxService } from './admin-box.service';
import { AdminAnalyticsService } from './admin-analytics.service';
import { AdminNetworkService } from './admin-network.service';
import { AdminSubscriptionsController } from '../subscriptions/admin-subscriptions.controller';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { StorageModule } from '../storage/storage.module';
import { AdminProfileController } from './admin-profile.controller';
import { AdminProfileService } from './admin-profile.service';

@Module({
  imports: [StorageModule],
  controllers: [AdminController, AdminSubscriptionsController, AdminNetworkController, AdminBoxController, AdminProfileController],
  providers: [PrismaService, UsersService, ClerkAuthGuard, AdminGuard, AdminService, AdminOrdersService, AdminDeliveriesService, SubscriptionsService, AdminNetworkService, AdminBoxService, AdminAnalyticsService, AdminProfileService],
})
export class AdminModule {}

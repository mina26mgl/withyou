import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProduitsModule } from './produits/produits.module';
import { CommandesModule } from './commandes/commandes.module';
import { PanierModule } from './panier/panier.module';
import { SearchModule } from './search/search.module';
import { ClerkWebhookModule } from './webhooks/clerk-webhook.module';
import { PrismaService } from './prisma/prisma.service';
import { PartnerModule } from './partner/partner.module';
import { MarquesModule } from './marques/marques.module';
import { CategoriesModule } from './categories/categories.module';
import { EventsModule } from './events/events.module';
import { AdminModule } from './admin/admin.module';
import { BrandRequestModule } from './brand-request/brand-request.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    MongooseModule.forRoot(process.env.MONGODB_URI ?? 'mongodb://localhost:27017/withyou_sessions'),
    AuthModule,
    UsersModule,
    ProduitsModule,
    CommandesModule,
    PanierModule,
    SearchModule,
    ClerkWebhookModule,
    PartnerModule,
    MarquesModule,
    CategoriesModule,
    EventsModule,
    AdminModule,
    BrandRequestModule,
  ],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}

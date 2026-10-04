import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';

// Registration/login are now handled by Clerk (see ../webhooks/clerk-webhook.*).
// This module only registers the 'jwt' passport strategy still used by
// AuthGuard('jwt') on a few legacy routes (commandes, produits).
@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN ?? '15m' },
    }),
  ],
  providers: [JwtStrategy],
})
export class AuthModule {}
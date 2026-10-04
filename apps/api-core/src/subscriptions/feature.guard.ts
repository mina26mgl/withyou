import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { PaidFeature } from '@withyou/shared-types';
import type { PartnerRequest } from '../auth/partner.guard';
import { PrismaService } from '../prisma/prisma.service';
import { activeFeatures } from './subscription-rules';

const FEATURE_KEY = 'requiredFeature';
/** Route réservée aux marques qui ont un abonnement actif débloquant cette fonctionnalité. */
export const RequiresFeature = (feature: PaidFeature) => SetMetadata(FEATURE_KEY, feature);

/**
 * À placer après PartnerGuard (qui fournit req.marqueId). Sans abonnement actif,
 * répond 403 avec code SUBSCRIPTION_REQUIRED : l'espace marque affiche alors l'offre.
 */
@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.getAllAndOverride<PaidFeature | undefined>(FEATURE_KEY, [context.getHandler(), context.getClass()]);
    if (!feature) return true;
    const req = context.switchToHttp().getRequest<PartnerRequest>();
    const features = await activeFeatures(this.prisma, req.marqueId);
    if (!features.includes(feature)) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'SUBSCRIPTION_REQUIRED',
        feature,
        message: 'Cette fonctionnalité fait partie d’un abonnement. Abonnez-vous depuis votre espace marque pour la débloquer.',
      });
    }
    return true;
  }
}

import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PremiumService } from '../premium.service';
import { EntitlementEngine } from '../entitlement.engine';
import { REQUIRES_PREMIUM_KEY } from './requires-premium.decorator';

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private premiumService: PremiumService,
    private entitlementEngine: EntitlementEngine,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const featureKey = this.reflector.getAllAndOverride<string>(REQUIRES_PREMIUM_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!featureKey) return true;

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    if (!userId) {
      throw new ForbiddenException('Authentication required');
    }

    const isPremium = await this.premiumService.isPremium(userId);
    if (!isPremium) {
      throw new ForbiddenException('Premium subscription required');
    }

    const sub = await this.premiumService.getCurrentSubscription(userId);
    const planCode = sub?.plan?.code || 'FREE';
    const entitlement = this.entitlementEngine.check(featureKey, planCode);
    if (!entitlement.allowed) {
      throw new ForbiddenException(`Feature "${featureKey}" requires ${entitlement.upgradePlan} plan`);
    }

    return true;
  }
}

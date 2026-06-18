import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PremiumService } from '../premium.service';
import { EntitlementEngine } from '../entitlement.engine';
import { PREMIUM_FEATURE_KEY } from './requires-premium.decorator';

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private premiumService: PremiumService,
    private entitlementEngine: EntitlementEngine,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id || request.user?.sub;
    if (!userId) {
      throw new ForbiddenException('Authentication required');
    }

    const requiredFeature = this.reflector.getAllAndOverride<string>(PREMIUM_FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredFeature) {
      return true;
    }

    const sub = await this.premiumService.getCurrentSubscription(userId);
    const planCode = sub?.plan?.code || 'FREE';

    const isEntitled = this.entitlementEngine.check(requiredFeature, planCode);
    if (!isEntitled.allowed) {
      throw new ForbiddenException({
        message: `Feature '${requiredFeature}' not available`,
        upgradePlan: isEntitled.upgradePlan,
        reason: isEntitled.reason,
      });
    }

    return true;
  }
}

import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PremiumService } from '../premium.service';
import { EntitlementEngine } from '../entitlement.engine';

@Injectable()
export class PremiumGuard implements CanActivate {
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

    const isPremium = await this.premiumService.isPremium(userId);
    if (!isPremium) {
      throw new ForbiddenException('Premium subscription required');
    }

    const requiredFeature = this.reflector.getAllAndOverride<string>('PREMIUM_FEATURE', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredFeature) {
      const sub = await this.premiumService.getCurrentSubscription(userId);
      const planCode = sub?.plan?.code || 'FREE';
      const hasAccess = this.entitlementEngine.canAccess(planCode, requiredFeature);
      if (!hasAccess) {
        throw new ForbiddenException(`Feature '${requiredFeature}' not available on your plan`);
      }
    }

    return true;
  }
}

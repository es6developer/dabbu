import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PremiumService } from '../premium.service';
import { EntitlementEngine, EntitlementResult } from '../entitlement.engine';

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

    const requiredFeature = this.reflector.getAllAndOverride<string>('PREMIUM_FEATURE', [
      context.getHandler(),
      context.getClass(),
    ]);

    const entitlements = await this.premiumService.getUserEntitlements(userId);
    if (!entitlements.isPremium) {
      throw new ForbiddenException('Premium subscription required');
    }

    if (requiredFeature) {
      const check: EntitlementResult = this.entitlementEngine.check(
        requiredFeature,
        entitlements.planCode,
      );
      if (!check.allowed) {
        throw new ForbiddenException(`Feature '${requiredFeature}' not available on your plan`);
      }
    }

    return true;
  }
}

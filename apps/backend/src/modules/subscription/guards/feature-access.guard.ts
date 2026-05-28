import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../../common/prisma/prisma.service';

export const FEATURE_KEY = 'feature-key';

@Injectable()
export class FeatureAccessGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const featureKey = this.reflector.get<string>(FEATURE_KEY, context.getHandler());
    if (!featureKey) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id || request.user?.sub;

    if (!userId) {
      throw new ForbiddenException('Authentication required');
    }

    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });

    if (!subscription || subscription.status !== 'active') {
      throw new ForbiddenException('Active subscription required');
    }

    const plan = subscription.plan;
    const features = (plan.features as Record<string, boolean>) || {};

    if (!features[featureKey]) {
      const featureFlag = await this.prisma.featureFlag.findUnique({
        where: { name: featureKey },
      });

      if (!featureFlag?.isEnabled) {
        throw new ForbiddenException(`Feature "${featureKey}" is not available on your plan`);
      }
    }

    return true;
  }
}

import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class PremiumGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
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

    if (subscription.plan.isDefault || Number(subscription.plan.price) === 0) {
      throw new ForbiddenException('Premium subscription required for this feature');
    }

    if (subscription.currentPeriodEnd && subscription.currentPeriodEnd < new Date()) {
      throw new ForbiddenException('Subscription has expired');
    }

    return true;
  }
}

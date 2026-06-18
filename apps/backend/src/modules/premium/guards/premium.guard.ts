import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PremiumService } from '../premium.service';

@Injectable()
export class PremiumGuard implements CanActivate {
  constructor(private premiumService: PremiumService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    if (!userId) {
      throw new ForbiddenException('Authentication required');
    }

    const isPremium = await this.premiumService.isPremium(userId);
    if (!isPremium) {
      throw new ForbiddenException('Premium subscription required');
    }
    return true;
  }
}

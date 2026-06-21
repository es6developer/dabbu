import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { LensType } from '@prisma/client';
import { REQUIRED_LENSES } from './decorators/require-lens.decorator';
import { LensService } from './lens.service';

@Injectable()
export class LensGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly lensService: LensService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredLenses = this.reflector.getAllAndOverride<LensType[]>(REQUIRED_LENSES, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;

    if (!userId) {
      throw new ForbiddenException('User not authenticated');
    }

    const currentLens = await this.lensService.getUserLensType(userId);
    request.lens = currentLens;

    if (!requiredLenses || requiredLenses.length === 0) {
      return true;
    }

    const hasAccess = requiredLenses.includes(currentLens);
    if (!hasAccess) {
      throw new ForbiddenException(
        `This endpoint requires one of the following lenses: ${requiredLenses.join(', ')}. Current lens: ${currentLens}`,
      );
    }

    return true;
  }
}

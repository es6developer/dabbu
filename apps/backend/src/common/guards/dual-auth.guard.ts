import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DualAuthGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const jwtGuard = new (AuthGuard('jwt'))(this.reflector);
    try {
      const canActivate = await jwtGuard.canActivate(context);
      if (canActivate) {
        return true;
      }
    } catch {
      // JWT validation failed, fall through to temp session check
    }

    const token = this.extractBearerToken(request);
    if (!token) {
      throw new UnauthorizedException('No valid authentication token');
    }

    const tempUser = await (this.prisma as any).tempUser.findFirst({
      where: {
        sessionToken: token,
        isActive: true,
        sessionExpiresAt: { gt: new Date() },
        convertedToUserId: null,
      },
    });

    if (!tempUser) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    request.user = {
      id: tempUser.id,
      type: 'temp',
      email: tempUser.email,
      displayName: tempUser.displayName,
    };
    return true;
  }

  private extractBearerToken(request: any): string | null {
    const auth = request.headers?.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      return null;
    }
    return auth.slice(7);
  }
}

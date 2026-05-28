import {
  Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../common/prisma/prisma.service';

export const ADMIN_ROLE_KEY = 'admin_role';

export const Roles = (...roles: string[]) => SetMetadata(ADMIN_ROLE_KEY, roles);

const ROLE_HIERARCHY: Record<string, number> = {
  super_admin: 100,
  admin: 80,
  support: 60,
  analyst: 40,
};

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Authentication token is required');
    }

    let payload: any;
    try {
      payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('jwt.secret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const admin = await this.prisma.adminUser.findUnique({
      where: { id: payload.sub },
    });

    if (!admin) {
      throw new UnauthorizedException('Admin user not found');
    }

    if (!admin.isActive) {
      throw new UnauthorizedException('Admin account is deactivated');
    }

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ADMIN_ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredRoles && requiredRoles.length > 0) {
      const hasRole = requiredRoles.some((role) => {
        const userLevel = ROLE_HIERARCHY[admin.role] ?? 0;
        const requiredLevel = ROLE_HIERARCHY[role] ?? 0;
        return userLevel >= requiredLevel;
      });

      if (!hasRole) {
        throw new ForbiddenException('Insufficient role permissions');
      }
    }

    request.admin = admin;
    return true;
  }

  private extractToken(request: any): string | null {
    const authHeader = request.headers?.authorization;
    if (!authHeader) return null;
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      return parts[1];
    }
    return null;
  }
}

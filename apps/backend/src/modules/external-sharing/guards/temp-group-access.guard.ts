import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class TempGroupAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const groupId = request.params?.groupId || request.body?.groupId;

    if (!user || !groupId) {
      throw new ForbiddenException('Access denied');
    }

    if (user.status === 'temporary') {
      if (user.tempGroupId !== groupId) {
        throw new ForbiddenException('You can only access your invited group');
      }
      return true;
    }

    const membership = await this.prisma.sharedGroupMember.findUnique({
      where: { groupId_userId: { groupId, userId: user.id } },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this group');
    }

    return true;
  }
}

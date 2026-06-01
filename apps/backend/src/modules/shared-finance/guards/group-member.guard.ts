import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class GroupMemberGuard implements CanActivate {
  private readonly logger = new Logger(GroupMemberGuard.name);

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const groupId = request.params.groupId;

    if (!user || !groupId) {
      throw new ForbiddenException('Access denied');
    }

    const group = await this.prisma.sharedGroup.findUnique({
      where: { id: groupId },
      select: { status: true },
    });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    if (group.status === 'CLOSED') {
      throw new ForbiddenException('This group has been closed. Access is permanently revoked.');
    }

    const membership = await this.prisma.sharedGroupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId: user.id },
      },
    });

    if (!membership || !membership.isActive) {
      throw new ForbiddenException(
        membership ? 'Your membership has been revoked.' : 'You are not a member of this group.',
      );
    }

    // Check session revocation
    const revoked = await this.prisma.sessionRevocation.findFirst({
      where: {
        userId: user.id,
        groupId,
        expiresAt: { gte: new Date() },
      },
    });
    if (revoked) {
      throw new ForbiddenException(
        'Your session has been revoked. Please contact the group admin.',
      );
    }

    request.groupMembership = membership;
    return true;
  }
}

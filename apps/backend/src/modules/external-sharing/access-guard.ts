import {
  Injectable, CanActivate, ExecutionContext, ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GroupStatus } from './lifecycle.types';

@Injectable()
export class TempUserAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tempUserId = request.headers['x-temp-user-id'] as string;
    const sessionToken = request.headers['x-session-token'] as string;
    const groupId = request.params.groupId || request.params.id;

    if (!tempUserId || !sessionToken) {
      throw new ForbiddenException('Temp user authentication required');
    }

    if (!groupId) {
      throw new ForbiddenException('Group ID required');
    }

    const tempUser = await this.prisma.tempUser.findUnique({
      where: { id: tempUserId },
    });

    if (!tempUser || !tempUser.isActive) {
      throw new ForbiddenException('Temp user not found or inactive');
    }

    if (tempUser.sessionToken !== sessionToken) {
      throw new ForbiddenException('Invalid session token');
    }

    if (tempUser.sessionExpiresAt && tempUser.sessionExpiresAt < new Date()) {
      throw new ForbiddenException('Session expired');
    }

    if (tempUser.convertedToUserId) {
      throw new ForbiddenException('Account converted, please login with full account');
    }

    const membership = await this.prisma.groupMemberTemp.findUnique({
      where: { groupId_tempUserId: { groupId, tempUserId } },
    });

    if (!membership || !membership.isActive) {
      throw new ForbiddenException('You are not an active member of this group');
    }

    const group = await this.prisma.sharedFinanceGroup.findUnique({
      where: { id: groupId },
      select: { status: true },
    });

    if (!group) {
      throw new ForbiddenException('Group not found');
    }

    const status = group.status as GroupStatus;
    const method = request.method;

    if (status === 'closed') {
      throw new ForbiddenException('Group is closed');
    }

    if (status === 'archived') {
      throw new ForbiddenException('Group is archived, access ended');
    }

    if (status === 'completed' && method !== 'GET') {
      throw new ForbiddenException('Group is completed, read-only');
    }

    if (status === 'paused' && method !== 'GET') {
      throw new ForbiddenException('Group is paused, read-only');
    }

    const activeRestriction = await this.prisma.groupAccessRestriction.findFirst({
      where: {
        groupId,
        isActive: true,
        OR: [
          { appliedTo: 'all' },
          { appliedTo: 'temp_users' },
          { appliedTo: 'specific_temp', targetTempId: tempUserId },
        ],
      },
    });

    if (activeRestriction) {
      if (activeRestriction.restrictionType === 'all_blocked') {
        throw new ForbiddenException('Access restricted: all operations blocked');
      }
      if (activeRestriction.restrictionType === 'read_only' && method !== 'GET') {
        throw new ForbiddenException('Access restricted: read-only');
      }
      if (activeRestriction.restrictionType === 'no_new_expenses' && method === 'POST') {
        throw new ForbiddenException('Access restricted: no new expenses allowed');
      }
      if (activeRestriction.restrictionType === 'no_chat' && request.url.includes('chat')) {
        throw new ForbiddenException('Access restricted: chat disabled');
      }
      if (activeRestriction.restrictionType === 'no_settlements' && request.url.includes('settle')) {
        throw new ForbiddenException('Access restricted: settlements disabled');
      }
      if (activeRestriction.restrictionType === 'no_invites' && request.url.includes('invite')) {
        throw new ForbiddenException('Access restricted: invites disabled');
      }
    }

    request.tempUser = tempUser;
    request.tempMember = membership;

    return true;
  }
}

@Injectable()
export class GroupStatusGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const groupId = request.params.groupId || request.params.id;

    if (!groupId) return true;

    const group = await this.prisma.sharedFinanceGroup.findUnique({
      where: { id: groupId },
      select: { status: true },
    });

    if (!group) {
      throw new ForbiddenException('Group not found');
    }

    const status = group.status as GroupStatus;
    const method = request.method;
    const isTempUser = !!request.headers['x-temp-user-id'];
    const isMutation = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method);

    switch (status) {
      case 'closed':
        throw new ForbiddenException('Group is closed. No operations allowed.');
      case 'archived':
        if (isMutation) {
          throw new ForbiddenException('Group is archived. Read-only.');
        }
        if (isTempUser) {
          throw new ForbiddenException('Group is archived. Temp user access ended.');
        }
        break;
      case 'completed':
        if (isMutation && request.url.includes('expense')) {
          throw new ForbiddenException('Group is completed. No new expenses.');
        }
        break;
      case 'paused':
        if (isMutation) {
          const allowedPaths = ['/status', '/reactivate', '/freeze', '/complete', '/archive', '/close'];
          const isAllowed = allowedPaths.some((p) => request.url.includes(p));
          if (!isAllowed) {
            throw new ForbiddenException('Group is paused. Read-only until reactivated.');
          }
        }
        break;
      case 'active':
        break;
    }

    return true;
  }
}

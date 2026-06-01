import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Server } from 'socket.io';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AccessRevocationEngine } from './access-revocation.engine';

export type GroupStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED' | 'CLOSED';

// Allowed transitions
const VALID_TRANSITIONS: Record<GroupStatus, GroupStatus[]> = {
  ACTIVE: ['PAUSED', 'COMPLETED', 'CLOSED'],
  PAUSED: ['ACTIVE', 'CLOSED'],
  COMPLETED: ['ARCHIVED', 'CLOSED'],
  ARCHIVED: ['CLOSED'],
  CLOSED: [],
};

const CAN_ADD_EXPENSES: GroupStatus[] = ['ACTIVE'];
const CAN_EDIT: GroupStatus[] = ['ACTIVE', 'PAUSED'];
const CAN_VIEW: GroupStatus[] = ['ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED'];
const CAN_INVITE: GroupStatus[] = ['ACTIVE', 'PAUSED'];
const CAN_SETTLE: GroupStatus[] = ['ACTIVE', 'COMPLETED'];

@Injectable()
export class GroupLifecycleService {
  private readonly logger = new Logger(GroupLifecycleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly revocationEngine: AccessRevocationEngine,
  ) {}

  async transitionGroupStatus(
    groupId: string,
    userId: string,
    newStatus: GroupStatus,
    socketServer?: Server,
  ): Promise<any> {
    const group = await this.prisma.sharedGroup.findUnique({
      where: { id: groupId },
      include: {
        members: {
          where: { userId, isActive: true },
          select: { role: true },
        },
      },
    });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const membership = group.members[0];
    if (!membership || membership.role !== 'admin') {
      throw new ForbiddenException('Only admins can change group status');
    }

    const currentStatus = group.status as GroupStatus;
    const allowedNext = VALID_TRANSITIONS[currentStatus];
    if (!allowedNext.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${currentStatus} to ${newStatus}. ` +
          `Allowed transitions: ${allowedNext.join(', ') || 'none'}`,
      );
    }

    const now = new Date();
    const updateData: any = {
      status: newStatus,
      statusChangedAt: now,
      statusChangedBy: userId,
    };

    // Set specific timestamp fields
    switch (newStatus) {
      case 'PAUSED':
        updateData.pausedAt = now;
        break;
      case 'COMPLETED':
        updateData.completedAt = now;
        break;
      case 'ARCHIVED':
        updateData.archivedAt = now;
        break;
      case 'CLOSED':
        updateData.closedAt = now;
        break;
    }

    // If closing or archiving, expire all guest sessions
    if (newStatus === 'CLOSED' || newStatus === 'ARCHIVED') {
      const activeMembers = await this.prisma.sharedGroupMember.findMany({
        where: { groupId, isActive: true },
        select: { userId: true },
      });

      await this.prisma.groupInvite.updateMany({
        where: { groupId, status: 'active' },
        data: {
          status: 'expired',
          guestAccessExpiresAt: now,
        },
      });

      for (const m of activeMembers) {
        await this.prisma.sessionRevocation.create({
          data: {
            userId: m.userId,
            groupId,
            reason: `group_${newStatus.toLowerCase()}`,
            revokedAt: now,
            expiresAt: new Date(now.getTime() + 90 * 86400000),
          },
        });
      }
    }

    const updated = await this.prisma.sharedGroup.update({
      where: { id: groupId },
      data: updateData,
    });

    // Log lifecycle event
    await this.prisma.groupLifecycleEvent.create({
      data: {
        groupId,
        eventType: 'status_changed',
        fromStatus: currentStatus,
        toStatus: newStatus,
        triggeredBy: userId,
        metadata: {
          previousStatus: currentStatus,
          newStatus,
          transitionedAt: now.toISOString(),
        },
      },
    });

    // Handle guest expiration + socket disconnects for terminal states
    if ((newStatus === 'CLOSED' || newStatus === 'ARCHIVED') && socketServer) {
      await this.revocationEngine.revokeGroupAccess(
        groupId,
        `Group has been ${newStatus.toLowerCase()}.`,
        socketServer,
      );
    }

    if (newStatus === 'COMPLETED' && socketServer) {
      socketServer.to(`group:${groupId}`).emit('groupCompleted', {
        groupId,
        message: 'Trip/group has been marked as completed.',
        settlementReadonly: true,
        newExpensesBlocked: true,
      });
    }

    // For PAUSED, notify members
    if (newStatus === 'PAUSED' && socketServer) {
      socketServer.to(`group:${groupId}`).emit('groupPaused', {
        groupId,
        message: 'Group editing has been paused by admin.',
      });
    }

    this.logger.log(`Group ${groupId} transitioned ${currentStatus} → ${newStatus} by ${userId}`);

    return {
      ...updated,
      totalSpent: Number(updated.totalSpent || 0),
      monthlyBudget: Number(updated.monthlyBudget || 0),
      monthlyIncome: Number(updated.monthlyIncome || 0),
    };
  }

  async canAddExpense(groupId: string): Promise<boolean> {
    const group = await this.prisma.sharedGroup.findUnique({
      where: { id: groupId },
      select: { status: true },
    });
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    return CAN_ADD_EXPENSES.includes(group.status as GroupStatus);
  }

  async canEditGroup(groupId: string): Promise<boolean> {
    const group = await this.prisma.sharedGroup.findUnique({
      where: { id: groupId },
      select: { status: true },
    });
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    return CAN_EDIT.includes(group.status as GroupStatus);
  }

  async canViewGroup(groupId: string): Promise<{ allowed: boolean; status: GroupStatus }> {
    const group = await this.prisma.sharedGroup.findUnique({
      where: { id: groupId },
      select: { status: true },
    });
    if (!group) {
      return { allowed: false, status: 'CLOSED' };
    }
    return {
      allowed: CAN_VIEW.includes(group.status as GroupStatus),
      status: group.status as GroupStatus,
    };
  }

  async canInvite(groupId: string): Promise<boolean> {
    const group = await this.prisma.sharedGroup.findUnique({
      where: { id: groupId },
      select: { status: true },
    });
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    return CAN_INVITE.includes(group.status as GroupStatus);
  }

  async canSettle(groupId: string): Promise<boolean> {
    const group = await this.prisma.sharedGroup.findUnique({
      where: { id: groupId },
      select: { status: true, settlementsFinalized: true },
    });
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    if (group.settlementsFinalized) {
      return false;
    }
    return CAN_SETTLE.includes(group.status as GroupStatus);
  }

  async assertCanAddExpense(groupId: string): Promise<void> {
    const group = await this.prisma.sharedGroup.findUnique({
      where: { id: groupId },
      select: { status: true },
    });
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    if (!CAN_ADD_EXPENSES.includes(group.status as GroupStatus)) {
      throw new BadRequestException(
        `Cannot add expenses. Group is currently ${group.status}. ` +
          `Expenses can only be added when group is ACTIVE.`,
      );
    }
  }

  async assertCanSettle(groupId: string): Promise<void> {
    const group = await this.prisma.sharedGroup.findUnique({
      where: { id: groupId },
      select: { status: true, settlementsFinalized: true },
    });
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    if (group.settlementsFinalized) {
      throw new BadRequestException('Settlements have been finalized for this group.');
    }
    if (!CAN_SETTLE.includes(group.status as GroupStatus)) {
      throw new BadRequestException(
        `Cannot create settlements. Group is currently ${group.status}. ` +
          `Settlements require ACTIVE or COMPLETED status.`,
      );
    }
  }

  async assertCanInvite(groupId: string): Promise<void> {
    if (!(await this.canInvite(groupId))) {
      throw new BadRequestException('Cannot invite members when group is not active or paused.');
    }
  }

  async finalizeSettlements(groupId: string, userId: string): Promise<any> {
    const group = await this.prisma.sharedGroup.findUnique({
      where: { id: groupId },
      include: {
        members: {
          where: { userId, isActive: true, role: 'admin' },
          select: { role: true },
        },
      },
    });
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    if (!group.members.length) {
      throw new ForbiddenException('Only admins can finalize settlements');
    }

    const updated = await this.prisma.sharedGroup.update({
      where: { id: groupId },
      data: {
        settlementsFinalized: true,
        finalizedAt: new Date(),
      },
    });

    await this.prisma.groupLifecycleEvent.create({
      data: {
        groupId,
        eventType: 'settlements_finalized',
        fromStatus: group.status,
        toStatus: group.status,
        triggeredBy: userId,
        metadata: { finalizedAt: new Date().toISOString() },
      },
    });

    this.logger.log(`Settlements finalized for group ${groupId} by ${userId}`);

    return updated;
  }

  async getLifecycleHistory(groupId: string): Promise<any[]> {
    return this.prisma.groupLifecycleEvent.findMany({
      where: { groupId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getMemberRemovalLogs(groupId: string): Promise<any[]> {
    return this.prisma.memberRemovalLog.findMany({
      where: { groupId },
      include: {
        remover: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAccessibleGroupData(
    groupId: string,
    userId: string,
  ): Promise<{ group: any; readable: boolean; reason?: string; status: GroupStatus }> {
    const group = await this.prisma.sharedGroup.findUnique({
      where: { id: groupId },
    });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const status = group.status as GroupStatus;
    const { allowed } = await this.canViewGroup(groupId);

    if (!allowed) {
      return {
        group: null,
        readable: false,
        reason: this.getAccessDeniedReason(status),
        status,
      };
    }

    const member = await this.prisma.sharedGroupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (!member || !member.isActive) {
      return {
        group: null,
        readable: false,
        reason: member
          ? 'Your membership has been revoked.'
          : 'You are not a member of this group.',
        status,
      };
    }

    // Check for session revocation
    const revoked = await this.revocationEngine.isSessionRevoked(userId, groupId);
    if (revoked) {
      return {
        group: null,
        readable: false,
        reason: 'Your session has been revoked. Please contact the group admin.',
        status,
      };
    }

    return { group, readable: true, status };
  }

  private getAccessDeniedReason(status: GroupStatus): string {
    switch (status) {
      case 'CLOSED':
        return 'This group has been closed permanently. Access is no longer available.';
      case 'ARCHIVED':
        return 'This group has been archived. Guest access has expired.';
      case 'COMPLETED':
        return 'This trip/group has been completed. Guest access has expired.';
      default:
        return 'Access denied.';
    }
  }
}

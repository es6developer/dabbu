import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Server } from 'socket.io';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  GroupStatus, LifecycleEventType, RevocationType,
  isValidTransition,
} from './lifecycle.types';
import { LifecycleNotificationService } from './lifecycle-notification.service';
import { RevocationService } from './revocation.service';

@Injectable()
export class LifecycleService {
  private readonly logger = new Logger(LifecycleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: LifecycleNotificationService,
    private readonly revocationService: RevocationService,
  ) {}

  async updateStatus(groupId: string, newStatus: GroupStatus, triggeredBy: string, reason?: string) {
    const group = await this.prisma.sharedFinanceGroup.findUnique({
      where: { id: groupId },
      include: {
        members: { where: { isActive: true, deletedAt: null }, select: { userId: true } },
        tempMembers: { where: { isActive: true }, select: { tempUserId: true } },
        trip: true,
      },
    });

    if (!group) throw new NotFoundException('Group not found');

    const currentStatus = group.status as GroupStatus;
    if (!isValidTransition(currentStatus, newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
      );
    }

    const updateData: any = { status: newStatus };
    let eventType: LifecycleEventType = 'paused';

    if (newStatus === 'active') eventType = 'resumed';
    else if (newStatus === 'completed') {
      eventType = 'completed';
      updateData.completedAt = new Date();
    } else if (newStatus === 'archived') {
      eventType = 'archived';
      updateData.archivedAt = new Date();
    } else if (newStatus === 'closed') {
      eventType = 'closed';
      updateData.closedAt = new Date();
      updateData.closedBy = triggeredBy;
    }

    await this.prisma.sharedFinanceGroup.update({
      where: { id: groupId },
      data: updateData,
    });

    await this.prisma.groupLifecycleEvent.create({
      data: {
        groupId,
        eventType,
        triggeredBy,
        oldStatus: currentStatus,
        newStatus,
        metadata: { reason, updatedFields: Object.keys(updateData) },
      },
    });

    if (newStatus === 'completed') {
      await this.handleCompleted(group, triggeredBy);
    }

    if (newStatus === 'archived') {
      await this.handleArchived(group);
    }

    if (newStatus === 'closed') {
      await this.handleClosed(group, triggeredBy);
    }

    if (newStatus === 'paused') {
      await this.handlePaused(group, triggeredBy);
    }

    if (newStatus === 'active') {
      await this.handleReactivated(group);
    }

    return {
      success: true,
      groupId,
      previousStatus: currentStatus,
      currentStatus: newStatus,
    };
  }

  private async handleCompleted(group: any, triggeredBy: string): Promise<void> {
    await this.prisma.inviteLink.updateMany({
      where: { groupId: group.id, isRevoked: false },
      data: { isRevoked: true, revokedAt: new Date() },
    });

    await this.prisma.tempUser.updateMany({
      where: {
        groupMemberships: { some: { groupId: group.id, isActive: true } },
      },
      data: { sessionToken: null, refreshToken: null, sessionExpiresAt: null },
    });

    await this.revocationService.revokeGroupAccess(group.id, 'group_completed');

    if (group.trip) {
      await this.prisma.trip.update({
        where: { id: group.trip.id },
        data: { status: 'completed', completedAt: new Date() },
      });

      await this.prisma.groupLifecycleEvent.create({
        data: {
          groupId: group.id,
          eventType: 'trip_ended',
          triggeredBy,
          metadata: { tripId: group.trip.id },
        },
      });
    }

    const allUserIds = group.members.map((m: any) => m.userId);
    await this.notificationService.notifyGroupCompleted(group.id, group.name, allUserIds);
  }

  private async handleArchived(group: any): Promise<void> {
    const tempMembers = await this.prisma.groupMemberTemp.findMany({
      where: { groupId: group.id, isActive: true },
      select: { id: true, tempUserId: true },
    });

    for (const tm of tempMembers) {
      await this.prisma.groupMemberTemp.update({
        where: { id: tm.id },
        data: {
          isActive: false,
          removedAt: new Date(),
          removedBy: 'system',
          removalReason: 'group_closed',
        },
      });

      await this.revocationService.disconnectSocket(tm.tempUserId, group.id, 'group_archived');
    }

    await this.notificationService.notifyGroupArchived(group.id, group.name);
  }

  private async handleClosed(group: any, triggeredBy: string): Promise<void> {
    await this.prisma.inviteLink.updateMany({
      where: { groupId: group.id, isRevoked: false },
      data: { isRevoked: true, revokedAt: new Date() },
    });

    const tempMembers = await this.prisma.groupMemberTemp.findMany({
      where: { groupId: group.id, isActive: true },
      include: { tempUser: true },
    });

    for (const tm of tempMembers) {
      await this.prisma.groupMemberTemp.update({
        where: { id: tm.id },
        data: {
          isActive: false,
          removedAt: new Date(),
          removedBy: triggeredBy,
          removalReason: 'group_closed',
        },
      });

      await this.revocationService.disconnectSocket(tm.tempUserId, group.id, 'group_closed');

      await this.prisma.sessionRevocation.create({
        data: {
          targetTempId: tm.tempUserId,
          groupId: group.id,
          revocationType: 'group_closed',
          revokedSessionToken: tm.tempUser.sessionToken,
          revokedSocketIds: this.revocationService.getTempSocketIds(tm.tempUserId),
          isProcessed: true,
          processedAt: new Date(),
          metadata: { closedBy: triggeredBy },
        },
      });
    }

    await this.notificationService.notifyGroupClosed(group.id, group.name);
  }

  private async handlePaused(group: any, triggeredBy: string): Promise<void> {
    await this.prisma.groupAccessRestriction.create({
      data: {
        groupId: group.id,
        restrictionType: 'read_only',
        appliedTo: 'all',
        reason: 'Group paused by admin',
        appliedBy: triggeredBy,
      },
    });

    await this.notificationService.notifyGroupCompleted(group.id, group.name, []);
  }

  private async handleReactivated(group: any): Promise<void> {
    await this.prisma.groupAccessRestriction.updateMany({
      where: { groupId: group.id, restrictionType: 'read_only', isActive: true },
      data: { isActive: false, removedAt: new Date() },
    });
  }

  async getStatus(groupId: string) {
    const group = await this.prisma.sharedFinanceGroup.findUnique({
      where: { id: groupId },
      select: { id: true, status: true, archivedAt: true, completedAt: true, closedAt: true, closedBy: true },
    });
    if (!group) throw new NotFoundException('Group not found');
    return group;
  }

  async getEvents(groupId: string) {
    const group = await this.prisma.sharedFinanceGroup.findUnique({
      where: { id: groupId },
      select: { id: true },
    });
    if (!group) throw new NotFoundException('Group not found');

    return this.prisma.groupLifecycleEvent.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async freeze(groupId: string, triggeredBy: string) {
    return this.updateStatus(groupId, 'paused', triggeredBy, 'Freeze requested');
  }

  async complete(groupId: string, triggeredBy: string) {
    return this.updateStatus(groupId, 'completed', triggeredBy, 'Complete requested');
  }

  async archive(groupId: string, triggeredBy: string) {
    return this.updateStatus(groupId, 'archived', triggeredBy, 'Archive requested');
  }

  async close(groupId: string, triggeredBy: string) {
    return this.updateStatus(groupId, 'closed', triggeredBy, 'Close requested');
  }

  async reactivate(groupId: string, triggeredBy: string) {
    const group = await this.prisma.sharedFinanceGroup.findUnique({
      where: { id: groupId },
      select: { status: true },
    });
    if (!group) throw new NotFoundException('Group not found');

    if (group.status !== 'paused') {
      throw new BadRequestException('Only paused groups can be reactivated');
    }

    return this.updateStatus(groupId, 'active', triggeredBy, 'Reactivate requested');
  }
}

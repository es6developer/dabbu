import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationType } from './lifecycle.types';

@Injectable()
export class LifecycleNotificationService {
  private readonly logger = new Logger(LifecycleNotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async notifyMemberRemoved(
    groupId: string,
    groupName: string,
    removedUserId: string | null,
    removedTempId: string | null,
    removedBy: string,
  ): Promise<void> {
    const notificationType: NotificationType = 'member_removed';
    const title = 'Removed from group';
    const message = `You were removed from ${groupName}`;

    await this.prisma.groupLifecycleNotification.create({
      data: {
        groupId,
        recipientUserId: removedUserId,
        recipientTempId: removedTempId,
        notificationType,
        title,
        message,
        actionLabel: 'Contact Admin',
      },
    });

    if (removedTempId) {
      const tempUser = await this.prisma.tempUser.findUnique({
        where: { id: removedTempId },
        select: { fcmToken: true },
      });
      if (tempUser?.fcmToken) {
        this.logger.log(`Push notification to temp user ${removedTempId}: ${message}`);
      }
    }
  }

  async notifyGroupCompleted(groupId: string, groupName: string, memberIds: string[]): Promise<void> {
    const notificationType: NotificationType = 'group_completed';
    const title = 'Trip Completed!';
    const message = `Trip/Group ${groupName} has been completed!`;
    const actionUrl = `/groups/${groupId}/summary`;
    const actionLabel = 'View Summary';

    const notifications: {
      groupId: string;
      recipientUserId?: string;
      recipientTempId?: string;
      notificationType: NotificationType;
      title: string;
      message: string;
      actionUrl?: string;
      actionLabel?: string;
    }[] = memberIds.map((userId) => ({
      groupId,
      recipientUserId: userId,
      notificationType,
      title,
      message,
      actionUrl,
      actionLabel,
    }));

    const tempMembers = await this.prisma.groupMemberTemp.findMany({
      where: { groupId, isActive: true },
      select: { tempUserId: true },
    });

    for (const tm of tempMembers) {
      notifications.push({
        groupId,
        recipientTempId: tm.tempUserId,
        notificationType,
        title,
        message,
        actionUrl,
        actionLabel,
      });
    }

    for (const n of notifications) {
      await this.prisma.groupLifecycleNotification.create({ data: n });
    }
  }

  async notifyGroupArchived(groupId: string, groupName: string): Promise<void> {
    const notificationType: NotificationType = 'group_archived';
    const title = 'Group Archived';
    const message = `Group ${groupName} has been archived`;
    const actionLabel = 'Install Dabbu to continue';

    const fullMembers = await this.prisma.groupMember.findMany({
      where: { groupId, isActive: true, deletedAt: null },
      select: { userId: true },
    });

    for (const m of fullMembers) {
      await this.prisma.groupLifecycleNotification.create({
        data: {
          groupId,
          recipientUserId: m.userId,
          recipientTempId: null,
          notificationType,
          title,
          message,
          actionLabel,
        },
      });
    }

    const tempMembers = await this.prisma.groupMemberTemp.findMany({
      where: { groupId, isActive: true },
      select: { tempUserId: true },
    });

    for (const tm of tempMembers) {
      await this.prisma.groupLifecycleNotification.create({
        data: {
          groupId,
          recipientUserId: undefined,
          recipientTempId: tm.tempUserId,
          notificationType,
          title,
          message,
          actionLabel,
        },
      });
    }
  }

  async notifyGroupClosed(groupId: string, groupName: string): Promise<void> {
    const notificationType: NotificationType = 'group_closed';
    const title = 'Group Closed';
    const message = `Group ${groupName} has been closed permanently`;

    const fullMembers = await this.prisma.groupMember.findMany({
      where: { groupId, isActive: true, deletedAt: null },
      select: { userId: true },
    });

    for (const m of fullMembers) {
      await this.prisma.groupLifecycleNotification.create({
        data: { groupId, recipientUserId: m.userId, recipientTempId: null, notificationType, title, message },
      });
    }

    const tempMembers = await this.prisma.groupMemberTemp.findMany({
      where: { groupId, isActive: true },
      select: { tempUserId: true },
    });

    for (const tm of tempMembers) {
      await this.prisma.groupLifecycleNotification.create({
        data: { groupId, recipientUserId: undefined, recipientTempId: tm.tempUserId, notificationType, title, message },
      });
    }
  }

  async notifyAccessExpired(groupId: string, tempUserId: string, groupName: string): Promise<void> {
    const notificationType: NotificationType = 'access_expired';
    const title = 'Access Expired';
    const message = `Your access to ${groupName} has expired`;
    const actionLabel = 'Request Access';

    const tempUser = await this.prisma.tempUser.findUnique({
      where: { id: tempUserId },
      select: { fcmToken: true },
    });

    await this.prisma.groupLifecycleNotification.create({
      data: {
        groupId,
        recipientUserId: undefined,
        recipientTempId: tempUserId,
        notificationType,
        title,
        message,
        actionLabel,
      },
    });

    if (tempUser?.fcmToken) {
      this.logger.log(`Push sent to temp user ${tempUserId}: ${message}`);
    }
  }

  async notifyInviteRevoked(groupId: string, tempUserId: string, groupName: string): Promise<void> {
    const notificationType: NotificationType = 'invite_revoked';
    const title = 'Invite Revoked';
    const message = `Your invite to ${groupName} has been revoked`;

    await this.prisma.groupLifecycleNotification.create({
      data: {
        groupId,
        recipientUserId: undefined,
        recipientTempId: tempUserId,
        notificationType,
        title,
        message,
        actionLabel: 'Contact Admin',
      },
    });
  }

  async notifyTripEnded(groupId: string, groupName: string): Promise<void> {
    const notificationType: NotificationType = 'trip_ended';
    const title = 'Trip Ended';
    const message = `Trip ${groupName} has ended!`;

    const fullMembers = await this.prisma.groupMember.findMany({
      where: { groupId, isActive: true, deletedAt: null },
      select: { userId: true },
    });

    for (const m of fullMembers) {
      await this.prisma.groupLifecycleNotification.create({
        data: {
          groupId,
          recipientUserId: m.userId,
          recipientTempId: null,
          notificationType,
          title,
          message,
          actionLabel: 'View Summary',
          actionUrl: `/groups/${groupId}/summary`,
        },
      });
    }

    const tempMembers = await this.prisma.groupMemberTemp.findMany({
      where: { groupId, isActive: true },
      select: { tempUserId: true },
    });

    for (const tm of tempMembers) {
      await this.prisma.groupLifecycleNotification.create({
        data: {
          groupId,
          recipientUserId: undefined,
          recipientTempId: tm.tempUserId,
          notificationType,
          title,
          message,
          actionLabel: 'View Summary',
          actionUrl: `/groups/${groupId}/summary`,
        },
      });
    }
  }
}

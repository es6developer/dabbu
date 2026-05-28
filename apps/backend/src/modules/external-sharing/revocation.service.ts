import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LifecycleNotificationService } from './lifecycle-notification.service';
import { RevocationType } from './lifecycle.types';

interface TempSocketEntry {
  socketId: string;
  tempUserId: string;
  groupId: string;
}

@Injectable()
export class RevocationService {
  private readonly logger = new Logger(RevocationService.name);
  private tempSocketMap = new Map<string, Set<TempSocketEntry>>();
  private server: Server | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: LifecycleNotificationService,
  ) {}

  setServer(server: Server): void {
    this.server = server;
  }

  registerTempSocket(socketId: string, tempUserId: string, groupId: string): void {
    if (!this.tempSocketMap.has(tempUserId)) {
      this.tempSocketMap.set(tempUserId, new Set());
    }
    this.tempSocketMap.get(tempUserId)!.add({ socketId, tempUserId, groupId });
  }

  unregisterTempSocket(socketId: string, tempUserId: string): void {
    const sockets = this.tempSocketMap.get(tempUserId);
    if (sockets) {
      for (const entry of sockets) {
        if (entry.socketId === socketId) {
          sockets.delete(entry);
          break;
        }
      }
      if (sockets.size === 0) {
        this.tempSocketMap.delete(tempUserId);
      }
    }
  }

  getTempSocketIds(tempUserId: string): string[] {
    const sockets = this.tempSocketMap.get(tempUserId);
    if (!sockets) return [];
    return Array.from(sockets).map((s) => s.socketId);
  }

  async revokeTempUserAccess(
    tempUserId: string,
    groupId: string,
    reason: RevocationType,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const membership = await this.prisma.groupMemberTemp.findUnique({
      where: { groupId_tempUserId: { groupId, tempUserId } },
      include: { tempUser: true, group: { select: { name: true } } },
    });

    if (!membership) return;

    const sessionToken = membership.tempUser.sessionToken;

    await this.prisma.groupMemberTemp.update({
      where: { id: membership.id },
      data: {
        isActive: false,
        removedAt: new Date(),
        removedBy: 'system',
        removalReason: reason,
      },
    });

    await this.disconnectSocket(tempUserId, groupId, reason);

    await this.prisma.sessionRevocation.create({
      data: {
        targetTempId: tempUserId,
        groupId,
        revocationType: reason,
        revokedSessionToken: sessionToken,
        revokedSocketIds: this.getTempSocketIds(tempUserId),
        isProcessed: true,
        processedAt: new Date(),
        metadata: metadata ?? {},
      },
    });

    await this.notificationService.notifyAccessExpired(groupId, tempUserId, membership.group.name);

    this.logger.log(`Temp user ${tempUserId} access revoked from group ${groupId} (${reason})`);
  }

  async revokeGroupAccess(groupId: string, reason: RevocationType): Promise<void> {
    const tempMembers = await this.prisma.groupMemberTemp.findMany({
      where: { groupId, isActive: true },
      include: { tempUser: true },
    });

    const socketIdsToDisconnect: string[] = [];

    for (const tm of tempMembers) {
      await this.prisma.groupMemberTemp.update({
        where: { id: tm.id },
        data: {
          isActive: false,
          removedAt: new Date(),
          removedBy: 'system',
          removalReason: reason,
        },
      });

      const sockets = this.getTempSocketIds(tm.tempUserId);
      socketIdsToDisconnect.push(...sockets);

      await this.prisma.sessionRevocation.create({
        data: {
          targetTempId: tm.tempUserId,
          groupId,
          revocationType: reason,
          revokedSessionToken: tm.tempUser.sessionToken,
          revokedSocketIds: sockets,
          isProcessed: true,
          processedAt: new Date(),
        },
      });
    }

    for (const sid of socketIdsToDisconnect) {
      if (this.server) {
        const socket = this.server.sockets.sockets.get(sid);
        if (socket) {
          socket.emit('access_revoked', { reason: 'Group access revoked', groupId });
          socket.disconnect(true);
        }
      }
    }

    this.logger.log(`Revoked access for ${tempMembers.length} temp users in group ${groupId}`);
  }

  async revokeInvite(inviteToken: string, reason?: string): Promise<void> {
    const invite = await this.prisma.inviteLink.findUnique({
      where: { token: inviteToken },
      include: {
        group: { select: { id: true, name: true } },
        groupMemberTemps: {
          where: { isActive: true },
          include: { tempUser: true },
        },
      },
    });

    if (!invite) return;

    await this.prisma.inviteLink.update({
      where: { id: invite.id },
      data: { isRevoked: true, revokedAt: new Date() },
    });

    for (const tm of invite.groupMemberTemps) {
      await this.prisma.groupMemberTemp.update({
        where: { id: tm.id },
        data: {
          isActive: false,
          removedAt: new Date(),
          removedBy: 'system',
          removalReason: 'invite_revoked',
        },
      });

      await this.disconnectSocket(tm.tempUserId, invite.groupId, 'invite_revoked');

      await this.prisma.sessionRevocation.create({
        data: {
          targetTempId: tm.tempUserId,
          groupId: invite.groupId,
          revocationType: 'invite_revoked',
          revokedSessionToken: tm.tempUser.sessionToken,
          isProcessed: true,
          processedAt: new Date(),
          metadata: { inviteToken, reason },
        },
      });

      await this.notificationService.notifyInviteRevoked(invite.group.id, tm.tempUserId, invite.group.name);
    }

    await this.prisma.groupLifecycleEvent.create({
      data: {
        groupId: invite.groupId,
        eventType: 'invite_revoked',
        triggeredBy: 'system',
        metadata: { inviteToken, reason, removedMembers: invite.groupMemberTemps.length },
      },
    });

    this.logger.log(`Invite ${inviteToken} revoked, ${invite.groupMemberTemps.length} members removed`);
  }

  async disconnectSocket(tempUserId: string, groupId: string, reason: string): Promise<void> {
    const sockets = this.getTempSocketIds(tempUserId);

    for (const socketId of sockets) {
      if (this.server) {
        const socket = this.server.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit('access_revoked', { reason, groupId, tempUserId });
          socket.leave(`group_temp:${groupId}`);
          socket.disconnect(true);
        }
      }
    }

    this.tempSocketMap.delete(tempUserId);

    this.logger.log(`Disconnected ${sockets.length} socket(s) for temp user ${tempUserId}`);
  }
}

import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

interface RevocationResult {
  revoked: boolean;
  sessionsTerminated: number;
  invitesRevoked: number;
  invalidationToken?: string;
}

@Injectable()
export class AccessRevocationEngine {
  private readonly logger = new Logger(AccessRevocationEngine.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async revokeMemberAccess(
    groupId: string,
    memberUserId: string,
    removedBy: string,
    reason?: string,
    socketServer?: Server,
  ): Promise<RevocationResult> {
    const invalidationToken = crypto.randomBytes(32).toString('hex');

    const activeInvites = await this.prisma.groupInvite.updateMany({
      where: {
        groupId,
        invitedBy: memberUserId,
        status: 'active',
      },
      data: {
        status: 'revoked',
        revokedAt: new Date(),
        revokedBy: removedBy,
      },
    });

    const sessionCount = await this.prisma.sessionRevocation.create({
      data: {
        userId: memberUserId,
        groupId,
        tokenJti: null,
        reason: reason || 'member_removed',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 86400000),
      },
    });

    if (socketServer) {
      socketServer.to(`user:${memberUserId}`).emit('accessRevoked', {
        groupId,
        reason: reason || 'You were removed from the group.',
        permanent: true,
        timestamp: new Date().toISOString(),
      });

      const sockets = await socketServer.fetchSockets();
      for (const socket of sockets) {
        const authed = socket as any;
        if (authed.userId === memberUserId) {
          socket.leave(`group:${groupId}`);
          socket.emit('forceDisconnect', {
            groupId,
            reason: 'Member access revoked',
          });
        }
      }
    }

    this.logger.warn(
      `Access revoked for user ${memberUserId} in group ${groupId} by ${removedBy}. ` +
        `Sessions terminated, ${activeInvites.count} invites revoked.`,
    );

    return {
      revoked: true,
      sessionsTerminated: 1,
      invitesRevoked: activeInvites.count,
      invalidationToken,
    };
  }

  async revokeGroupAccess(
    groupId: string,
    reason: string,
    socketServer?: Server,
  ): Promise<RevocationResult> {
    const members = await this.prisma.sharedGroupMember.findMany({
      where: { groupId, isActive: true },
      select: { userId: true },
    });

    const invitesRevoked = await this.prisma.groupInvite.updateMany({
      where: { groupId, status: 'active' },
      data: {
        status: 'revoked',
        revokedAt: new Date(),
        revokedBy: 'system',
      },
    });

    for (const m of members) {
      await this.prisma.sessionRevocation.create({
        data: {
          userId: m.userId,
          groupId,
          reason,
          revokedAt: new Date(),
          expiresAt: new Date(Date.now() + 90 * 86400000),
        },
      });

      if (socketServer) {
        socketServer.to(`user:${m.userId}`).emit('accessRevoked', {
          groupId,
          reason,
          permanent: true,
          timestamp: new Date().toISOString(),
        });
      }
    }

    if (socketServer) {
      const sockets = await socketServer.fetchSockets();
      let terminatedCount = 0;
      for (const socket of sockets) {
        const rooms = Array.from(socket.rooms || []);
        if (rooms.includes(`group:${groupId}`)) {
          socket.leave(`group:${groupId}`);
          socket.emit('forceDisconnect', { groupId, reason });
          terminatedCount++;
        }
      }

      this.logger.warn(
        `Group access revoked for ${groupId}. ${terminatedCount} sessions terminated, ` +
          `${invitesRevoked.count} invites revoked. Reason: ${reason}`,
      );

      return {
        revoked: true,
        sessionsTerminated: terminatedCount,
        invitesRevoked: invitesRevoked.count,
      };
    }

    return {
      revoked: true,
      sessionsTerminated: 0,
      invitesRevoked: invitesRevoked.count,
    };
  }

  async revokeInviteToken(token: string, revokedBy: string, socketServer?: Server): Promise<void> {
    const invite = await this.prisma.groupInvite.findUnique({
      where: { token },
    });
    if (!invite) {
      return;
    }

    await this.prisma.groupInvite.update({
      where: { id: invite.id },
      data: {
        status: 'revoked',
        revokedAt: new Date(),
        revokedBy,
      },
    });

    this.logger.warn(`Invite ${token} revoked by ${revokedBy}`);

    if (socketServer) {
      socketServer.to(`user:${revokedBy}`).emit('inviteRevoked', {
        groupId: invite.groupId,
        token,
      });
    }
  }

  async expireGuestSessions(groupId: string, socketServer?: Server): Promise<number> {
    const expired = await this.prisma.groupInvite.updateMany({
      where: {
        groupId,
        status: 'active',
        guestAccessExpiresAt: { lte: new Date() },
      },
      data: {
        status: 'expired',
      },
    });

    if (socketServer && expired.count > 0) {
      socketServer.to(`group:${groupId}`).emit('guestSessionsExpired', {
        groupId,
        message: 'Guest access has expired for some members.',
      });
    }

    if (expired.count > 0) {
      this.logger.log(`${expired.count} guest sessions expired for group ${groupId}`);
    }

    return expired.count;
  }

  async invalidateTemporaryToken(token: string): Promise<void> {
    await this.prisma.groupInvite.updateMany({
      where: { temporaryAccessToken: token, status: 'active' },
      data: { status: 'expired' },
    });
  }

  async isSessionRevoked(userId: string, groupId: string): Promise<boolean> {
    const revocation = await this.prisma.sessionRevocation.findFirst({
      where: {
        userId,
        groupId,
        expiresAt: { gte: new Date() },
      },
    });
    return !!revocation;
  }

  generateTemporaryAccessToken(): string {
    return crypto.randomBytes(48).toString('hex');
  }
}

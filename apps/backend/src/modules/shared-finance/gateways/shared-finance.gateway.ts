import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsException,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../common/prisma/prisma.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userName?: string;
}

@WebSocketGateway({
  cors: {
    origin:
      process.env.NODE_ENV === 'production'
        ? process.env.CORS_ORIGINS?.split(',') || ['https://dabbu.app']
        : '*',
    credentials: true,
  },
  namespace: '/shared-finance',
})
export class SharedFinanceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SharedFinanceGateway.name);
  private groupMembers = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    try {
      const token = client.handshake.auth?.token || client.handshake.query?.token;
      if (!token) {
        client.emit('error', 'Authentication required');
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token as string);
      client.userId = payload.sub;
      client.userName = payload.email || 'Unknown';

      client.join(`user:${payload.sub}`);

      // Only auto-join groups where the member is active and the group is accessible
      const memberships = await this.prisma.sharedGroupMember.findMany({
        where: { userId: payload.sub, isActive: true },
        select: {
          groupId: true,
          group: { select: { status: true } },
        },
      });

      for (const m of memberships) {
        // Don't auto-join CLOSED or ARCHIVED groups
        if (m.group.status === 'CLOSED' || m.group.status === 'ARCHIVED') {
          continue;
        }

        client.join(`group:${m.groupId}`);
        if (!this.groupMembers.has(m.groupId)) {
          this.groupMembers.set(m.groupId, new Set());
        }
        this.groupMembers.get(m.groupId)!.add(payload.sub);
      }

      this.logger.log(`SF Client connected: ${payload.email} (${client.id})`);
    } catch {
      client.emit('error', 'Invalid token');
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket): void {
    if (client.userId) {
      for (const [groupId, members] of this.groupMembers) {
        if (members.has(client.userId)) {
          members.delete(client.userId);
          if (members.size === 0) {
            this.groupMembers.delete(groupId);
          }
        }
      }
      this.logger.log(`SF Client disconnected: ${client.userId} (${client.id})`);
    }
  }

  // ─── Security Middleware ─────────────────────────────────────

  private async assertGroupAccess(groupId: string, userId?: string): Promise<void> {
    if (!userId) {
      throw new WsException('Unauthorized');
    }

    const group = await this.prisma.sharedGroup.findUnique({
      where: { id: groupId },
      select: { status: true },
    });
    if (!group) {
      throw new WsException('Group not found');
    }

    if (group.status === 'CLOSED') {
      throw new WsException('This group has been closed. Access revoked.');
    }

    const membership = await this.prisma.sharedGroupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
      select: { isActive: true },
    });
    if (!membership || !membership.isActive) {
      throw new WsException('You are no longer a member of this group.');
    }

    // Check for session revocation
    const revoked = await this.prisma.sessionRevocation.findFirst({
      where: {
        userId,
        groupId,
        expiresAt: { gte: new Date() },
      },
    });
    if (revoked) {
      throw new WsException('Your session has been revoked.');
    }
  }

  private async assertCanModifyGroup(groupId: string, userId?: string): Promise<void> {
    await this.assertGroupAccess(groupId, userId);

    const group = await this.prisma.sharedGroup.findUnique({
      where: { id: groupId },
      select: { status: true },
    });
    if (group && group.status !== 'ACTIVE') {
      throw new WsException(
        `Cannot modify group. Current status: ${group.status}. Group must be ACTIVE.`,
      );
    }
  }

  // ─── SubscribeMessage Handlers ──────────────────────────────

  @SubscribeMessage('joinGroup')
  async handleJoinGroup(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { groupId: string },
  ) {
    await this.assertGroupAccess(data.groupId, client.userId);

    client.join(`group:${data.groupId}`);

    if (!this.groupMembers.has(data.groupId)) {
      this.groupMembers.set(data.groupId, new Set());
    }
    this.groupMembers.get(data.groupId)!.add(client.userId!);

    this.server.to(`group:${data.groupId}`).emit('userJoined', {
      userId: client.userId,
      userName: client.userName,
    });

    return { success: true };
  }

  @SubscribeMessage('leaveGroup')
  handleLeaveGroup(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { groupId: string },
  ) {
    if (!client.userId) {
      throw new WsException('Unauthorized');
    }

    client.leave(`group:${data.groupId}`);

    const members = this.groupMembers.get(data.groupId);
    if (members) {
      members.delete(client.userId);
      if (members.size === 0) {
        this.groupMembers.delete(data.groupId);
      }
    }

    this.server.to(`group:${data.groupId}`).emit('userLeft', {
      userId: client.userId,
      userName: client.userName,
    });

    return { success: true };
  }

  @SubscribeMessage('newExpense')
  async handleNewExpense(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { groupId: string; expense: any },
  ) {
    await this.assertCanModifyGroup(data.groupId, client.userId);
    this.server.to(`group:${data.groupId}`).emit('expenseCreated', {
      expense: data.expense,
      createdBy: client.userId,
    });
  }

  @SubscribeMessage('updateBalance')
  async handleUpdateBalance(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { groupId: string; balances: any },
  ) {
    await this.assertGroupAccess(data.groupId, client.userId);
    this.server.to(`group:${data.groupId}`).emit('balanceUpdated', {
      balances: data.balances,
      updatedBy: client.userId,
    });
  }

  @SubscribeMessage('newSettlement')
  async handleNewSettlement(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { groupId: string; settlement: any },
  ) {
    await this.assertCanModifyGroup(data.groupId, client.userId);
    this.server.to(`group:${data.groupId}`).emit('settlementCreated', {
      settlement: data.settlement,
      createdBy: client.userId,
    });
  }

  @SubscribeMessage('newMessage')
  async handleNewMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { groupId: string; message: any },
  ) {
    await this.assertGroupAccess(data.groupId, client.userId);
    this.server.to(`group:${data.groupId}`).emit('messageCreated', {
      message: data.message,
      sentBy: client.userId,
    });
  }

  @SubscribeMessage('groupUpdated')
  async handleGroupUpdated(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { groupId: string; updates: any },
  ) {
    await this.assertCanModifyGroup(data.groupId, client.userId);
    this.server.to(`group:${data.groupId}`).emit('groupModified', {
      updates: data.updates,
      updatedBy: client.userId,
    });
  }

  getOnlineUsers(groupId: string): string[] {
    const members = this.groupMembers.get(groupId);
    return members ? Array.from(members) : [];
  }

  getServer(): Server {
    return this.server;
  }
}

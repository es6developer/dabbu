import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  OnGatewayConnection, OnGatewayDisconnect,
  ConnectedSocket, MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma/prisma.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  tempUserId?: string;
  userType?: 'full' | 'temp';
}

@WebSocketGateway({
  namespace: '/shared-finance',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class SharedFinanceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SharedFinanceGateway.name);
  private connectedSockets = new Map<string, AuthenticatedSocket>();
  private connectedUsers = new Map<string, Set<string>>();
  private connectedTempUsers = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        client.emit('error', { message: 'Authentication required' });
        client.disconnect();
        return;
      }

      const isTempToken = client.handshake.auth?.type === 'temp'
        || client.handshake.query?.type === 'temp';

      if (isTempToken) {
        await this.handleTempConnection(client, token);
      } else {
        await this.handleFullConnection(client, token);
      }
    } catch (error) {
      this.logger.warn(`Connection failed: ${(error as Error).message}`);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  private async handleFullConnection(client: AuthenticatedSocket, token: string) {
    const payload = this.jwtService.verify(token) as any;
    const userId: string = payload.sub || payload.id;

    const user = await this.prisma.user.findUnique({
      where: { id: userId, isActive: true, deletedAt: null },
    });
    if (!user) {
      client.emit('error', { message: 'User not found or inactive' });
      client.disconnect();
      return;
    }

    client.userId = userId;
    client.userType = 'full';

    const memberships = await this.prisma.groupMember.findMany({
      where: { userId, isActive: true, deletedAt: null },
      select: { groupId: true },
    });

    const activeGroupIds: string[] = [];
    for (const membership of memberships) {
      const group = await this.prisma.sharedFinanceGroup.findUnique({
        where: { id: membership.groupId },
        select: { id: true, status: true, deletedAt: true },
      });
      if (group && group.status === 'active' && !group.deletedAt) {
        client.join(`group:${group.id}`);
        activeGroupIds.push(group.id);
      }
    }

    if (!this.connectedUsers.has(userId)) {
      this.connectedUsers.set(userId, new Set());
    }
    this.connectedUsers.get(userId)!.add(client.id);
    this.connectedSockets.set(client.id, client);

    this.logger.log(`Full user ${userId} connected with ${activeGroupIds.length} groups`);
    client.emit('connected', { userId, userType: 'full', groups: activeGroupIds });
  }

  private async handleTempConnection(client: AuthenticatedSocket, token: string) {
    const tempUser = await this.prisma.tempUser.findFirst({
      where: {
        sessionToken: token,
        isActive: true,
        deletedAt: null,
        AND: [
          { sessionExpiresAt: null },
          { sessionExpiresAt: { gte: new Date() } },
        ],
      },
      include: {
        groupMemberships: {
          where: { isActive: true },
        },
      },
    });

    if (!tempUser) {
      client.emit('error', { message: 'Invalid or expired session' });
      client.disconnect();
      return;
    }

    client.tempUserId = tempUser.id;
    client.userType = 'temp';

    for (const membership of tempUser.groupMemberships) {
      const group = await this.prisma.sharedFinanceGroup.findUnique({
        where: { id: membership.groupId },
        select: { id: true, status: true, deletedAt: true },
      });
      if (group && group.status === 'active' && !group.deletedAt) {
        client.join(`group:${group.id}`);
      }
    }

    if (!this.connectedTempUsers.has(tempUser.id)) {
      this.connectedTempUsers.set(tempUser.id, new Set());
    }
    this.connectedTempUsers.get(tempUser.id)!.add(client.id);
    this.connectedSockets.set(client.id, client);

    await this.prisma.tempUser.update({
      where: { id: tempUser.id },
      data: {
        lastActiveAt: new Date(),
        sessionCount: { increment: 1 },
      },
    });

    this.logger.log(`Temp user ${tempUser.id} connected`);
    client.emit('connected', {
      tempUserId: tempUser.id,
      userType: 'temp',
      displayName: tempUser.displayName,
    });
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.connectedSockets.delete(client.id);

    if (client.userId) {
      const userSockets = this.connectedUsers.get(client.userId);
      if (userSockets) {
        userSockets.delete(client.id);
        if (userSockets.size === 0) {
          this.connectedUsers.delete(client.userId);
        }
      }
      this.logger.log(`Full user ${client.userId} disconnected`);
    }

    if (client.tempUserId) {
      const tempSockets = this.connectedTempUsers.get(client.tempUserId);
      if (tempSockets) {
        tempSockets.delete(client.id);
        if (tempSockets.size === 0) {
          this.connectedTempUsers.delete(client.tempUserId);
        }
      }
      this.logger.log(`Temp user ${client.tempUserId} disconnected`);
    }
  }

  private async validateGroupAccess(
    groupId: string,
    userId?: string,
    tempUserId?: string,
  ): Promise<{ allowed: boolean; reason?: string }> {
    const group = await this.prisma.sharedFinanceGroup.findUnique({
      where: { id: groupId },
      select: { id: true, status: true, deletedAt: true },
    });

    if (!group) {
      return { allowed: false, reason: 'Group not found' };
    }
    if (group.deletedAt) {
      return { allowed: false, reason: 'Group deleted' };
    }
    if (group.status !== 'active') {
      return { allowed: false, reason: `Group is ${group.status}` };
    }

    if (userId) {
      const membership = await this.prisma.groupMember.findFirst({
        where: {
          groupId,
          userId,
          isActive: true,
          deletedAt: null,
        },
        select: { role: true, leftAt: true },
      });
      if (!membership || membership.leftAt) {
        return { allowed: false, reason: 'Not an active group member' };
      }
    }

    if (tempUserId) {
      const tempMembership = await this.prisma.groupMemberTemp.findFirst({
        where: {
          groupId,
          tempUserId,
          isActive: true,
        },
        select: {
          canAddExpenses: true,
          canSettle: true,
          canChat: true,
          canUploadBills: true,
          leftAt: true,
        },
      });
      if (!tempMembership || tempMembership.leftAt) {
        return { allowed: false, reason: 'Not an active temp member' };
      }
    }

    return { allowed: true };
  }

  async checkGroupAccess(
    groupId: string,
    userId?: string,
    tempUserId?: string,
  ): Promise<{ allowed: boolean; reason?: string }> {
    return this.validateGroupAccess(groupId, userId, tempUserId);
  }

  async emitAccessRevoked(socketId: string, reason: string) {
    const socket = this.connectedSockets.get(socketId);
    if (socket?.connected) {
      socket.emit('access_revoked', { reason });
      socket.disconnect(true);
      this.connectedSockets.delete(socketId);
    }
  }

  async disconnectTempUser(tempUserId: string, reason: string) {
    const socketIds = this.connectedTempUsers.get(tempUserId);
    if (!socketIds) return;

    for (const socketId of socketIds) {
      await this.emitAccessRevoked(socketId, reason);
    }
    this.connectedTempUsers.delete(tempUserId);
  }

  async disconnectGroupTempUsers(groupId: string, reason: string) {
    const tempMemberships = await this.prisma.groupMemberTemp.findMany({
      where: { groupId, isActive: true },
      select: { tempUserId: true },
    });

    for (const tm of tempMemberships) {
      await this.disconnectTempUser(tm.tempUserId, reason);
    }
  }

  @SubscribeMessage('chat:send')
  async handleChatSend(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { groupId: string; content: string; messageType?: string; mediaUrl?: string; replyToId?: string },
  ) {
    const access = await this.validateGroupAccess(
      data.groupId,
      client.userId,
      client.tempUserId,
    );
    if (!access.allowed) {
      client.emit('error', { message: access.reason || 'Access denied' });
      return;
    }

    if (client.userType === 'temp' && client.tempUserId) {
      const tempMember = await this.prisma.groupMemberTemp.findFirst({
        where: { groupId: data.groupId, tempUserId: client.tempUserId, isActive: true },
        select: { canChat: true },
      });
      if (!tempMember?.canChat) {
        client.emit('error', { message: 'You do not have permission to chat' });
        return;
      }
    }

    const room = `group:${data.groupId}`;
    const chat = await this.prisma.groupChat.findUnique({
      where: { groupId: data.groupId },
    });
    if (!chat) return;

    const message = await this.prisma.groupChatMessage.create({
      data: {
        chatId: chat.id,
        senderId: client.userId || `temp:${client.tempUserId}`,
        content: data.content,
        messageType: data.messageType || 'text',
        mediaUrl: data.mediaUrl,
        replyToId: data.replyToId,
        readBy: client.userId ? [client.userId] : [],
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        replyTo: {
          include: {
            sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
      },
    });

    this.server.to(room).emit('chat:message', {
      ...message,
      _tempSenderId: client.tempUserId || undefined,
    });
  }

  @SubscribeMessage('chat:typing')
  async handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { groupId: string; isTyping: boolean },
  ) {
    const access = await this.validateGroupAccess(
      data.groupId,
      client.userId,
      client.tempUserId,
    );
    if (!access.allowed) return;

    client.to(`group:${data.groupId}`).emit('chat:typing', {
      userId: client.userId,
      tempUserId: client.tempUserId,
      userType: client.userType,
      isTyping: data.isTyping,
    });
  }

  @SubscribeMessage('expense:created')
  async handleExpenseCreated(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { groupId: string; expense: any },
  ) {
    const access = await this.validateGroupAccess(
      data.groupId,
      client.userId,
      client.tempUserId,
    );
    if (!access.allowed) {
      client.emit('error', { message: access.reason || 'Access denied' });
      return;
    }

    if (client.userType === 'temp' && client.tempUserId) {
      const tempMember = await this.prisma.groupMemberTemp.findFirst({
        where: { groupId: data.groupId, tempUserId: client.tempUserId, isActive: true },
        select: { canAddExpenses: true },
      });
      if (!tempMember?.canAddExpenses) {
        client.emit('error', { message: 'You do not have permission to add expenses' });
        return;
      }
    }

    this.server.to(`group:${data.groupId}`).emit('expense:created', data.expense);
  }

  @SubscribeMessage('expense:updated')
  async handleExpenseUpdated(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { groupId: string; expense: any },
  ) {
    const access = await this.validateGroupAccess(
      data.groupId,
      client.userId,
      client.tempUserId,
    );
    if (!access.allowed) {
      client.emit('error', { message: access.reason || 'Access denied' });
      return;
    }
    this.server.to(`group:${data.groupId}`).emit('expense:updated', data.expense);
  }

  @SubscribeMessage('expense:deleted')
  async handleExpenseDeleted(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { groupId: string; expenseId: string },
  ) {
    const access = await this.validateGroupAccess(
      data.groupId,
      client.userId,
      client.tempUserId,
    );
    if (!access.allowed) {
      client.emit('error', { message: access.reason || 'Access denied' });
      return;
    }
    this.server.to(`group:${data.groupId}`).emit('expense:deleted', { expenseId: data.expenseId });
  }

  @SubscribeMessage('settlement:created')
  async handleSettlementCreated(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { groupId: string; settlement: any },
  ) {
    const access = await this.validateGroupAccess(
      data.groupId,
      client.userId,
      client.tempUserId,
    );
    if (!access.allowed) {
      client.emit('error', { message: access.reason || 'Access denied' });
      return;
    }

    if (client.userType === 'temp' && client.tempUserId) {
      const tempMember = await this.prisma.groupMemberTemp.findFirst({
        where: { groupId: data.groupId, tempUserId: client.tempUserId, isActive: true },
        select: { canSettle: true },
      });
      if (!tempMember?.canSettle) {
        client.emit('error', { message: 'You do not have permission to create settlements' });
        return;
      }
    }

    this.server.to(`group:${data.groupId}`).emit('settlement:created', data.settlement);
  }

  @SubscribeMessage('settlement:updated')
  async handleSettlementUpdated(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { groupId: string; settlement: any },
  ) {
    const access = await this.validateGroupAccess(
      data.groupId,
      client.userId,
      client.tempUserId,
    );
    if (!access.allowed) {
      client.emit('error', { message: access.reason || 'Access denied' });
      return;
    }
    this.server.to(`group:${data.groupId}`).emit('settlement:updated', data.settlement);
  }

  emitToGroup(groupId: string, event: string, data: any) {
    this.server.to(`group:${groupId}`).emit(event, data);
  }

  emitToUser(userId: string, event: string, data: any) {
    const userSockets = this.connectedUsers.get(userId);
    if (userSockets) {
      for (const socketId of userSockets) {
        this.server.to(socketId).emit(event, data);
      }
    }
  }

  emitToTempUser(tempUserId: string, event: string, data: any) {
    const tempSockets = this.connectedTempUsers.get(tempUserId);
    if (tempSockets) {
      for (const socketId of tempSockets) {
        this.server.to(socketId).emit(event, data);
      }
    }
  }

  private extractToken(client: Socket): string | null {
    const auth = client.handshake.auth?.token;
    if (auth) return auth;

    const header = client.handshake.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      return header.slice(7);
    }

    const query = client.handshake.query?.token;
    if (typeof query === 'string') return query;

    return null;
  }
}

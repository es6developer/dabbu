import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  OnGatewayConnection, OnGatewayDisconnect, WsException,
  ConnectedSocket, MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma/prisma.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userName?: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? process.env.CORS_ORIGINS?.split(',') || ['https://dabbu.app']
      : '*',
    credentials: true,
  },
  namespace: '/ws/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private onlineUsers = new Map<string, Set<string>>(); // userId -> Set<socketId>

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

      // Track online status
      if (!this.onlineUsers.has(payload.sub)) {
        this.onlineUsers.set(payload.sub, new Set());
      }
      this.onlineUsers.get(payload.sub)!.add(client.id);

      // Join user to their personal room
      client.join(`user:${payload.sub}`);

      // Join user's family rooms
      const families = await this.prisma.familyMember.findMany({
        where: { userId: payload.sub },
        select: { familyId: true },
      });

      for (const fam of families) {
        client.join(`family:${fam.familyId}`);
      }

      // Broadcast online status
      this.broadcastUserStatus(payload.sub, true);

      this.logger.log(`Client connected: ${payload.email} (${client.id})`);
    } catch {
      client.emit('error', 'Invalid token');
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket): void {
    if (client.userId) {
      const sockets = this.onlineUsers.get(client.userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.onlineUsers.delete(client.userId);
          this.broadcastUserStatus(client.userId, false);
        }
      }
      this.logger.log(`Client disconnected: ${client.userId} (${client.id})`);
    }
  }

  // ─── Messages ────────────────────────────────────
  @SubscribeMessage('message:send')
  async handleMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string; content: string; messageType?: string; replyToId?: string },
  ) {
    if (!client.userId) throw new WsException('Unauthorized');

    const message = await this.prisma.chatMessage.create({
      data: {
        chatId: data.chatId,
        senderId: client.userId,
        content: data.content,
        messageType: data.messageType || 'text',
        replyToId: data.replyToId,
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        replyTo: {
          include: {
            sender: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    this.server.to(`chat:${data.chatId}`).emit('message:new', message);
    return message;
  }

  @SubscribeMessage('message:react')
  async handleReaction(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: string; emoji: string },
  ) {
    if (!client.userId) throw new WsException('Unauthorized');

    const message = await this.prisma.chatMessage.findUnique({
      where: { id: data.messageId },
      select: { chatId: true, metadata: true },
    });

    if (!message) throw new WsException('Message not found');

    const reactions = (message.metadata as { reactions?: Record<string, string[]> } | null)?.reactions || {};
    const emoji = data.emoji;
    const users = reactions[emoji] || [];

    const idx = users.indexOf(client.userId);
    if (idx > -1) {
      users.splice(idx, 1);
      if (users.length === 0) delete reactions[emoji];
    } else {
      users.push(client.userId);
      reactions[emoji] = users;
    }

    await this.prisma.chatMessage.update({
      where: { id: data.messageId },
      data: { metadata: { ...(message.metadata as object || {}), reactions } },
    });

    this.server.to(`chat:${message.chatId}`).emit('message:reaction', {
      messageId: data.messageId,
      reactions,
      userId: client.userId,
      emoji,
    });
  }

  @SubscribeMessage('message:pin')
  async handlePinMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: string; chatId: string },
  ) {
    if (!client.userId) throw new WsException('Unauthorized');

    const message = await this.prisma.chatMessage.findUnique({
      where: { id: data.messageId },
    });
    if (!message) throw new WsException('Message not found');

    const metadata = (message.metadata as { isPinned?: boolean } | null) || {};
    metadata.isPinned = !metadata.isPinned;

    await this.prisma.chatMessage.update({
      where: { id: data.messageId },
      data: { metadata },
    });

    this.server.to(`chat:${data.chatId}`).emit('message:pinned', {
      messageId: data.messageId,
      isPinned: metadata.isPinned,
    });
  }

  // ─── Typing ──────────────────────────────────────
  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string },
  ) {
    if (!client.userId) return;
    client.to(`chat:${data.chatId}`).emit('typing:update', {
      chatId: data.chatId,
      userId: client.userId,
      userName: client.userName,
      isTyping: true,
    });
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string },
  ) {
    if (!client.userId) return;
    client.to(`chat:${data.chatId}`).emit('typing:update', {
      chatId: data.chatId,
      userId: client.userId,
      isTyping: false,
    });
  }

  // ─── Read Receipts ───────────────────────────────
  @SubscribeMessage('messages:read')
  async handleReadReceipt(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string; messageIds: string[] },
  ) {
    if (!client.userId) return;

    await this.prisma.chatMessage.updateMany({
      where: { id: { in: data.messageIds }, chatId: data.chatId, senderId: { not: client.userId } },
      data: { isRead: true, readAt: new Date() },
    });

    this.server.to(`chat:${data.chatId}`).emit('messages:read-receipt', {
      messageIds: data.messageIds,
      readBy: client.userId,
    });
  }

  // ─── Presence ────────────────────────────────────
  @SubscribeMessage('presence:subscribe')
  handlePresenceSubscribe(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { userIds: string[] },
  ) {
    const onlineStatuses: Record<string, boolean> = {};
    for (const uid of data.userIds) {
      onlineStatuses[uid] = this.onlineUsers.has(uid);
    }
    client.emit('presence:status', onlineStatuses);
  }

  // ─── Family Chat ─────────────────────────────────
  @SubscribeMessage('family:join')
  async handleJoinFamilyChat(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { familyId: string },
  ) {
    const member = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId: data.familyId, userId: client.userId! } },
    });
    if (member) {
      client.join(`family:${data.familyId}`);
    }
  }

  // ─── Helpers ─────────────────────────────────────
  private broadcastUserStatus(userId: string, isOnline: boolean): void {
    this.server.emit('presence:change', { userId, isOnline });
  }
}

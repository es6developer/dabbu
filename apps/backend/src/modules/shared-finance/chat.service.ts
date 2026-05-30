import {
  Injectable, NotFoundException, ForbiddenException, Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SendMessageDto, MessageType } from './dto/chat.dto';

const userSelect = { id: true, firstName: true, lastName: true, avatarUrl: true } as const;

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateChat(groupId: string) {
    let chat = await this.prisma.groupChat.findUnique({
      where: { groupId },
    });

    if (!chat) {
      chat = await this.prisma.groupChat.create({
        data: { groupId },
      });
    }

    return chat;
  }

  async sendMessage(groupId: string, userId: string, dto: SendMessageDto) {
    await this.validateGroupMember(groupId, userId);

    const chat = await this.getOrCreateChat(groupId);

    const message = await this.prisma.groupChatMessage.create({
      data: {
        chatId: chat.id,
        senderId: userId,
        content: dto.content,
        messageType: dto.messageType || MessageType.TEXT,
        mediaUrl: dto.mediaUrl,
        replyToId: dto.replyToId,
        readBy: [userId],
      },
      include: {
        sender: { select: userSelect },
        replyTo: {
          include: {
            sender: { select: userSelect },
          },
        },
      },
    });

    this.logger.log(`Chat message sent in group ${groupId} by user ${userId}`);
    return message;
  }

  async getMessages(
    groupId: string,
    userId: string,
    query?: { before?: string; after?: string; limit?: number },
  ) {
    await this.validateGroupMember(groupId, userId);

    const chat = await this.getOrCreateChat(groupId);

    const where: any = { chatId: chat.id };
    if (query?.before) {
      where.createdAt = { lt: new Date(query.before) };
    } else if (query?.after) {
      where.createdAt = { gt: new Date(query.after) };
    }

    const limit = Math.min(query?.limit || 50, 100);

    const messages = await this.prisma.groupChatMessage.findMany({
      where,
      include: {
        sender: { select: userSelect },
        replyTo: {
          include: {
            sender: { select: userSelect },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const total = await this.prisma.groupChatMessage.count({ where: { chatId: chat.id } });

    return {
      data: messages.reverse(),
      total,
      hasMore: messages.length === limit,
    };
  }

  async markAsRead(groupId: string, messageId: string, userId: string) {
    await this.validateGroupMember(groupId, userId);

    const message = await this.prisma.groupChatMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const readBy: string[] = (message.readBy as string[]) || [];
    if (!readBy.includes(userId)) {
      readBy.push(userId);
      await this.prisma.groupChatMessage.update({
        where: { id: messageId },
        data: { readBy },
      });
    }

    return { success: true };
  }

  async getUnreadCount(groupId: string, userId: string) {
    await this.validateGroupMember(groupId, userId);

    const chat = await this.getOrCreateChat(groupId);

    const allMessages = await this.prisma.groupChatMessage.findMany({
      where: { chatId: chat.id, senderId: { not: userId } },
      select: { readBy: true },
    });

    const count = allMessages.filter((m) => {
      const readers = (m.readBy as string[]) || [];
      return !readers.includes(userId);
    }).length;

    const lastMessage = await this.prisma.groupChatMessage.findFirst({
      where: { chatId: chat.id },
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: userSelect },
      },
    });

    return { count, lastMessage };
  }

  async createSystemMessage(groupId: string, content: string) {
    const chat = await this.getOrCreateChat(groupId);

    const message = await this.prisma.groupChatMessage.create({
      data: {
        chatId: chat.id,
        senderId: 'system',
        content,
        messageType: MessageType.SYSTEM,
        readBy: [],
      },
    });

    this.logger.log(`System message created in group ${groupId}`);
    return message;
  }

  async createExpenseMessage(groupId: string, userId: string, content: string) {
    const chat = await this.getOrCreateChat(groupId);

    const message = await this.prisma.groupChatMessage.create({
      data: {
        chatId: chat.id,
        senderId: userId,
        content,
        messageType: MessageType.EXPENSE,
        readBy: [userId],
      },
    });

    return message;
  }

  async createSettlementMessage(groupId: string, userId: string, content: string) {
    const chat = await this.getOrCreateChat(groupId);

    const message = await this.prisma.groupChatMessage.create({
      data: {
        chatId: chat.id,
        senderId: userId,
        content,
        messageType: MessageType.SETTLEMENT,
        readBy: [userId],
      },
    });

    return message;
  }

  private async validateGroupMember(groupId: string, userId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (member && member.isActive && !member.deletedAt) {
      return member;
    }
    const tempMember = await this.prisma.groupMemberTemp.findUnique({
      where: { groupId_tempUserId: { groupId, tempUserId: userId } },
    });
    if (!tempMember || !tempMember.isActive) {
      throw new ForbiddenException('Not a group member');
    }
    return tempMember;
  }
}

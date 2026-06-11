import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createChat(userId: string, title: string, type: string, participantIds: string[]) {
    const allIds = [...new Set([userId, ...participantIds])];

    const chat = await this.prisma.chat.create({
      data: {
        title,
        type,
        createdBy: userId,
        participants: {
          create: allIds.map((id) => ({ userId: id })),
        },
      },
      include: {
        participants: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
      },
    });

    return chat;
  }

  async getUserChats(userId: string) {
    const participants = await this.prisma.chatParticipant.findMany({
      where: { userId, isActive: true },
      include: {
        chat: {
          include: {
            participants: {
              include: {
                user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
              },
            },
            messages: {
              take: 1,
              orderBy: { createdAt: 'desc' },
              include: {
                sender: { select: { id: true, firstName: true, lastName: true } },
              },
            },
            _count: {
              select: {
                messages: {
                  where: { isRead: false, senderId: { not: userId } },
                },
              },
            },
          },
        },
      },
      orderBy: {
        chat: { updatedAt: 'desc' },
      },
    });

    return participants.map((p) => p.chat);
  }

  async getChatMessages(chatId: string, userId: string, page = 1, limit = 50) {
    const participant = await this.prisma.chatParticipant.findUnique({
      where: { chatId_userId: { chatId, userId } },
    });

    if (!participant) {throw new NotFoundException('Chat not found');}

    const messages = await this.prisma.chatMessage.findMany({
      where: { chatId },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        replyTo: {
          include: {
            sender: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    const total = await this.prisma.chatMessage.count({ where: { chatId } });

    return { messages: messages.reverse(), total, page, limit };
  }

  async markChatAsRead(chatId: string, userId: string) {
    await this.prisma.chatMessage.updateMany({
      where: { chatId, senderId: { not: userId }, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }
}

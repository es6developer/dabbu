import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async search(query: string, excludeUserId: string) {
    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        status: 'active',
        id: { not: excludeUserId },
        OR: [
          { email: { contains: query, mode: 'insensitive' } },
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          ...(query.includes('@') ? [] : [{ phone: { contains: query } }]),
        ],
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        phone: true,
      },
      take: 20,
    });
    return users;
  }

  async updateProfile(userId: string, data: { firstName?: string; lastName?: string; phone?: string }) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        phone: true,
        role: true,
      },
    });
    return user;
  }

  async syncContacts(userId: string, hashes: string[]) {
    if (!hashes.length) {
      return { matched: [] };
    }
    const matches = await this.prisma.contactHash.findMany({
      where: {
        hash: { in: hashes },
        userId: { not: userId },
      },
      select: {
        userId: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
      distinct: ['userId'],
    });
    const isFriendMap = new Map<string, boolean>();
    if (matches.length > 0) {
      const friendIds = matches.map((m) => m.userId);
      const existingFriends = await this.prisma.friend.findMany({
        where: {
          userId,
          friendId: { in: friendIds },
        },
        select: { friendId: true, status: true },
      });
      const incomingRequests = await this.prisma.friend.findMany({
        where: {
          friendId: userId,
          userId: { in: friendIds },
        },
        select: { userId: true, status: true },
      });
      for (const f of existingFriends) {
        isFriendMap.set(f.friendId, f.status === 'accepted');
      }
      for (const f of incomingRequests) {
        if (!isFriendMap.has(f.userId)) {
          isFriendMap.set(f.userId, f.status === 'accepted');
        }
      }
    }
    const matched = matches.map((m) => ({
      userId: m.userId,
      name: `${m.user.firstName} ${m.user.lastName}`.trim(),
      email: m.user.email,
      avatarUrl: m.user.avatarUrl,
      isFriend: isFriendMap.get(m.userId) || false,
    }));
    return { matched };
  }
}

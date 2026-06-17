import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async validateUpi(upiId: string) {
    if (!upiId || !/^[\w.-]+@[\w.-]+$/.test(upiId)) {
      throw new BadRequestException('Invalid UPI format');
    }
    try {
      const res = await fetch(
        `https://paydigi.airtel.in/web/pg-service/v1/validate/vpa/${encodeURIComponent(upiId)}`,
        {
          headers: {
            Accept: 'application/json, text/plain, */*',
            Origin: 'https://www.airtel.in',
            Referer: 'https://www.airtel.in/',
            'Accept-Language': 'en-US,en;q=0.9',
          },
        },
      );
      const json = await res.json();
      const data = json?.data;
      if (data?.vpaValid) {
        return { valid: true, name: data.payeeAccountName || null, vpa: data.vpa };
      }
      return { valid: false, name: null, vpa: upiId, error: data?.errorMessage || 'Invalid UPI ID' };
    } catch (e: any) {
      this.logger.error(`UPI validation failed for ${upiId}: ${e.message}`);
      return { valid: false, name: null, vpa: upiId, error: 'Validation service unavailable' };
    }
  }

  async search(query: string, excludeUserId: string) {
    const digits = query.replace(/\D/g, '');
    const where: any = {
      isActive: true,
      status: 'active',
      id: { not: excludeUserId },
      OR: [
        { email: { contains: query } },
        { firstName: { contains: query } },
        { lastName: { contains: query } },
      ],
    };

    if (digits.length >= 3) {
      const last10 = digits.slice(-10);
      where.OR.push({ phone: { endsWith: last10 } }, { phone: { contains: digits } });
    }

    const users = await this.prisma.user.findMany({
      where,
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

  async updateProfile(
    userId: string,
    data: { firstName?: string; lastName?: string; phone?: string; upiId?: string },
  ) {
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
        upiId: true,
      },
    });
    return user;
  }

  async matchContacts(userId: string, phones: string[]) {
    if (!phones.length) {
      return [];
    }
    const conditions = phones.map((p) => {
      const digits = p.replace(/\D/g, '').slice(-10);
      return { phone: { endsWith: digits } };
    });
    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        status: 'active',
        id: { not: userId },
        OR: conditions,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        phone: true,
      },
    });
    return users.map((u) => ({
      userId: u.id,
      name: `${u.firstName} ${u.lastName}`.trim() || u.email,
      email: u.email,
      phone: u.phone?.replace(/\D/g, '').slice(-10) || '',
      avatarUrl: u.avatarUrl,
      isFriend: false,
      isAppUser: true,
    }));
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

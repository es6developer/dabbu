import { Injectable, Logger, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class FriendsService {
  private readonly logger = new Logger(FriendsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async sendRequest(userId: string, friendId: string) {
    if (userId === friendId) {
      throw new BadRequestException('Cannot add yourself as a friend');
    }
    const friend = await this.prisma.user.findUnique({ where: { id: friendId, isActive: true, status: 'active' } });
    if (!friend) {
      throw new NotFoundException('User not found');
    }
    const existing = await this.prisma.friend.findUnique({
      where: { userId_friendId: { userId, friendId } },
    });
    if (existing) {
      if (existing.status === 'accepted') {
        throw new ConflictException('Already friends');
      }
      if (existing.status === 'pending') {
        throw new ConflictException('Friend request already sent');
      }
      if (existing.status === 'blocked') {
        throw new BadRequestException('Cannot send friend request');
      }
    }
    const reverse = await this.prisma.friend.findUnique({
      where: { userId_friendId: { userId: friendId, friendId: userId } },
    });
    if (reverse?.status === 'blocked') {
      throw new BadRequestException('Cannot send friend request');
    }
    if (reverse?.status === 'pending') {
      await this.prisma.friend.update({
        where: { userId_friendId: { userId: friendId, friendId: userId } },
        data: { status: 'accepted' },
      });
      await this.prisma.friend.create({
        data: { userId, friendId, status: 'accepted' },
      });
      return { status: 'accepted' };
    }
    await this.prisma.friend.create({
      data: { userId, friendId, status: 'pending' },
    });
    return { status: 'pending' };
  }

  async acceptRequest(userId: string, requestId: string) {
    const request = await this.prisma.friend.findUnique({ where: { id: requestId } });
    if (!request) {
      throw new NotFoundException('Friend request not found');
    }
    if (request.friendId !== userId) {
      throw new BadRequestException('Not your friend request to accept');
    }
    if (request.status !== 'pending') {
      throw new BadRequestException('Friend request is not pending');
    }
    await this.prisma.friend.update({
      where: { id: requestId },
      data: { status: 'accepted' },
    });
    await this.prisma.friend.create({
      data: { userId, friendId: request.userId, status: 'accepted' },
    });
    return { status: 'accepted' };
  }

  async rejectRequest(userId: string, requestId: string) {
    const request = await this.prisma.friend.findUnique({ where: { id: requestId } });
    if (!request) {
      throw new NotFoundException('Friend request not found');
    }
    if (request.friendId !== userId) {
      throw new BadRequestException('Not your friend request');
    }
    await this.prisma.friend.delete({ where: { id: requestId } });
    return { status: 'rejected' };
  }

  async removeFriend(userId: string, friendId: string) {
    await this.prisma.friend.deleteMany({
      where: {
        OR: [
          { userId, friendId },
          { userId: friendId, friendId: userId },
        ],
      },
    });
    return { status: 'removed' };
  }

  async listFriends(userId: string) {
    const friends = await this.prisma.friend.findMany({
      where: { userId, status: 'accepted' },
      include: {
        friend: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return friends.map((f) => ({
      id: f.id,
      userId: f.friend.id,
      name: `${f.friend.firstName} ${f.friend.lastName}`.trim(),
      email: f.friend.email,
      avatarUrl: f.friend.avatarUrl,
      phone: f.friend.phone,
      createdAt: f.createdAt,
    }));
  }

  async listRequests(userId: string) {
    const requests = await this.prisma.friend.findMany({
      where: { friendId: userId, status: 'pending' },
      include: {
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
      orderBy: { createdAt: 'desc' },
    });
    return requests.map((r) => ({
      id: r.id,
      userId: r.user.id,
      name: `${r.user.firstName} ${r.user.lastName}`.trim(),
      email: r.user.email,
      avatarUrl: r.user.avatarUrl,
      createdAt: r.createdAt,
    }));
  }
}

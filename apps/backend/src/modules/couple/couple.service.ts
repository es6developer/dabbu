import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class CoupleService {
  private readonly logger = new Logger(CoupleService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly notificationService?: NotificationService,
  ) {}

  async sendRequest(userId: string, phone: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.isCouple) throw new ConflictException('You are already in a couple');

    const digits = phone.replace(/\D/g, '').slice(-10);
    const receiver = await this.prisma.user.findFirst({
      where: { phone: { endsWith: digits }, isActive: true },
    });
    if (!receiver) throw new NotFoundException('No user found with that phone number');
    if (receiver.id === userId) throw new BadRequestException('Cannot send request to yourself');
    if (receiver.isCouple) throw new ConflictException('This user is already in a couple');

    const existing = await this.prisma.coupleRequest.findUnique({
      where: { senderId_receiverId: { senderId: userId, receiverId: receiver.id } },
    });
    if (existing && existing.status === 'pending')
      throw new ConflictException('Request already sent. Waiting for approval.');
    if (existing && existing.status === 'approved')
      throw new ConflictException('You are already connected with this user');

    const request = await this.prisma.coupleRequest.upsert({
      where: { senderId_receiverId: { senderId: userId, receiverId: receiver.id } },
      update: { status: 'pending' },
      create: { senderId: userId, receiverId: receiver.id, status: 'pending' },
    });

    this.notificationService?.sendPush(
      receiver.id,
      'Couple Request',
      `${user.firstName} wants to connect with you!`,
      { type: 'couple_request', requestId: request.id },
    ).catch(() => {});

    return {
      message: 'Couple request sent! Waiting for approval.',
      receiver: { id: receiver.id, firstName: receiver.firstName, lastName: receiver.lastName, phone: receiver.phone },
    };
  }

  async approveRequest(userId: string, requestId: string) {
    const request = await this.prisma.coupleRequest.findUnique({
      where: { id: requestId },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, isCouple: true } },
        receiver: { select: { id: true, firstName: true, lastName: true, isCouple: true } },
      },
    });
    if (!request) throw new NotFoundException('Request not found');
    if (request.receiverId !== userId) throw new BadRequestException('This request was not sent to you');
    if (request.status !== 'pending') throw new BadRequestException('Request is no longer pending');
    if (request.sender.isCouple || request.receiver.isCouple)
      throw new ConflictException('One of the users is already in a couple');

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.coupleRequest.update({ where: { id: requestId }, data: { status: 'approved' } });

      await tx.user.update({
        where: { id: request.senderId },
        data: { partnerId: request.receiverId, isCouple: true, isCoupleMode: true, partnerLinkedAt: now },
      });
      await tx.user.update({
        where: { id: request.receiverId },
        data: { partnerId: request.senderId, isCouple: true, isCoupleMode: true, partnerLinkedAt: now },
      });

      const existing = await (tx as any).couple.findFirst({
        where: {
          OR: [
            { partner1Id: request.senderId, partner2Id: request.receiverId },
            { partner1Id: request.receiverId, partner2Id: request.senderId },
          ],
        },
      });
      if (!existing) {
        await (tx as any).couple.create({
          data: {
            partner1Id: request.senderId,
            partner2Id: request.receiverId,
            status: 'active',
            linkedAt: now,
          },
        });
      }
    });

    const updatedUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, firstName: true, lastName: true, avatarUrl: true, role: true,
        isCouple: true, isCoupleMode: true, partnerLinkedAt: true,
        partner: { select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });

    this.notificationService?.sendPush(
      request.senderId,
      'Request Approved',
      `${request.receiver.firstName} accepted your couple request!`,
      { type: 'couple_approved', screen: 'Dashboard' },
    ).catch(() => {});

    return { message: 'You are now connected!', user: updatedUser };
  }

  async rejectRequest(userId: string, requestId: string) {
    const request = await this.prisma.coupleRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Request not found');
    if (request.receiverId !== userId) throw new BadRequestException('This request was not sent to you');
    if (request.status !== 'pending') throw new BadRequestException('Request is no longer pending');
    await this.prisma.coupleRequest.update({ where: { id: requestId }, data: { status: 'rejected' } });
    return { message: 'Request rejected' };
  }

  async cancelRequest(userId: string, requestId: string) {
    const request = await this.prisma.coupleRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Request not found');
    if (request.senderId !== userId) throw new BadRequestException('You can only cancel your own requests');
    await this.prisma.coupleRequest.delete({ where: { id: requestId } });
    return { message: 'Request cancelled' };
  }

  async listRequests(userId: string) {
    const [sent, received] = await Promise.all([
      this.prisma.coupleRequest.findMany({
        where: { senderId: userId },
        include: { receiver: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatarUrl: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.coupleRequest.findMany({
        where: { receiverId: userId },
        include: { sender: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatarUrl: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { sent, received };
  }

  async toggleMode(userId: string, isCoupleMode: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (!user.isCouple) throw new BadRequestException('You are not in a couple');
    return this.prisma.user.update({
      where: { id: userId },
      data: { isCoupleMode },
      select: { id: true, isCouple: true, isCoupleMode: true },
    });
  }

  async getStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, isCouple: true, isCoupleMode: true, partnerLinkedAt: true,
        partner: { select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true, isCoupleMode: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');

    let couple = await (this.prisma as any).couple.findFirst({
      where: {
        OR: [
          { partner1Id: userId },
          { partner2Id: userId },
        ],
        status: 'active',
      },
      select: { id: true, linkedAt: true, createdAt: true },
    });

    return { ...user, couple };
  }

  async removePartner(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isCouple: true, partnerId: true },
    });
    if (!user || !user.isCouple || !user.partnerId) throw new BadRequestException('You are not in a couple');

    await this.prisma.$transaction(async (tx) => {
      await (tx as any).couple.updateMany({
        where: {
          OR: [
            { partner1Id: userId, partner2Id: user.partnerId! },
            { partner1Id: user.partnerId!, partner2Id: userId },
          ],
        },
        data: { status: 'disconnected' },
      });
      await tx.user.update({
        where: { id: userId },
        data: { partnerId: null, isCouple: false, isCoupleMode: false, partnerLinkedAt: null },
      });
      await tx.user.update({
        where: { id: user.partnerId! },
        data: { partnerId: null, isCouple: false, isCoupleMode: false, partnerLinkedAt: null },
      });
    });

    return { message: 'Couple relationship removed' };
  }

  async createInviteCode(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.isCouple) throw new ConflictException('You are already in a couple');

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const invite = await this.prisma.coupleInviteCode.create({
      data: {
        senderId: userId,
        code,
        expiredAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    return { inviteCode: invite.code, expiresIn: '30 minutes' };
  }

  async joinWithCode(userId: string, code: string) {
    const invite = await this.prisma.coupleInviteCode.findFirst({
      where: { code: code.toUpperCase(), status: 'active', expiredAt: { gte: new Date() } },
    });
    if (!invite) throw new BadRequestException('Invalid or expired invite code');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.isCouple) throw new ConflictException('You are already in a couple');

    const sender = await this.prisma.user.findUnique({ where: { id: invite.senderId } });
    if (!sender || sender.isCouple) throw new BadRequestException('Inviter is no longer available');

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.coupleInviteCode.update({
        where: { id: invite.id },
        data: { status: 'used', usedById: userId, usedAt: now },
      });
      await tx.user.update({
        where: { id: invite.senderId },
        data: { partnerId: userId, isCouple: true, isCoupleMode: true, partnerLinkedAt: now },
      });
      await tx.user.update({
        where: { id: userId },
        data: { partnerId: invite.senderId, isCouple: true, isCoupleMode: true, partnerLinkedAt: now },
      });

      const existing = await (tx as any).couple.findFirst({
        where: {
          OR: [
            { partner1Id: invite.senderId, partner2Id: userId },
            { partner1Id: userId, partner2Id: invite.senderId },
          ],
        },
      });
      if (!existing) {
        await (tx as any).couple.create({
          data: { partner1Id: invite.senderId, partner2Id: userId, status: 'active', linkedAt: now },
        });
      }
    });

    return { message: 'Successfully joined couple space' };
  }

  async findCoupleGroup(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isCouple: true, partnerId: true, partner: { select: { id: true, firstName: true } } },
    });
    if (!user?.partnerId) throw new NotFoundException('Couple not found');

    const couple = await (this.prisma as any).couple.findFirst({
      where: {
        OR: [
          { partner1Id: userId, partner2Id: user.partnerId },
          { partner1Id: user.partnerId, partner2Id: userId },
        ],
        status: 'active',
      },
    });

    if (!couple) throw new NotFoundException('Couple not found');

    return couple;
  }

  async getCoupleDashboard(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isCouple: true, isCoupleMode: true, partnerId: true, partnerLinkedAt: true, firstName: true, lastName: true, avatarUrl: true },
    });
    if (!user?.partnerId) throw new NotFoundException('Not in a couple');

    const [partner, couple] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: user.partnerId },
        select: { id: true, firstName: true, lastName: true, avatarUrl: true },
      }),
      (this.prisma as any).couple.findFirst({
        where: {
          OR: [
            { partner1Id: userId, partner2Id: user.partnerId },
            { partner1Id: user.partnerId, partner2Id: userId },
          ],
          status: 'active',
        },
      }),
    ]);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const userIds = [userId, user.partnerId];

    const [partnerTransactions, userTransactions, partnerGoals, userGoals, userBills] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { userId: user.partnerId, deletedAt: null, date: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { userId, deletedAt: null, date: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      this.prisma.goal.aggregate({
        where: { userId: user.partnerId, deletedAt: null, isCompleted: false },
        _sum: { currentAmount: true, targetAmount: true },
      }),
      this.prisma.goal.aggregate({
        where: { userId, deletedAt: null, isCompleted: false },
        _sum: { currentAmount: true, targetAmount: true },
      }),
      this.prisma.bill.findMany({
        where: { userId, deletedAt: null, isPaid: false, dueDate: { gte: now } },
        take: 5,
        orderBy: { dueDate: 'asc' },
        select: { id: true, name: true, amount: true, dueDate: true, category: true },
      }),
    ]);

    const partnerAmount = Number(partnerTransactions._sum.amount || 0);
    const userAmount = Number(userTransactions._sum.amount || 0);
    const partnerGoalsProgress = Number(partnerGoals._sum.currentAmount || 0);
    const partnerGoalsTarget = Number(partnerGoals._sum.targetAmount || 0);
    const userGoalsProgress = Number(userGoals._sum.currentAmount || 0);
    const userGoalsTarget = Number(userGoals._sum.targetAmount || 0);

    return {
      partner: { ...partner, monthlySpent: partnerAmount, monthlyIncome: partnerAmount > 0 ? partnerAmount : 0 },
      user: { ...user, monthlySpent: userAmount, monthlyIncome: userAmount > 0 ? userAmount : 0 },
      couple: couple
        ? { id: couple.id, linkedAt: couple.linkedAt, status: couple.status }
        : null,
      totalMonthlySpent: partnerAmount + userAmount,
      goalsProgress: partnerGoalsProgress + userGoalsProgress,
      goalsTarget: partnerGoalsTarget + userGoalsTarget,
      upcomingBills: userBills,
      partnerSince: user.partnerLinkedAt?.toISOString().split('T')[0] || null,
    };
  }
}

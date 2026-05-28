import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateSubscriptionDto, UpdateSubscriptionDto } from './dto/subscriptions.dto';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(groupId: string, userId: string, dto: CreateSubscriptionDto) {
    await this.validateGroupMember(groupId, userId);

    const membersTotal = dto.members.reduce((sum, m) => sum + m.share, 0);
    if (Math.abs(membersTotal - 100) > 0.01) {
      throw new BadRequestException(`Member shares must sum to 100 (got ${membersTotal})`);
    }

    const subscription = await this.prisma.sharedSubscription.create({
      data: {
        groupId,
        name: dto.name,
        service: dto.service,
        amount: dto.amount,
        currency: dto.currency || 'INR',
        billingCycle: dto.billingCycle || 'monthly',
        nextBillingDate: new Date(dto.nextBillingDate),
        paidByMemberId: dto.paidByMemberId,
        category: dto.category,
        renewalReminderDays: dto.renewalReminderDays ?? 7,
        members: {
          create: dto.members.map((m) => ({
            memberId: m.memberId,
            share: m.share,
          })),
        },
      },
      include: {
        paidBy: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
        members: {
          include: {
            member: {
              include: {
                user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
              },
            },
          },
        },
      },
    });

    this.logger.log(`Subscription ${subscription.id} created in group ${groupId}`);
    return subscription;
  }

  async findAll(groupId: string, userId: string) {
    await this.validateGroupMember(groupId, userId);

    const subscriptions = await this.prisma.sharedSubscription.findMany({
      where: { groupId, deletedAt: null },
      include: {
        paidBy: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
        members: {
          include: {
            member: {
              include: {
                user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
              },
            },
          },
        },
      },
      orderBy: { nextBillingDate: 'asc' },
    });

    return subscriptions;
  }

  async findOne(groupId: string, id: string, userId: string) {
    await this.validateGroupMember(groupId, userId);

    const subscription = await this.prisma.sharedSubscription.findUnique({
      where: { id },
      include: {
        paidBy: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
        members: {
          include: {
            member: {
              include: {
                user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
              },
            },
          },
        },
      },
    });

    if (!subscription || subscription.groupId !== groupId || subscription.deletedAt) {
      throw new NotFoundException('Subscription not found');
    }

    return subscription;
  }

  async update(groupId: string, id: string, userId: string, dto: UpdateSubscriptionDto) {
    await this.validateGroupMember(groupId, userId);

    const existing = await this.prisma.sharedSubscription.findUnique({
      where: { id },
    });

    if (!existing || existing.groupId !== groupId || existing.deletedAt) {
      throw new NotFoundException('Subscription not found');
    }

    if (dto.members) {
      const membersTotal = dto.members.reduce((sum, m) => sum + m.share, 0);
      if (Math.abs(membersTotal - 100) > 0.01) {
        throw new BadRequestException(`Member shares must sum to 100 (got ${membersTotal})`);
      }
    }

    await this.prisma.$transaction(async (tx) => {
      if (dto.members) {
        await tx.subscriptionMember.deleteMany({ where: { subscriptionId: id } });
        await tx.subscriptionMember.createMany({
          data: dto.members.map((m) => ({
            subscriptionId: id,
            memberId: m.memberId,
            share: m.share,
          })),
        });
      }

      await tx.sharedSubscription.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.service !== undefined && { service: dto.service }),
          ...(dto.amount !== undefined && { amount: dto.amount }),
          ...(dto.currency !== undefined && { currency: dto.currency }),
          ...(dto.billingCycle !== undefined && { billingCycle: dto.billingCycle }),
          ...(dto.nextBillingDate !== undefined && { nextBillingDate: new Date(dto.nextBillingDate) }),
          ...(dto.paidByMemberId !== undefined && { paidByMemberId: dto.paidByMemberId }),
          ...(dto.category !== undefined && { category: dto.category }),
          ...(dto.renewalReminderDays !== undefined && { renewalReminderDays: dto.renewalReminderDays }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        },
      });
    });

    this.logger.log(`Subscription ${id} updated in group ${groupId}`);
    return this.findOne(groupId, id, userId);
  }

  async delete(groupId: string, id: string, userId: string) {
    await this.validateGroupMember(groupId, userId);

    const existing = await this.prisma.sharedSubscription.findUnique({
      where: { id },
    });

    if (!existing || existing.groupId !== groupId || existing.deletedAt) {
      throw new NotFoundException('Subscription not found');
    }

    await this.prisma.sharedSubscription.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    this.logger.log(`Subscription ${id} deleted from group ${groupId}`);
  }

  async markRenewed(groupId: string, id: string, userId: string) {
    await this.validateGroupMember(groupId, userId);

    const subscription = await this.prisma.sharedSubscription.findUnique({
      where: { id },
      include: { members: true },
    });

    if (!subscription || subscription.groupId !== groupId || subscription.deletedAt) {
      throw new NotFoundException('Subscription not found');
    }

    const nextBillingDate = this.calculateNextBillingDate(
      subscription.nextBillingDate,
      subscription.billingCycle,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.sharedSubscription.update({
        where: { id },
        data: { nextBillingDate },
      });

      await tx.groupExpense.create({
        data: {
          groupId,
          paidByMemberId: subscription.paidByMemberId,
          description: `${subscription.name} - ${subscription.service} renewal`,
          amount: subscription.amount,
          category: subscription.category || 'subscription',
          splitType: 'percentage',
          date: new Date(),
          isRecurring: true,
          recurringFrequency: subscription.billingCycle,
          splits: {
            create: subscription.members.map((m) => ({
              memberId: m.memberId,
              amount: Number(subscription.amount) * (Number(m.share) / 100),
              percentage: Number(m.share),
            })),
          },
        },
      });
    });

    this.logger.log(`Subscription ${id} marked as renewed in group ${groupId}`);
    return this.findOne(groupId, id, userId);
  }

  async getUpcomingRenewals(userId: string, days: number = 7) {
    const memberships = await this.prisma.groupMember.findMany({
      where: { userId, isActive: true, deletedAt: null },
      select: { groupId: true },
    });

    const groupIds = memberships.map((m) => m.groupId);
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);

    const subscriptions = await this.prisma.sharedSubscription.findMany({
      where: {
        groupId: { in: groupIds },
        deletedAt: null,
        isActive: true,
        nextBillingDate: { lte: targetDate, gte: new Date() },
      },
      include: {
        group: { select: { id: true, name: true } },
        paidBy: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { nextBillingDate: 'asc' },
    });

    return subscriptions;
  }

  async getAnalytics(groupId: string, userId: string) {
    await this.validateGroupMember(groupId, userId);

    const subscriptions = await this.prisma.sharedSubscription.findMany({
      where: { groupId, deletedAt: null, isActive: true },
      include: { members: true },
    });

    const totalMonthly = subscriptions.reduce((sum, s) => {
      const monthlyAmount = s.billingCycle === 'yearly'
        ? Number(s.amount) / 12
        : s.billingCycle === 'quarterly'
          ? Number(s.amount) / 3
          : Number(s.amount);
      return sum + monthlyAmount;
    }, 0);

    const categoryBreakdown: Record<string, number> = {};
    subscriptions.forEach((s) => {
      const cat = s.category || 'other';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + Number(s.amount);
    });

    const upcomingRenewals = subscriptions.filter(
      (s) => new Date(s.nextBillingDate) > new Date(),
    ).length;

    return {
      totalSubscriptions: subscriptions.length,
      totalMonthly: Math.round(totalMonthly * 100) / 100,
      totalYearly: Math.round(totalMonthly * 12 * 100) / 100,
      upcomingRenewals,
      categoryBreakdown: Object.entries(categoryBreakdown)
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount),
    };
  }

  private calculateNextBillingDate(current: Date, cycle: string): Date {
    const date = new Date(current);
    switch (cycle) {
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'quarterly':
        date.setMonth(date.getMonth() + 3);
        break;
      case 'yearly':
        date.setFullYear(date.getFullYear() + 1);
        break;
      default:
        date.setMonth(date.getMonth() + 1);
    }
    return date;
  }

  private async validateGroupMember(groupId: string, userId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member || !member.isActive || member.deletedAt) {
      throw new ForbiddenException('Not a group member');
    }
    return member;
  }
}

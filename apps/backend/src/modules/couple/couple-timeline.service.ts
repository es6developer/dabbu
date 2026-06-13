import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

interface AddEventParams {
  groupId: string;
  userId?: string;
  eventType: string;
  title: string;
  description?: string;
  amount?: number;
  icon?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class CoupleTimelineService {
  private readonly logger = new Logger(CoupleTimelineService.name);

  constructor(private readonly prisma: PrismaService) {}

  async addEvent(params: AddEventParams) {
    return this.prisma.coupleTimelineEvent.create({
      data: {
        groupId: params.groupId,
        userId: params.userId,
        eventType: params.eventType,
        title: params.title,
        description: params.description,
        amount: params.amount,
        icon: params.icon,
        metadata: params.metadata || {},
      },
    });
  }

  async getTimeline(groupId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [events, total] = await Promise.all([
      this.prisma.coupleTimelineEvent.findMany({
        where: { groupId },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.coupleTimelineEvent.count({ where: { groupId } }),
    ]);

    return {
      events,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async createExpenseEvent(
    groupId: string,
    userId: string,
    userName: string,
    amount: number,
    description: string,
    category: string,
  ) {
    return this.addEvent({
      groupId,
      userId,
      eventType: 'expense_added',
      title: `${userName} added expense`,
      description: `${description} — ${this.formatCurrency(amount)}`,
      amount,
      icon: this.expenseIcon(category),
      metadata: { category },
    });
  }

  async createGoalEvent(
    groupId: string,
    userId: string,
    userName: string,
    goalName: string,
    eventType: string,
    progress?: number,
  ) {
    return this.addEvent({
      groupId,
      userId,
      eventType,
      title: eventType === 'goal_created' ? `🎯 New goal: ${goalName}` : `🎯 ${goalName} milestone`,
      description: progress ? `${goalName} is ${progress}% complete` : undefined,
      icon: 'trophy',
    });
  }

  async createMilestoneEvent(
    groupId: string,
    title: string,
    description?: string,
    amount?: number,
  ) {
    return this.addEvent({
      groupId,
      eventType: 'milestone_reached',
      title,
      description,
      amount,
      icon: 'milestone',
    });
  }

  async createIncomeEvent(
    groupId: string,
    userId: string,
    userName: string,
    amount: number,
    source: string,
  ) {
    return this.addEvent({
      groupId,
      userId,
      eventType: 'income_added',
      title: `${userName} added income`,
      description: `${source} — ${this.formatCurrency(amount)}`,
      amount,
      icon: 'income',
    });
  }

  async createBillPaidEvent(
    groupId: string,
    userId: string,
    userName: string,
    billName: string,
    amount: number,
  ) {
    return this.addEvent({
      groupId,
      userId,
      eventType: 'bill_paid',
      title: `💳 ${billName} paid`,
      description: `${userName} paid ${this.formatCurrency(amount)}`,
      amount,
      icon: 'bill',
    });
  }

  async createSavingsContributionEvent(
    groupId: string,
    userId: string,
    userName: string,
    amount: number,
  ) {
    return this.addEvent({
      groupId,
      userId,
      eventType: 'savings_contribution',
      title: `💰 ${userName} saved ${this.formatCurrency(amount)}`,
      amount,
      icon: 'savings',
    });
  }

  async createPlannerEvent(groupId: string, plannerType: string, eventType: string) {
    const labels = {
      BABY: '👶 Baby',
      HOUSE: '🏠 House',
      CAR: '🚗 Car',
      RETIREMENT: '🌴 Retirement',
    };
    const label = labels[plannerType] || plannerType;
    return this.addEvent({
      groupId,
      eventType: eventType === 'planner_started' ? 'planner_started' : 'planner_progress',
      title:
        eventType === 'planner_started' ? `${label} Planner started` : `${label} Planner updated`,
      icon: plannerType.toLowerCase(),
    });
  }

  private formatCurrency(amount: number): string {
    return `₹${amount.toLocaleString('en-IN')}`;
  }

  private expenseIcon(category: string): string {
    const icons = {
      food: 'fast-food',
      groceries: 'cart',
      transport: 'car',
      shopping: 'bag',
      entertainment: 'film',
      bills: 'receipt',
      health: 'medkit',
      education: 'school',
      travel: 'airplane',
      dining: 'restaurant',
    };
    return icons[category?.toLowerCase()] || 'cash';
  }
}

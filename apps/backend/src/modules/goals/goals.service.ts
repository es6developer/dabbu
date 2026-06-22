import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LensDataService } from '../../common/lens/lens-data.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { NotificationEventsService } from '../notification/notification-events.service';

@Injectable()
export class GoalsService {
  private readonly logger = new Logger(GoalsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly lensData: LensDataService,
    private readonly notificationEvents: NotificationEventsService,
  ) {}

  async create(userId: string, dto: CreateGoalDto) {
    const [spaceId, lensId] = await Promise.all([
      this.lensData.getSpaceIdForLens(userId),
      this.lensData.getActiveLens(userId),
    ]);
    const goal = await this.prisma.goal.create({
      data: {
        userId,
        spaceId,
        lensId,
        name: dto.name,
        targetAmount: dto.targetAmount,
        type: dto.type || 'custom',
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        icon: dto.icon || null,
        color: dto.color || null,
        monthlyContribution: dto.monthlyContribution || null,
        notes: dto.notes || null,
        accountId: dto.accountId || null,
      },
    });

    this.notificationEvents
      .goalCreated(userId, {
        goalId: goal.id,
        name: goal.name,
        targetAmount: Number(goal.targetAmount),
      })
      .catch((err) => this.logger.warn(`Failed to notify goal created: ${err.message}`));

    return this.formatGoal(goal);
  }

  async findAll(userId: string) {
    const where: any = {
      userId,
      deletedAt: null,
      ...(await this.lensData.buildLensFilter(userId)),
    };
    const goals = await this.prisma.goal.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
    return goals.map((g) => this.formatGoal(g));
  }

  async findOne(userId: string, id: string) {
    const goal = await this.prisma.goal.findFirst({
      where: { id, userId, deletedAt: null, ...(await this.lensData.buildLensFilter(userId)) },
    });
    if (!goal) {
      throw new NotFoundException('Goal not found');
    }
    return this.formatGoal(goal);
  }

  async update(userId: string, id: string, dto: UpdateGoalDto) {
    const existing = await this.prisma.goal.findFirst({
      where: { id, userId, deletedAt: null, ...(await this.lensData.buildLensFilter(userId)) },
    });
    if (!existing) {
      throw new NotFoundException('Goal not found');
    }

    const goal = await this.prisma.goal.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.targetAmount !== undefined && { targetAmount: dto.targetAmount }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.deadline !== undefined && { deadline: new Date(dto.deadline) }),
        ...(dto.icon !== undefined && { icon: dto.icon }),
        ...(dto.color !== undefined && { color: dto.color }),
        ...(dto.monthlyContribution !== undefined && {
          monthlyContribution: dto.monthlyContribution,
        }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.accountId !== undefined && { accountId: dto.accountId }),
      },
    });
    return this.formatGoal(goal);
  }

  async contribute(userId: string, id: string, amount: number) {
    const existing = await this.prisma.goal.findFirst({
      where: { id, userId, deletedAt: null, ...(await this.lensData.buildLensFilter(userId)) },
    });
    if (!existing) {
      throw new NotFoundException('Goal not found');
    }
    if (existing.isCompleted) {
      throw new BadRequestException('Goal is already completed');
    }

    const currentAmount = Number(existing.currentAmount) + amount;
    const targetAmount = Number(existing.targetAmount);
    const prevProgress = Math.round((Number(existing.currentAmount) / targetAmount) * 100);
    const newProgress = Math.round((currentAmount / targetAmount) * 100);

    const goal = await this.prisma.goal.update({
      where: { id },
      data: {
        currentAmount,
        isCompleted: currentAmount >= targetAmount,
        completedAt: currentAmount >= targetAmount ? new Date() : null,
      },
    });

    if (currentAmount >= targetAmount) {
      this.notificationEvents
        .goalCompleted(userId, {
          goalId: id,
          name: existing.name,
          savedAmount: currentAmount,
        })
        .catch((err) => this.logger.warn(`Failed to notify goal completed: ${err.message}`));
    } else if (newProgress >= 75 && prevProgress < 75) {
      this.notificationEvents
        .goalMilestone(userId, {
          goalId: id,
          name: existing.name,
          progress: newProgress,
          milestone: 75,
        })
        .catch((err) => this.logger.warn(`Failed to notify goal milestone: ${err.message}`));
    } else if (newProgress >= 50 && prevProgress < 50) {
      this.notificationEvents
        .goalMilestone(userId, {
          goalId: id,
          name: existing.name,
          progress: newProgress,
          milestone: 50,
        })
        .catch((err) => this.logger.warn(`Failed to notify goal milestone: ${err.message}`));
    } else if (newProgress >= 25 && prevProgress < 25) {
      this.notificationEvents
        .goalMilestone(userId, {
          goalId: id,
          name: existing.name,
          progress: newProgress,
          milestone: 25,
        })
        .catch((err) => this.logger.warn(`Failed to notify goal milestone: ${err.message}`));
    }

    if (existing.deadline && !existing.isCompleted) {
      const deadline = new Date(existing.deadline);
      const created = new Date(existing.createdAt);
      const now = new Date();
      const totalDuration = deadline.getTime() - created.getTime();
      const elapsed = now.getTime() - created.getTime();
      if (totalDuration > 0 && elapsed > 0) {
        const expectedProgress = Math.min(100, Math.round((elapsed / totalDuration) * 100));
        if (newProgress < expectedProgress - 10) {
          this.notificationEvents
            .goalBehindSchedule(userId, {
              goalId: id,
              name: existing.name,
              progress: newProgress,
              expected: expectedProgress,
            })
            .catch((err) => this.logger.warn(`Failed to notify behind schedule: ${err.message}`));
        }
      }
    }

    return this.formatGoal(goal);
  }

  async toggleComplete(userId: string, id: string) {
    const existing = await this.prisma.goal.findFirst({
      where: { id, userId, deletedAt: null, ...(await this.lensData.buildLensFilter(userId)) },
    });
    if (!existing) {
      throw new NotFoundException('Goal not found');
    }

    const wasCompleted = existing.isCompleted;
    const goal = await this.prisma.goal.update({
      where: { id },
      data: {
        isCompleted: !wasCompleted,
        completedAt: !wasCompleted ? new Date() : null,
      },
    });

    if (!wasCompleted && goal.isCompleted) {
      this.notificationEvents
        .goalCompleted(userId, {
          goalId: id,
          name: existing.name,
          savedAmount: Number(existing.currentAmount),
        })
        .catch((err) => this.logger.warn(`Failed to notify goal completed: ${err.message}`));
    }

    return this.formatGoal(goal);
  }

  async remove(userId: string, id: string) {
    const existing = await this.prisma.goal.findFirst({
      where: { id, userId, deletedAt: null, ...(await this.lensData.buildLensFilter(userId)) },
    });
    if (!existing) {
      throw new NotFoundException('Goal not found');
    }

    await this.prisma.goal.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  getTemplates() {
    return [
      {
        type: 'emergency',
        name: 'Emergency Fund',
        description: '3-6 months of living expenses for unexpected situations',
        icon: 'shield-checkmark',
        color: '#FF6B6B',
        defaultTarget: 200000,
        suggestedMonths: 6,
        category: 'security',
      },
      {
        type: 'vacation',
        name: 'Dream Vacation',
        description: 'Save for that perfect getaway you have always wanted',
        icon: 'airplane',
        color: '#00B894',
        defaultTarget: 300000,
        category: 'lifestyle',
      },
      {
        type: 'home',
        name: 'New Home',
        description: 'Down payment for your dream home',
        icon: 'home',
        color: '#F97316',
        defaultTarget: 5000000,
        category: 'major',
      },
      {
        type: 'car',
        name: 'New Car',
        description: 'Save for a new vehicle',
        icon: 'car-sport',
        color: '#14B8A6',
        defaultTarget: 800000,
        category: 'major',
      },
      {
        type: 'education',
        name: 'Education Fund',
        description: 'Invest in learning - courses, degrees, or skills',
        icon: 'school',
        color: '#4F6EF7',
        defaultTarget: 500000,
        category: 'growth',
      },
      {
        type: 'wedding',
        name: 'Wedding Fund',
        description: 'Save for the big day',
        icon: 'heart',
        color: '#FF6B9D',
        defaultTarget: 1000000,
        category: 'major',
      },
      {
        type: 'retirement',
        name: 'Retirement',
        description: 'Build your nest egg for a comfortable retirement',
        icon: 'umbrella',
        color: '#247BA0',
        defaultTarget: 10000000,
        category: 'longterm',
      },
      {
        type: 'baby',
        name: 'Baby Fund',
        description: 'Plan for your growing family - medical, supplies, and future needs',
        icon: 'happy',
        color: '#FF69B4',
        defaultTarget: 500000,
        category: 'family',
      },
      {
        type: 'savings',
        name: 'General Savings',
        description: 'A flexible savings goal for anything important',
        icon: 'piggy-bank',
        color: '#8B5CF6',
        defaultTarget: 100000,
        category: 'general',
      },
      {
        type: 'investment',
        name: 'Investment Goal',
        description: 'Grow your wealth through strategic investing',
        icon: 'trending-up',
        color: '#10B981',
        defaultTarget: 500000,
        category: 'growth',
      },
    ];
  }

  async getStats(userId: string) {
    const goals = await this.prisma.goal.findMany({
      where: { userId, deletedAt: null, ...(await this.lensData.buildLensFilter(userId)) },
    });

    const totalSaved = goals.reduce((s, g) => s + Number(g.currentAmount), 0);
    const totalTarget = goals.reduce((s, g) => s + Number(g.targetAmount), 0);
    const completed = goals.filter((g) => g.isCompleted).length;

    return {
      total: goals.length,
      completed,
      active: goals.length - completed,
      totalSaved,
      totalTarget,
      progress: totalTarget > 0 ? Math.min(Math.round((totalSaved / totalTarget) * 100), 100) : 0,
    };
  }

  private formatGoal(goal: any) {
    return {
      id: goal.id,
      name: goal.name,
      type: goal.type,
      target: Number(goal.targetAmount),
      saved: Number(goal.currentAmount),
      targetDate: goal.deadline?.toISOString() || null,
      icon: goal.icon,
      color: goal.color,
      monthlyContribution: goal.monthlyContribution ? Number(goal.monthlyContribution) : 0,
      isCompleted: goal.isCompleted,
      completedAt: goal.completedAt?.toISOString() || null,
      notes: goal.notes,
      accountId: goal.accountId,
      createdAt: goal.createdAt.toISOString(),
      updatedAt: goal.updatedAt.toISOString(),
    };
  }
}

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';

@Injectable()
export class GoalsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateGoalDto) {
    const goal = await this.prisma.goal.create({
      data: {
        userId,
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
    return this.formatGoal(goal);
  }

  async findAll(userId: string) {
    const goals = await this.prisma.goal.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
    return goals.map((g) => this.formatGoal(g));
  }

  async findOne(userId: string, id: string) {
    const goal = await this.prisma.goal.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!goal) {
      throw new NotFoundException('Goal not found');
    }
    return this.formatGoal(goal);
  }

  async update(userId: string, id: string, dto: UpdateGoalDto) {
    const existing = await this.prisma.goal.findFirst({
      where: { id, userId, deletedAt: null },
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
      where: { id, userId, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Goal not found');
    }
    if (existing.isCompleted) {
      throw new BadRequestException('Goal is already completed');
    }

    const currentAmount = Number(existing.currentAmount) + amount;
    const targetAmount = Number(existing.targetAmount);

    const goal = await this.prisma.goal.update({
      where: { id },
      data: {
        currentAmount,
        isCompleted: currentAmount >= targetAmount,
        completedAt: currentAmount >= targetAmount ? new Date() : null,
      },
    });
    return this.formatGoal(goal);
  }

  async toggleComplete(userId: string, id: string) {
    const existing = await this.prisma.goal.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Goal not found');
    }

    const goal = await this.prisma.goal.update({
      where: { id },
      data: {
        isCompleted: !existing.isCompleted,
        completedAt: !existing.isCompleted ? new Date() : null,
      },
    });
    return this.formatGoal(goal);
  }

  async remove(userId: string, id: string) {
    const existing = await this.prisma.goal.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Goal not found');
    }

    await this.prisma.goal.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getStats(userId: string) {
    const goals = await this.prisma.goal.findMany({
      where: { userId, deletedAt: null },
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

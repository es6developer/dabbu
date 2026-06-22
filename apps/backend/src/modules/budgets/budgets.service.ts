import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LensDataService } from '../../common/lens/lens-data.service';
import { BudgetsRepository } from './budgets.repository';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

@Injectable()
export class BudgetsService {
  constructor(
    private readonly repo: BudgetsRepository,
    private readonly prisma: PrismaService,
    private readonly lensData: LensDataService,
  ) {}

  async create(userId: string, dto: CreateBudgetDto) {
    const [spaceId, lensId] = await Promise.all([
      this.lensData.getSpaceIdForLens(userId),
      this.lensData.getActiveLens(userId),
    ]);
    const now = new Date();
    const startDate = dto.startDate
      ? new Date(dto.startDate)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    let endDate: Date;
    if (dto.endDate) {
      endDate = new Date(dto.endDate);
    } else {
      const period = dto.period || 'monthly';
      switch (period) {
        case 'weekly':
          endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case 'yearly':
          endDate = new Date(
            startDate.getFullYear() + 1,
            startDate.getMonth(),
            startDate.getDate(),
          );
          break;
        case 'monthly':
        default:
          endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
          break;
      }
    }

    const budget = await this.repo.createBudget(userId, spaceId, lensId, {
      ...dto,
      startDate,
      endDate,
    });
    return this.formatBudget(budget);
  }

  async findAll(userId: string) {
    const where: any = {
      userId,
      deletedAt: null,
      ...(await this.lensData.buildLensFilter(userId)),
    };
    const budgets = await this.repo.findAllWithCategory(userId, where);
    return budgets.map((b) => this.formatBudget(b));
  }

  async findOne(userId: string, id: string) {
    const budget = await this.repo.findWithCategory(id, userId);
    if (!budget) {
      throw new NotFoundException('Budget not found');
    }
    return this.formatBudget(budget);
  }

  async update(userId: string, id: string, dto: UpdateBudgetDto) {
    const existing = await this.repo.findFirst({ id, userId });
    if (!existing) {
      throw new NotFoundException('Budget not found');
    }

    const data: any = {};
    if (dto.name !== undefined) {
      data.name = dto.name;
    }
    if (dto.amount !== undefined) {
      data.amount = dto.amount;
    }
    if (dto.spent !== undefined) {
      data.spent = dto.spent;
    }
    if (dto.period !== undefined) {
      data.period = dto.period;
    }
    if (dto.categoryId !== undefined) {
      data.categoryId = dto.categoryId;
    }
    if (dto.startDate !== undefined) {
      data.startDate = new Date(dto.startDate);
    }
    if (dto.endDate !== undefined) {
      data.endDate = new Date(dto.endDate);
    }
    if (dto.notifyAt !== undefined) {
      data.notifyAt = dto.notifyAt;
    }
    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }
    if (dto.notes !== undefined) {
      data.notes = dto.notes;
    }

    const budget = await this.repo.updateWithCategory(id, data);
    return this.formatBudget(budget);
  }

  async remove(userId: string, id: string) {
    const existing = await this.repo.findFirst({ id, userId });
    if (!existing) {
      throw new NotFoundException('Budget not found');
    }
    await this.repo.softDelete(id);
    return { success: true };
  }

  async getStats(userId: string) {
    const budgets = await this.repo.findActiveBudgets(userId);

    const totalBudget = Number(budgets.reduce((s, b) => s + Number(b.amount), 0));
    const totalSpent = Number(budgets.reduce((s, b) => s + Number(b.spent), 0));
    const remaining = Math.max(0, totalBudget - totalSpent);
    const pct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

    const atRisk = budgets.filter((b) => {
      const p = Number(b.amount) > 0 ? (Number(b.spent) / Number(b.amount)) * 100 : 0;
      return p >= b.notifyAt;
    }).length;

    return {
      totalBudgets: budgets.length,
      totalBudget,
      totalSpent,
      remaining,
      percentage: pct,
      atRisk,
      budgets: budgets.map((b) => ({
        id: b.id,
        name: b.name,
        amount: Number(b.amount),
        spent: Number(b.spent),
        period: b.period,
        remaining: Math.max(0, Number(b.amount) - Number(b.spent)),
        percentage:
          Number(b.amount) > 0 ? Math.round((Number(b.spent) / Number(b.amount)) * 100) : 0,
        isOver: Number(b.spent) >= Number(b.amount),
        notifyAt: b.notifyAt,
      })),
    };
  }

  private formatBudget(b: any) {
    return {
      id: b.id,
      name: b.name,
      amount: Number(b.amount),
      spent: Number(b.spent),
      period: b.period,
      startDate: b.startDate,
      endDate: b.endDate,
      isActive: b.isActive,
      notifyAt: b.notifyAt,
      notes: b.notes,
      category: b.category
        ? {
            id: b.category.id,
            name: b.category.name,
            icon: b.category.icon,
            color: b.category.color,
          }
        : null,
      remaining: Math.max(0, Number(b.amount) - Number(b.spent)),
      percentage: Number(b.amount) > 0 ? Math.round((Number(b.spent) / Number(b.amount)) * 100) : 0,
      isOver: Number(b.spent) >= Number(b.amount),
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    };
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BaseRepository } from '../../common/prisma/base-repository';
import { LensDataService } from '../../common/lens/lens-data.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

@Injectable()
export class BudgetsRepository extends BaseRepository<any, CreateBudgetDto, UpdateBudgetDto> {
  constructor(
    prisma: PrismaService,
    private readonly lensData: LensDataService,
  ) {
    super(prisma, 'budget');
  }

  async findFirst(where: any): Promise<any> {
    const lensFilter = where.userId ? await this.lensData.buildLensFilter(where.userId) : {};
    return this.model.findFirst({ where: { ...where, ...lensFilter, deletedAt: null } });
  }

  async findWithCategory(id: string, userId: string) {
    return this.prisma.budget.findFirst({
      where: { id, userId, deletedAt: null, ...(await this.lensData.buildLensFilter(userId)) },
      include: { category: true },
    });
  }

  async findAllWithCategory(userId: string, where?: any) {
    const lensFilter = await this.lensData.buildLensFilter(userId);
    return this.prisma.budget.findMany({
      where: { ...lensFilter, ...(where || { userId, deletedAt: null }) },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateWithCategory(id: string, data: any) {
    return this.prisma.budget.update({
      where: { id },
      data,
      include: { category: true },
    });
  }

  async createBudget(
    userId: string,
    spaceId: string | null,
    lensId: string | null,
    dto: {
      name: string;
      amount: number;
      period?: string;
      categoryId?: string | null;
      notifyAt?: number;
      notes?: string | null;
      startDate: Date;
      endDate: Date;
    },
  ) {
    return this.prisma.budget.create({
      data: {
        userId,
        spaceId,
        lensId,
        name: dto.name,
        amount: dto.amount,
        period: dto.period || 'monthly',
        categoryId: dto.categoryId || null,
        startDate: dto.startDate,
        endDate: dto.endDate,
        notifyAt: dto.notifyAt ?? 80,
        notes: dto.notes || null,
      },
      include: { category: true },
    });
  }

  async findActiveBudgets(userId: string) {
    return this.prisma.budget.findMany({
      where: { userId, deletedAt: null, isActive: true, ...(await this.lensData.buildLensFilter(userId)) },
    });
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateTransactionDto, UpdateTransactionDto, TransactionFilterDto } from './dto';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateTransactionDto) {
    const categoryId = dto.categoryId || (await this.predictCategory(userId, dto));

    const metadata: Record<string, any> = { ...((dto as any).metadata || {}) };
    if (dto.groupId) {
      metadata.groupId = dto.groupId;
    }
    if ((dto as any).paymentMethod) {
      metadata.paymentType = (dto as any).paymentMethod;
    }

    const tx = await this.prisma.transaction.create({
      data: {
        userId,
        accountId: dto.accountId || null,
        categoryId,
        expenseGroupId: dto.expenseGroupId || null,
        amount: dto.amount,
        type: dto.type,
        date: dto.date ? new Date(dto.date) : new Date(),
        description: dto.description || dto.title,
        notes: dto.notes,
        tags: dto.tags || [],
        isRecurring: dto.isRecurring || false,
        recurringFrequency: dto.recurringFrequency,
        receiptUrl: dto.receiptUrl,
        status: 'completed',
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      },
      include: { category: true },
    });
    return tx;
  }

  async findAll(userId: string, filter: TransactionFilterDto) {
    const where: any = { deletedAt: null };

    if (filter.expenseGroupId) {
      where.expenseGroupId = filter.expenseGroupId;
    } else {
      where.userId = userId;
    }

    if (filter.type) {
      where.type = filter.type;
    }
    if (filter.categoryId) {
      where.categoryId = filter.categoryId;
    }
    if (filter.accountId) {
      where.accountId = filter.accountId;
    }
    if (filter.startDate) {
      where.date = { ...where.date, gte: new Date(filter.startDate) };
    }
    if (filter.endDate) {
      where.date = { ...where.date, lte: new Date(filter.endDate) };
    }
    if (filter.minAmount) {
      where.amount = { ...where.amount, gte: filter.minAmount };
    }
    if (filter.maxAmount) {
      where.amount = { ...where.amount, lte: filter.maxAmount };
    }
    if (filter.search) {
      where.OR = [
        { description: { contains: filter.search } },
        { notes: { contains: filter.search } },
      ];
    }

    const page = filter.page || 1;
    const limit = filter.limit || 20;

    // groupId is stored in the metadata JSON field; we filter in-memory
    const needsGroupFilter = !!filter.groupId;
    const skip = (page - 1) * limit;

    const [rawData, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        include: { category: true },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    const data = needsGroupFilter
      ? rawData.filter((t) => (t.metadata as any)?.groupId === filter.groupId)
      : rawData;

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(userId: string, id: string) {
    const tx = await this.prisma.transaction.findFirst({
      where: { id, deletedAt: null },
      include: { category: true },
    });
    if (!tx || (tx.userId !== userId && !tx.expenseGroupId)) {
      throw new NotFoundException('Transaction not found');
    }
    return { data: tx };
  }

  async update(userId: string, id: string, dto: UpdateTransactionDto) {
    const existing = await this.prisma.transaction.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Transaction not found');
    }

    const tx = await this.prisma.transaction.update({
      where: { id },
      data: {
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(dto.accountId !== undefined && { accountId: dto.accountId }),
        ...(dto.date !== undefined && { date: new Date(dto.date) }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
        ...(dto.isRecurring !== undefined && { isRecurring: dto.isRecurring }),
        ...(dto.recurringFrequency !== undefined && { recurringFrequency: dto.recurringFrequency }),
        ...(dto.expenseGroupId !== undefined && { expenseGroupId: dto.expenseGroupId || null }),
        ...(dto.metadata !== undefined && { metadata: dto.metadata }),
      },
      include: { category: true },
    });

    return { data: tx };
  }

  async remove(userId: string, id: string) {
    const existing = await this.prisma.transaction.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Transaction not found');
    }

    await this.prisma.transaction.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async search(userId: string, query: string, limit: number = 20) {
    const data = await this.prisma.transaction.findMany({
      where: {
        userId,
        deletedAt: null,
        OR: [{ description: { contains: query } }, { notes: { contains: query } }],
      },
      include: { category: true },
      orderBy: { date: 'desc' },
      take: limit,
    });
    return { data };
  }

  async getStats(userId: string, months: number = 12) {
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    const transactions = await this.prisma.transaction.findMany({
      where: { userId, deletedAt: null, date: { gte: since } },
      include: { category: true },
      orderBy: { date: 'desc' },
    });

    const totalExpense = transactions
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + Number(t.amount), 0);
    const totalIncome = transactions
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + Number(t.amount), 0);

    const categoryBreakdown: Record<string, number> = {};
    transactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const cat = t.category?.name || 'Uncategorized';
        categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + Number(t.amount);
      });

    const monthlyData: Record<string, { income: number; expense: number }> = {};
    transactions.forEach((t) => {
      const key = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData[key]) {
        monthlyData[key] = { income: 0, expense: 0 };
      }
      if (t.type === 'income') {
        monthlyData[key].income += Number(t.amount);
      } else {
        monthlyData[key].expense += Number(t.amount);
      }
    });

    const recent = transactions.slice(0, 10);

    return {
      data: {
        summary: {
          totalExpense,
          totalIncome,
          netSavings: totalIncome - totalExpense,
          transactionCount: transactions.length,
        },
        categoryBreakdown: Object.entries(categoryBreakdown)
          .map(([name, amount]) => ({ name, amount }))
          .sort((a, b) => b.amount - a.amount),
        monthlyTrend: Object.entries(monthlyData)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, data]) => ({ month, ...data })),
        recentTransactions: recent,
      },
    };
  }

  async getCategorySummary(userId: string, startDate?: string, endDate?: string, expenseGroupId?: string) {
    const where: any = { deletedAt: null, type: 'expense' };
    if (expenseGroupId) {
      where.expenseGroupId = expenseGroupId;
    } else {
      where.userId = userId;
    }
    if (startDate) {
      where.date = { ...where.date, gte: new Date(startDate) };
    }
    if (endDate) {
      where.date = { ...where.date, lte: new Date(endDate) };
    }

    const transactions = await this.prisma.transaction.findMany({
      where,
      include: { category: true },
    });

    const breakdown: Record<string, { total: number; count: number; color: string | null }> = {};
    transactions.forEach((t) => {
      const name = t.category?.name || 'Uncategorized';
      const entry = breakdown[name];
      if (entry) {
        entry.total += Number(t.amount);
        entry.count += 1;
      } else {
        breakdown[name] = { total: Number(t.amount), count: 1, color: t.category?.color || null };
      }
    });

    const total = Object.values(breakdown).reduce((s, v) => s + v.total, 0);
    return {
      data: Object.entries(breakdown)
        .map(([name, values]) => ({
          name,
          total: values.total,
          count: values.count,
          percentage: total > 0 ? Math.round((values.total / total) * 100) : 0,
          color: values.color,
        }))
        .sort((a, b) => b.total - a.total),
    };
  }

  async getMonthlySummary(userId: string, months: number = 12) {
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    const transactions = await this.prisma.transaction.findMany({
      where: { userId, deletedAt: null, date: { gte: since } },
    });

    const monthly: Record<string, { income: number; expense: number }> = {};
    transactions.forEach((t) => {
      const key = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthly[key]) {
        monthly[key] = { income: 0, expense: 0 };
      }
      if (t.type === 'income') {
        monthly[key].income += Number(t.amount);
      } else {
        monthly[key].expense += Number(t.amount);
      }
    });

    return {
      data: Object.entries(monthly)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => ({ month, ...data })),
    };
  }

  async getRecurring(userId: string) {
    const transactions = await this.prisma.transaction.findMany({
      where: { userId, isRecurring: true, deletedAt: null },
      include: { category: true, account: { select: { name: true } } },
      orderBy: { date: 'desc' },
    });
    return { data: transactions };
  }

  async uploadReceipt(userId: string, id: string, file: any) {
    const existing = await this.prisma.transaction.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Transaction not found');
    }

    const receiptUrl = `/uploads/receipts/${file.filename}`;
    await this.prisma.transaction.update({
      where: { id },
      data: { receiptUrl },
    });
    return { data: { receiptUrl } };
  }

  async bulkCreate(userId: string, dtos: CreateTransactionDto[]) {
    const results: any[] = [];
    for (const dto of dtos) {
      try {
        const tx = await this.create(userId, dto);
        results.push({ status: 'created', transaction: tx });
      } catch (err: any) {
        results.push({ status: 'failed', error: err.message, dto });
      }
    }
    return { data: results };
  }

  private async predictCategory(userId: string, dto: CreateTransactionDto): Promise<string | null> {
    if (dto.categoryId) {
      return dto.categoryId;
    }

    const keyword = (dto.description || dto.title || '').toLowerCase();
    const categoryMap: Record<string, string[]> = {
      'Food & Dining': [
        'food',
        'restaurant',
        'swiggy',
        'zomato',
        'dining',
        'cafe',
        'lunch',
        'dinner',
        'breakfast',
        'uber eats',
        'pizza',
        'burger',
      ],
      Transportation: [
        'uber',
        'ola',
        'fuel',
        'petrol',
        'diesel',
        'metro',
        'bus',
        'cab',
        'uber',
        'ola',
        'parking',
        'toll',
      ],
      Shopping: [
        'amazon',
        'flipkart',
        'myntra',
        'shopping',
        'mall',
        'clothing',
        'electronics',
        'online',
      ],
      'Bills & Utilities': [
        'electricity',
        'water',
        'gas',
        'broadband',
        'wifi',
        'phone',
        'mobile',
        'recharge',
        'bill',
      ],
      Entertainment: [
        'netflix',
        'prime',
        'hotstar',
        'movie',
        'cinema',
        'spotify',
        'game',
        'entertainment',
      ],
      Healthcare: [
        'hospital',
        'doctor',
        'clinic',
        'pharmacy',
        'medicine',
        'medical',
        'health',
        'doctor',
        'dentist',
      ],
      Education: [
        'course',
        'class',
        'training',
        'book',
        'education',
        'university',
        'college',
        'school',
        'tutor',
      ],
      Rent: ['rent', 'lease', 'deposit'],
      Salary: ['salary', 'income', 'payroll', 'payout', 'wages'],
      Transfer: ['transfer', 'neft', 'imps', 'rtgs', 'upi', 'bank transfer'],
      Investment: ['mutual fund', 'stock', 'share', 'investment', 'sip', 'fd', 'fixed deposit'],
      EMI: ['emi', 'loan', 'installment'],
    };

    for (const [category, keywords] of Object.entries(categoryMap)) {
      if (keywords.some((kw) => keyword.includes(kw))) {
        const found = await this.prisma.transactionCategory.findFirst({
          where: { userId, name: category, isActive: true },
        });
        if (found) {
          return found.id;
        }
      }
    }
    return null;
  }
}

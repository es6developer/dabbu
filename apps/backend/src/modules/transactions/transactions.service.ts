import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationEventsService } from '../notification/notification-events.service';
import { CreateTransactionDto, UpdateTransactionDto, TransactionFilterDto } from './dto';
import { v4 as uuidv4 } from 'uuid';
import PDFDocument from 'pdfkit';
import * as ExcelJS from 'exceljs';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationEvents: NotificationEventsService,
  ) {}

  async create(userId: string, dto: CreateTransactionDto) {
    let categoryId = dto.categoryId;
    if (!categoryId && dto.category) {
      const found = await this.prisma.transactionCategory.findFirst({
        where: { userId, name: dto.category, isActive: true },
      });
      categoryId = found?.id || (await this.predictCategory(userId, dto)) || undefined;
    } else if (!categoryId) {
      categoryId = await this.predictCategory(userId, dto) || undefined;
    }

    const metadata: Record<string, any> = { ...((dto as any).metadata || {}) };
    if (dto.groupId) {
      metadata.groupId = dto.groupId;
    }
    if ((dto as any).paymentMethod) {
      metadata.paymentMethod = (dto as any).paymentMethod;
    }

    const prismaTx = await this.prisma.transaction.create({
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
        recurringId: dto.isRecurring ? (dto.recurringId || uuidv4()) : undefined,
        recurringFrequency: dto.recurringFrequency,
        receiptUrl: dto.receiptUrl,
        status: 'completed',
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      },
      include: { category: true },
    });

    const tx = {
      ...prismaTx,
      paymentMethod: (prismaTx.metadata as any)?.paymentMethod || null,
    };

    const amount = Number(tx.amount);

    if (dto.expenseGroupId) {
      this.notifyGroupMembers(userId, dto.expenseGroupId, tx).catch((err) =>
        this.logger.warn(`Failed to notify group members: ${err.message}`),
      );
    } else {
      this.notificationEvents
        .expenseAdded(userId, {
          amount,
          description: tx.description || '',
          category: tx.category?.name || 'Uncategorized',
        })
        .catch((err) => this.logger.warn(`Failed to notify expense added: ${err.message}`));

      this.detectLargeExpense(userId, amount, tx).catch((err) =>
        this.logger.warn(`Failed to check large expense: ${err.message}`),
      );
    }

    return tx;
  }

  private async notifyGroupMembers(actorUserId: string, expenseGroupId: string, tx: any) {
    const [group, actor] = await Promise.all([
      this.prisma.expenseGroup.findUnique({
        where: { id: expenseGroupId },
        include: {
          members: {
            select: { userId: true },
          },
        },
      }),
      this.prisma.user.findUnique({
        where: { id: actorUserId },
        select: { firstName: true, lastName: true },
      }),
    ]);

    if (!group) {
      return;
    }

    const actorName = [actor?.firstName, actor?.lastName].filter(Boolean).join(' ') || 'Someone';
    const memberIds = group.members.map((m) => m.userId).filter((id) => id !== actorUserId);

    if (memberIds.length === 0) {
      return;
    }

    await Promise.allSettled(
      memberIds.map((memberId) =>
        this.notificationEvents.groupExpenseAdded(memberId, {
          groupId: expenseGroupId,
          groupName: group.name,
          amount: Number(tx.amount),
          description: tx.description || '',
          addedBy: actorName,
        }),
      ),
    );
  }

  private async detectLargeExpense(userId: string, amount: number, tx: any) {
    const recentTxs = await this.prisma.transaction.findMany({
      where: { userId, deletedAt: null, type: 'expense' },
      orderBy: { date: 'desc' },
      take: 20,
      select: { amount: true },
    });

    if (recentTxs.length < 2) return;

    const avgAmount = recentTxs.reduce((s, t) => s + Number(t.amount), 0) / recentTxs.length;
    const threshold = avgAmount * 2;

    if (amount > threshold && amount > 500) {
      this.notificationEvents
        .largeExpenseDetected(userId, {
          amount,
          description: tx.description || '',
          category: tx.category?.name || 'Uncategorized',
          threshold: Math.round(threshold),
        })
        .catch((err) => this.logger.warn(`Failed to notify large expense: ${err.message}`));
    }
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

    if (filter.tags) {
      const tagArray = filter.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      if (tagArray.length > 0) {
        where.tags = { hasSome: tagArray };
      }
    }

    if (filter.status) {
      where.status = filter.status;
    }

    const page = filter.page || 1;
    const limit = filter.limit || 20;

    // groupId is stored in the metadata JSON field; we filter in-memory
    const needsGroupFilter = !!filter.groupId;
    const skip = (page - 1) * limit;

    // Build orderBy from sortBy/sortOrder
    const orderByField = ['date', 'amount', 'createdAt'].includes(filter.sortBy || '')
      ? filter.sortBy!
      : 'date';
    const orderByDir = filter.sortOrder === 'asc' ? 'asc' : 'desc';

    const [rawData, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        include: { category: true },
        orderBy: { [orderByField]: orderByDir },
        skip,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    const data = (needsGroupFilter
      ? rawData.filter((t) => (t.metadata as any)?.groupId === filter.groupId)
      : rawData
    ).map((t) => ({
      ...t,
      paymentMethod: (t.metadata as any)?.paymentMethod || null,
    }));

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
    return { data: { ...tx, paymentMethod: (tx.metadata as any)?.paymentMethod || null } };
  }

  async update(userId: string, id: string, dto: UpdateTransactionDto) {
    const existing = await this.prisma.transaction.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Transaction not found');
    }

    if (dto.category && !dto.categoryId) {
      const found = await this.prisma.transactionCategory.findFirst({
        where: { userId, name: dto.category, isActive: true },
      });
      if (found) {
        dto.categoryId = found.id;
      }
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
        ...((dto as any).recurringId !== undefined && { recurringId: (dto as any).recurringId }),
        ...((dto as any).recurringEndDate !== undefined && {
          recurringEndDate: (dto as any).recurringEndDate ? new Date((dto as any).recurringEndDate) : null,
        }),
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

  async getRecent(userId: string, limit: number) {
    const transactions = await this.prisma.transaction.findMany({
      where: { userId, deletedAt: null },
      include: { category: true },
      orderBy: { date: 'desc' },
      take: limit,
    });
    return { data: transactions.map((t) => ({ ...t, paymentMethod: (t.metadata as any)?.paymentMethod || null })) };
  }

  async getCategorySummary(
    userId: string,
    startDate?: string,
    endDate?: string,
    expenseGroupId?: string,
  ) {
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

  async createRecurring(userId: string, dto: CreateTransactionDto) {
    const recurringId = dto.recurringId || uuidv4();
    const tx = await this.prisma.transaction.create({
      data: {
        userId,
        accountId: dto.accountId || null,
        categoryId: dto.categoryId || null,
        expenseGroupId: dto.expenseGroupId || null,
        amount: dto.amount,
        type: dto.type,
        date: dto.date ? new Date(dto.date) : new Date(),
        description: dto.description || dto.title,
        notes: dto.notes,
        tags: dto.tags || [],
        isRecurring: true,
        recurringId,
        recurringFrequency: dto.recurringFrequency || 'monthly',
        recurringEndDate: dto.recurringEndDate ? new Date(dto.recurringEndDate) : null,
        receiptUrl: dto.receiptUrl,
        status: 'completed',
        metadata: dto.metadata || {},
      },
      include: { category: true },
    });

    if (dto.expenseGroupId) {
      this.notifyGroupMembers(userId, dto.expenseGroupId, tx).catch((err) =>
        this.logger.warn(`Failed to notify group members: ${err.message}`),
      );
    }

    return tx;
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
      Utilities: [
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
        'dentist',
      ],
      Housing: ['rent', 'lease', 'deposit', 'maintenance', 'society'],
      Groceries: ['grocery', 'groceries', 'vegetables', 'fruits', 'supermarket'],
      Travel: ['flight', 'airline', 'hotel', 'booking', 'trip', 'vacation', 'travel'],
      'Children & Baby': [
        'school',
        'tutor',
        'class',
        'course',
        'training',
        'education',
        'university',
        'college',
        'baby',
        'diaper',
        'toy',
        'kids',
        'children',
      ],
      Financial: [
        'emi',
        'loan',
        'installment',
        'insurance',
        'subscription',
        'transfer',
        'neft',
        'imps',
        'rtgs',
        'upi',
        'bank transfer',
      ],
      Employment: ['salary', 'income', 'payroll', 'payout', 'wages'],
      Investments: ['mutual fund', 'stock', 'share', 'investment', 'sip', 'fd', 'fixed deposit'],
      Freelancing: ['freelance', 'freelancing', 'contract', 'consulting', 'gig'],
      Business: ['business', 'revenue', 'profit', 'sale', 'invoice'],
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

  async getMonthlyReport(userId: string, year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);
    const transactions = await this.prisma.transaction.findMany({
      where: { userId, deletedAt: null, date: { gte: start, lte: end } },
      include: { category: true },
      orderBy: { date: 'asc' },
    });

    const income = transactions.filter((t) => t.type === 'income');
    const expense = transactions.filter((t) => t.type === 'expense');
    const totalIncome = income.reduce((s, t) => s + Number(t.amount), 0);
    const totalExpense = expense.reduce((s, t) => s + Number(t.amount), 0);

    const catMap: Record<string, number> = {};
    expense.forEach((t) => {
      const name = t.category?.name || 'Uncategorized';
      catMap[name] = (catMap[name] || 0) + Number(t.amount);
    });

    return {
      month,
      year,
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      transactionCount: transactions.length,
      categories: Object.entries(catMap)
        .sort(([, a], [, b]) => b - a)
        .map(([name, amount]) => ({ name, amount })),
      transactions: transactions.map((t) => ({
        id: t.id,
        date: t.date,
        type: t.type,
        amount: Number(t.amount),
        description: t.description,
        category: t.category?.name || 'Uncategorized',
        tags: t.tags,
      })),
    };
  }

  async exportPdf(userId: string, year: number, month: number): Promise<Buffer> {
    const report = await this.getMonthlyReport(userId, year, month);
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => {});

    const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });

    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .text(`Monthly Report — ${monthName} ${year}`, { align: 'center' });
    doc.moveDown(1.5);
    doc.fontSize(11).font('Helvetica');

    doc.fontSize(14).font('Helvetica-Bold').text('Summary');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    doc.text(`Total Income:  ₹${report.totalIncome.toLocaleString('en-IN')}`);
    doc.text(`Total Expense: ₹${report.totalExpense.toLocaleString('en-IN')}`);
    doc.text(`Balance:       ₹${report.balance.toLocaleString('en-IN')}`);
    doc.text(`Transactions:  ${report.transactionCount}`);
    doc.moveDown(1);

    if (report.categories.length > 0) {
      doc.fontSize(14).font('Helvetica-Bold').text('Category Breakdown');
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica');
      report.categories.forEach((c) => {
        doc.text(`${c.name}: ₹${c.amount.toLocaleString('en-IN')}`);
      });
      doc.moveDown(1);
    }

    if (report.transactions.length > 0) {
      doc.fontSize(14).font('Helvetica-Bold').text('Transactions');
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');
      report.transactions.forEach((t) => {
        const d = new Date(t.date).toLocaleDateString('en-IN');
        const sign = t.type === 'income' ? '+' : '-';
        doc.text(
          `${d}  ${t.description || t.category}  ${sign}₹${t.amount.toLocaleString('en-IN')}`,
          { indent: 10 },
        );
      });
    }

    doc.end();
    return new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  async exportExcel(userId: string, year: number, month: number): Promise<Buffer> {
    const report = await this.getMonthlyReport(userId, year, month);
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Monthly Report');

    ws.columns = [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Type', key: 'type', width: 10 },
      { header: 'Category', key: 'category', width: 18 },
      { header: 'Description', key: 'description', width: 30 },
      { header: 'Amount (INR)', key: 'amount', width: 16 },
      { header: 'Tags', key: 'tags', width: 20 },
    ];

    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true };

    report.transactions.forEach((t) => {
      ws.addRow({
        date: new Date(t.date).toLocaleDateString('en-IN'),
        type: t.type,
        category: t.category,
        description: t.description || '',
        amount: t.amount,
        tags: Array.isArray(t.tags) ? t.tags.join(', ') : '',
      });
    });

    ws.addRow({});
    ws.addRow({ date: 'SUMMARY' });
    ws.addRow({ date: 'Total Income', amount: report.totalIncome });
    ws.addRow({ date: 'Total Expense', amount: report.totalExpense });
    ws.addRow({ date: 'Balance', amount: report.balance });

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }
}

import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMonthlyReport(userId: string, months = 6, groupId?: string) {
    if (groupId) {
      return this.getGroupMonthlyReport(userId, groupId, months);
    }
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
        deletedAt: null,
      },
      include: { category: true },
      orderBy: { date: 'desc' },
    });

    const monthlyMap = new Map<string, { income: number; expense: number; count: number }>();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap.set(key, { income: 0, expense: 0, count: 0 });
    }

    let totalIncome = 0;
    let totalExpense = 0;
    const categoryMap = new Map<string, { name: string; amount: number; count: number }>();

    for (const t of transactions) {
      const key = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`;
      const monthData = monthlyMap.get(key);
      if (!monthData) {
        continue;
      }

      const amount = Number(t.amount);
      if (t.type === 'income') {
        totalIncome += amount;
        monthData.income += amount;
      } else {
        totalExpense += amount;
        monthData.expense += amount;
      }
      monthData.count++;

      const catName = t.category?.name || 'Uncategorized';
      const existing = categoryMap.get(t.categoryId || 'uncategorized') || {
        name: catName,
        amount: 0,
        count: 0,
      };
      if (t.type === 'expense') {
        existing.amount += amount;
        existing.count++;
      }
      categoryMap.set(t.categoryId || 'uncategorized', existing);
    }

    const monthly = Array.from(monthlyMap.entries()).map(([month, data]) => ({
      month,
      income: data.income,
      expense: data.expense,
      savings: data.income - data.expense,
      count: data.count,
    }));

    const categories = Array.from(categoryMap.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.amount - a.amount);

    return {
      summary: {
        totalIncome,
        totalExpense,
        savings: totalIncome - totalExpense,
        savingsRate:
          totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0,
        transactionCount: transactions.length,
      },
      monthly,
      categoryBreakdown: categories,
    };
  }

  async getAnnualReport(userId: string, year?: number, groupId?: string) {
    if (groupId) {
      return this.getGroupAnnualReport(userId, groupId, year);
    }
    const targetYear = year || new Date().getFullYear();
    const startDate = new Date(targetYear, 0, 1);
    const endDate = new Date(targetYear, 11, 31, 23, 59, 59);

    const transactions = await this.prisma.transaction.findMany({
      where: { userId, date: { gte: startDate, lte: endDate }, deletedAt: null },
      include: { category: true },
      orderBy: { date: 'asc' },
    });

    let totalIncome = 0;
    let totalExpense = 0;
    const monthlyMap = new Map<number, { income: number; expense: number; count: number }>();
    for (let m = 0; m < 12; m++) {
      monthlyMap.set(m, { income: 0, expense: 0, count: 0 });
    }

    for (const t of transactions) {
      const amount = Number(t.amount);
      if (t.type === 'income') {
        totalIncome += amount;
      } else {
        totalExpense += amount;
      }
      const m = t.date.getMonth();
      const d = monthlyMap.get(m)!;
      if (t.type === 'income') {
        d.income += amount;
      } else {
        d.expense += amount;
      }
      d.count++;
    }

    return {
      year: targetYear,
      summary: {
        totalIncome,
        totalExpense,
        savings: totalIncome - totalExpense,
        count: transactions.length,
      },
      monthly: Array.from(monthlyMap.entries()).map(([month, data]) => ({
        month: new Date(targetYear, month, 1).toLocaleString('default', { month: 'short' }),
        ...data,
      })),
    };
  }

  async getCategoryReport(userId: string, startDate?: string, endDate?: string, groupId?: string) {
    if (groupId) {
      return this.getGroupCategoryReport(userId, groupId, startDate, endDate);
    }
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(end.getFullYear(), end.getMonth() - 5, 1);

    const transactions = await this.prisma.transaction.findMany({
      where: { userId, date: { gte: start, lte: end }, deletedAt: null, type: 'expense' },
      include: { category: true },
    });

    const catMap = new Map<
      string,
      { name: string; icon: string; color: string; amount: number; count: number }
    >();
    for (const t of transactions) {
      const catId = t.categoryId || 'uncategorized';
      const existing = catMap.get(catId) || {
        name: t.category?.name || 'Uncategorized',
        icon: t.category?.icon || 'help-circle',
        color: t.category?.color || '#94A3B8',
        amount: 0,
        count: 0,
      };
      existing.amount += Number(t.amount);
      existing.count++;
      catMap.set(catId, existing);
    }

    const categories = Array.from(catMap.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.amount - a.amount);

    const totalExpense = categories.reduce((s, c) => s + c.amount, 0);

    return {
      totalExpense,
      categoryCount: categories.length,
      categories: categories.map((c) => ({
        ...c,
        percentage: totalExpense > 0 ? Math.round((c.amount / totalExpense) * 100) : 0,
      })),
      dateRange: { start, end },
    };
  }

  // ─── Group-Scoped Reports ──────────────────────────────────

  async getGroupMonthlyReport(userId: string, groupId: string, months = 6) {
    await this.verifyGroupMembership(userId, groupId);
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const expenses = await this.prisma.sharedExpense.findMany({
      where: { groupId, date: { gte: startDate, lte: endDate } },
      orderBy: { date: 'desc' },
    });

    const monthlyMap = new Map<string, { income: number; expense: number; count: number }>();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap.set(key, { income: 0, expense: 0, count: 0 });
    }

    let totalExpense = 0;
    const categoryMap = new Map<string, { name: string; amount: number; count: number }>();

    for (const e of expenses) {
      const key = `${e.date.getFullYear()}-${String(e.date.getMonth() + 1).padStart(2, '0')}`;
      const monthData = monthlyMap.get(key);
      if (!monthData) {
        continue;
      }
      const amount = Number(e.amount);
      totalExpense += amount;
      monthData.expense += amount;
      monthData.count++;

      const catName = e.category || 'Other';
      const existing = categoryMap.get(e.category) || { name: catName, amount: 0, count: 0 };
      existing.amount += amount;
      existing.count++;
      categoryMap.set(e.category, existing);
    }

    const monthly = Array.from(monthlyMap.entries()).map(([month, data]) => ({
      month,
      income: data.income,
      expense: data.expense,
      savings: data.income - data.expense,
      count: data.count,
    }));

    const categories = Array.from(categoryMap.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.amount - a.amount);

    return {
      summary: {
        totalIncome: 0,
        totalExpense,
        savings: -totalExpense,
        savingsRate: 0,
        transactionCount: expenses.length,
      },
      monthly,
      categoryBreakdown: categories,
    };
  }

  async getGroupAnnualReport(userId: string, groupId: string, year?: number) {
    await this.verifyGroupMembership(userId, groupId);
    const targetYear = year || new Date().getFullYear();
    const startDate = new Date(targetYear, 0, 1);
    const endDate = new Date(targetYear, 11, 31, 23, 59, 59);

    const expenses = await this.prisma.sharedExpense.findMany({
      where: { groupId, date: { gte: startDate, lte: endDate } },
      orderBy: { date: 'asc' },
    });

    let totalExpense = 0;
    const monthlyMap = new Map<number, { income: number; expense: number; count: number }>();
    for (let m = 0; m < 12; m++) {
      monthlyMap.set(m, { income: 0, expense: 0, count: 0 });
    }

    for (const e of expenses) {
      const amount = Number(e.amount);
      totalExpense += amount;
      const m = e.date.getMonth();
      monthlyMap.get(m)!.expense += amount;
      monthlyMap.get(m)!.count++;
    }

    return {
      year: targetYear,
      summary: { totalIncome: 0, totalExpense, savings: -totalExpense, count: expenses.length },
      monthly: Array.from(monthlyMap.entries()).map(([month, data]) => ({
        month: new Date(targetYear, month, 1).toLocaleString('default', { month: 'short' }),
        ...data,
      })),
    };
  }

  async getGroupCategoryReport(
    userId: string,
    groupId: string,
    startDate?: string,
    endDate?: string,
  ) {
    await this.verifyGroupMembership(userId, groupId);
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(end.getFullYear(), end.getMonth() - 5, 1);

    const expenses = await this.prisma.sharedExpense.findMany({
      where: { groupId, date: { gte: start, lte: end } },
    });

    const catMap = new Map<string, { name: string; amount: number; count: number }>();
    for (const e of expenses) {
      const cat = e.category || 'Other';
      const existing = catMap.get(cat) || { name: cat, amount: 0, count: 0 };
      existing.amount += Number(e.amount);
      existing.count++;
      catMap.set(cat, existing);
    }

    const categories = Array.from(catMap.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.amount - a.amount);

    const totalExpense = categories.reduce((s, c) => s + c.amount, 0);

    return {
      totalExpense,
      categoryCount: categories.length,
      categories: categories.map((c) => ({
        ...c,
        percentage: totalExpense > 0 ? Math.round((c.amount / totalExpense) * 100) : 0,
      })),
      dateRange: { start, end },
    };
  }

  private async verifyGroupMembership(userId: string, groupId: string) {
    const member = await this.prisma.sharedGroupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member || !member.isActive) {
      throw new ForbiddenException('You are not a member of this group');
    }
  }

  async generateReportFile(
    userId: string,
    type: string,
    format: string,
    options?: any,
  ): Promise<Buffer> {
    if (format === 'pdf') {
      return this.generatePdf(userId, type, options);
    }
    if (format === 'excel') {
      return this.generateExcel(userId, type, options);
    }
    if (format === 'csv') {
      const csv = await this.generateCsv(userId, type, options);
      return Buffer.from(csv, 'utf-8');
    }
    throw new Error(`Unsupported format: ${format}`);
  }

  private async getReportData(userId: string, type: string, options?: any): Promise<any> {
    const groupId = options?.groupId;
    if (type === 'custom') {
      return this.getCustomReport(userId, options);
    }
    if (type === 'monthly') {
      return this.getMonthlyReport(userId, parseInt(options?.months) || 6, groupId);
    }
    if (type === 'annual') {
      return this.getAnnualReport(
        userId,
        parseInt(options?.year) || new Date().getFullYear(),
        groupId,
      );
    }
    if (type === 'category' || type === 'categories') {
      return this.getCategoryReport(userId, options?.startDate, options?.endDate, groupId);
    }
    throw new Error(`Unsupported report type: ${type}`);
  }

  async getCustomReport(userId: string, options?: any) {
    const end = options?.endDate ? new Date(options.endDate) : new Date();
    const start = options?.startDate
      ? new Date(options.startDate)
      : new Date(end.getFullYear(), end.getMonth() - 2, 1);
    const categoryId = options?.categoryId;
    const groupId = options?.groupId;

    if (groupId) {
      const member = await this.prisma.sharedGroupMember.findUnique({
        where: { groupId_userId: { groupId, userId } },
      });
      if (!member || !member.isActive) {
        throw new ForbiddenException('You are not a member of this group');
      }
      const groupExpenses = await this.prisma.sharedExpense.findMany({
        where: {
          groupId,
          date: { gte: start, lte: end },
          ...(categoryId ? { category: categoryId } : {}),
        },
        orderBy: { date: 'desc' },
      });
      const totalExpense = groupExpenses.reduce((s, e) => s + Number(e.amount), 0);
      return {
        type: 'custom',
        title: 'Custom Group Report',
        dateRange: { start, end },
        summary: { totalExpense, transactionCount: groupExpenses.length },
        transactions: groupExpenses.map((e) => ({
          id: e.id,
          description: e.description,
          amount: Number(e.amount),
          category: e.category,
          date: e.date,
          paidBy: e.paidBy,
        })),
        categoryBreakdown: this.buildCategoryBreakdown(groupExpenses, 'category'),
      };
    }

    const where: any = {
      userId,
      date: { gte: start, lte: end },
      deletedAt: null,
    };
    if (categoryId) {
      where.categoryId = categoryId;
    }

    const transactions = await this.prisma.transaction.findMany({
      where,
      include: { category: true },
      orderBy: { date: 'desc' },
    });

    const incomeTransactions = transactions.filter((t) => t.type === 'income');
    const expenseTransactions = transactions.filter((t) => t.type === 'expense');

    const totalIncome = incomeTransactions.reduce((s, t) => s + Number(t.amount), 0);
    const totalExpense = expenseTransactions.reduce((s, t) => s + Number(t.amount), 0);

    const dailyMap = new Map<string, { income: number; expense: number; count: number }>();
    for (const t of transactions) {
      const key = t.date.toISOString().split('T')[0];
      const existing = dailyMap.get(key) || { income: 0, expense: 0, count: 0 };
      if (t.type === 'income') {
        existing.income += Number(t.amount);
      } else {
        existing.expense += Number(t.amount);
      }
      existing.count++;
      dailyMap.set(key, existing);
    }

    return {
      type: 'custom',
      title: 'Custom Report',
      dateRange: { start, end },
      summary: {
        totalIncome,
        totalExpense,
        savings: totalIncome - totalExpense,
        transactionCount: transactions.length,
        incomeCount: incomeTransactions.length,
        expenseCount: expenseTransactions.length,
      },
      daily: Array.from(dailyMap.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      categoryBreakdown: this.buildCategoryBreakdown(expenseTransactions, 'categoryId'),
      topIncome: incomeTransactions.sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, 5),
      topExpenses: expenseTransactions
        .sort((a, b) => Number(b.amount) - Number(a.amount))
        .slice(0, 5),
    };
  }

  private buildCategoryBreakdown(items: any[], key: string) {
    const catMap = new Map<string, { name: string; amount: number; count: number }>();
    for (const item of items) {
      const catKey = item[key] || 'uncategorized';
      const name = item.category?.name || item.category || 'Uncategorized';
      const existing = catMap.get(catKey) || { name, amount: 0, count: 0 };
      existing.amount += Number(item.amount);
      existing.count++;
      catMap.set(catKey, existing);
    }
    const cats = Array.from(catMap.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.amount - a.amount);
    const total = cats.reduce((s, c) => s + c.amount, 0);
    return cats.map((c) => ({
      ...c,
      percentage: total > 0 ? Math.round((c.amount / total) * 100) : 0,
    }));
  }

  async generatePdf(userId: string, type: string, options?: any): Promise<Buffer> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => buffers.push(chunk));

    const data = await this.getReportData(userId, type, options);

    return new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      doc
        .fontSize(24)
        .font('Helvetica-Bold')
        .fillColor('#F7892C')
        .text('Dabbu', { align: 'center' });
      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#666')
        .text('Smart Family Finance', { align: 'center' });
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#E0E0E0').stroke();
      doc.moveDown(0.5);

      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .fillColor('#333')
        .text(`${type.charAt(0).toUpperCase() + type.slice(1)} Report`, { align: 'center' });
      doc.moveDown(0.3);
      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#666')
        .text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
      if (data.dateRange) {
        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#666')
          .text(
            `Period: ${new Date(data.dateRange.start).toLocaleDateString()} - ${new Date(data.dateRange.end).toLocaleDateString()}`,
            { align: 'center' },
          );
      }
      doc.moveDown(1);

      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor('#333')
        .text('Summary', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica').fillColor('#333');
      doc.text(`Report Type: ${type}`);
      doc.text(`Generated: ${new Date().toLocaleString()}`);
      doc.moveDown(0.5);

      if (data?.summary) {
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#333').text('Financial Summary');
        doc.fontSize(10).font('Helvetica').fillColor('#333');
        Object.entries(data.summary).forEach(([key, val]) => {
          doc.text(
            `  ${key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}: ${val}`,
          );
        });
        doc.moveDown(1);
      }

      if (data?.monthly) {
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#333').text('Monthly Breakdown');
        doc.fontSize(10).font('Helvetica').fillColor('#333');
        data.monthly.forEach((m: any) => {
          doc.text(`  ${m.month}: Income=${m.income}, Expense=${m.expense}, Savings=${m.savings}`);
        });
        doc.moveDown(1);
      }

      if (data?.categoryBreakdown || data?.categories) {
        const cats = data.categoryBreakdown || data.categories || [];
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#333').text('Category Breakdown');
        doc.fontSize(10).font('Helvetica').fillColor('#333');
        cats.forEach((c: any) => {
          doc.text(`  ${c.name}: ${c.amount} (${c.percentage || ''}${c.percentage ? '%' : ''})`);
        });
      }

      doc.moveDown(2);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#E0E0E0').stroke();
      doc.moveDown(0.5);
      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#999')
        .text('Dabbu - Smart Family Finance', { align: 'center' });
      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#999')
        .text('This is a computer-generated report.', { align: 'center' });

      doc.end();
    });
  }

  async generateExcel(userId: string, type: string, options?: any): Promise<Buffer> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ExcelJS = require('exceljs');
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Dabbu';
    wb.created = new Date();

    const data = await this.getReportData(userId, type, options);

    const summarySheet = wb.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 25 },
      { header: 'Value', key: 'value', width: 20 },
    ];
    summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF7892C' },
    };
    summarySheet.addRow({ metric: 'Report Type', value: type });
    summarySheet.addRow({ metric: 'Generated', value: new Date().toLocaleString() });

    if (data?.summary) {
      Object.entries(data.summary).forEach(([key, val]) => {
        summarySheet.addRow({
          metric: key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()),
          value: val,
        });
      });
    }

    if (data?.dateRange) {
      summarySheet.addRow({
        metric: 'Start Date',
        value: new Date(data.dateRange.start).toLocaleDateString(),
      });
      summarySheet.addRow({
        metric: 'End Date',
        value: new Date(data.dateRange.end).toLocaleDateString(),
      });
    }

    const detailsSheet = wb.addWorksheet('Details');
    detailsSheet.columns = [
      { header: 'Month', key: 'month', width: 14 },
      { header: 'Income', key: 'income', width: 16 },
      { header: 'Expense', key: 'expense', width: 16 },
      { header: 'Savings', key: 'savings', width: 16 },
      { header: 'Count', key: 'count', width: 10 },
    ];
    detailsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    detailsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF7892C' },
    };

    if (data?.monthly) {
      data.monthly.forEach((m: any) => {
        detailsSheet.addRow({
          month: m.month,
          income: m.income,
          expense: m.expense,
          savings: m.savings,
          count: m.count,
        });
      });
    }

    const catSheet = wb.addWorksheet('Category Breakdown');
    catSheet.columns = [
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Amount', key: 'amount', width: 16 },
      { header: 'Count', key: 'count', width: 10 },
      { header: 'Percentage', key: 'percentage', width: 14 },
    ];
    catSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    catSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7892C' } };

    const cats = data?.categoryBreakdown || data?.categories || [];
    cats.forEach((c: any) => {
      catSheet.addRow({
        category: c.name,
        amount: c.amount,
        count: c.count || 0,
        percentage: c.percentage ? `${c.percentage}%` : '',
      });
    });

    const buffer = await wb.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async generateCsv(userId: string, type: string, options?: any): Promise<string> {
    const data = await this.getReportData(userId, type, options);
    const lines: string[] = [];

    lines.push(`Report Type,${type}`);
    lines.push(`Generated,${new Date().toLocaleString()}`);
    if (data?.dateRange) {
      lines.push(`Start Date,${new Date(data.dateRange.start).toLocaleDateString()}`);
      lines.push(`End Date,${new Date(data.dateRange.end).toLocaleDateString()}`);
    }
    lines.push('');

    if (data?.summary) {
      lines.push('Summary');
      lines.push('Metric,Value');
      Object.entries(data.summary).forEach(([key, val]) => {
        lines.push(
          `${key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())},${val}`,
        );
      });
      lines.push('');
    }

    if (data?.monthly) {
      lines.push('Monthly Breakdown');
      lines.push('Month,Income,Expense,Savings,Count');
      data.monthly.forEach((m: any) => {
        lines.push(`${m.month},${m.income},${m.expense},${m.savings},${m.count}`);
      });
      lines.push('');
    }

    if (data?.categoryBreakdown || data?.categories) {
      const cats = data.categoryBreakdown || data.categories || [];
      lines.push('Category Breakdown');
      lines.push('Category,Amount,Count,Percentage');
      cats.forEach((c: any) => {
        lines.push(
          `${c.name},${c.amount},${c.count || 0},${c.percentage ? `${c.percentage}%` : ''}`,
        );
      });
    }

    return lines.join('\n');
  }
}

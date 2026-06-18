import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationEventsService } from './notification-events.service';

@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationEvents: NotificationEventsService,
  ) {}

  @Cron('0 20 * * *')
  async handleDailyDigest() {
    this.logger.log('Running daily digest notifications...');
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const users = await this.prisma.user.findMany({
      where: { isActive: true, deletedAt: null },
      select: { id: true },
    });

    let sent = 0;
    for (const user of users) {
      try {
        const settings = await this.prisma.settings.findUnique({ where: { userId: user.id } });
        if (settings && settings.pushNotifications === false) {continue;}

        const [todayTransactions, monthTransactions, budgets] = await Promise.all([
          this.prisma.transaction.aggregate({
            where: { userId: user.id, date: { gte: todayStart }, type: 'expense', deletedAt: null },
            _sum: { amount: true },
            _count: true,
          }),
          this.prisma.transaction.aggregate({
            where: { userId: user.id, date: { gte: monthStart }, type: 'expense', deletedAt: null },
            _sum: { amount: true },
          }),
          this.prisma.budget.aggregate({
            where: { userId: user.id, isActive: true },
            _sum: { amount: true, spent: true },
          }),
        ]);

        const todaySpent = Number(todayTransactions._sum.amount || 0);
        const monthSpent = Number(monthTransactions._sum.amount || 0);
        const totalBudget = Number(budgets._sum.amount || 0);
        const remainingBudget = Math.max(0, totalBudget - monthSpent);

        await this.notificationEvents.dailyDigest(user.id, {
          todaySpent,
          monthSpent,
          remainingBudget,
          transactions: todayTransactions._count,
        });
        sent++;
      } catch (err: any) {
        this.logger.error(`Daily digest failed for user ${user.id}: ${err.message}`);
      }
    }
    this.logger.log(`Daily digest sent to ${sent} users`);
  }

  @Cron('0 10 * * 0')
  async handleWeeklyDigest() {
    this.logger.log('Running weekly digest notifications...');
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const users = await this.prisma.user.findMany({
      where: { isActive: true, deletedAt: null },
      select: { id: true },
    });

    let sent = 0;
    for (const user of users) {
      try {
        const settings = await this.prisma.settings.findUnique({ where: { userId: user.id } });
        if (settings && (settings.pushNotifications === false || settings.weeklyReport === false)) {continue;}

        const [weekExpenses, goals, upcomingReminders] = await Promise.all([
          this.prisma.transaction.aggregate({
            where: { userId: user.id, date: { gte: weekStart }, type: 'expense', deletedAt: null },
            _sum: { amount: true },
          }),
          this.prisma.goal.findMany({
            where: { userId: user.id, deletedAt: null },
            select: { name: true, targetAmount: true, currentAmount: true },
          }),
          this.prisma.reminder.count({
            where: { userId: user.id, deletedAt: null, status: 'active', remindAt: { gte: now } },
          }),
        ]);

        const totalSpent = Number(weekExpenses._sum.amount || 0);
        const savings = Math.max(0, totalSpent * 0.2);
        const goalsProgress = goals.map(g => ({
          name: g.name,
          progress: g.targetAmount.toNumber() > 0 ? Number(g.currentAmount) / Number(g.targetAmount) * 100 : 0,
        }));

        await this.notificationEvents.weeklyDigest(user.id, {
          totalSpent,
          savings: Math.round(savings),
          goalsProgress,
          upcomingReminders,
        });

        const prevWeekStart = new Date(weekStart);
        prevWeekStart.setDate(prevWeekStart.getDate() - 7);
        const [prevWeekCategoryAgg, thisWeekCategoryAgg] = await Promise.all([
          this.prisma.transaction.groupBy({
            by: ['categoryId'],
            where: { userId: user.id, date: { gte: prevWeekStart, lt: weekStart }, type: 'expense', deletedAt: null },
            _sum: { amount: true },
          }),
          this.prisma.transaction.groupBy({
            by: ['categoryId'],
            where: { userId: user.id, date: { gte: weekStart, lt: now }, type: 'expense', deletedAt: null },
            _sum: { amount: true },
          }),
        ]);

        for (const cat of thisWeekCategoryAgg) {
          const prevCat = prevWeekCategoryAgg.find(c => c.categoryId === cat.categoryId);
          const thisAmount = Number(cat._sum.amount || 0);
          const prevAmount = Number(prevCat?._sum.amount || 0);
          if (prevAmount > 0 && thisAmount > 0) {
            const changePercent = Math.round(((thisAmount - prevAmount) / prevAmount) * 100);
            if (Math.abs(changePercent) >= 30) {
              this.notificationEvents.spendingChange(user.id, {
                category: cat.categoryId || 'Uncategorized',
                change: Math.abs(changePercent),
                direction: changePercent > 0 ? 'up' : 'down',
              }).catch((err) => this.logger.warn(`Spending change notification failed: ${err.message}`));
            }
          }
        }
        sent++;
      } catch (err: any) {
        this.logger.error(`Weekly digest failed for user ${user.id}: ${err.message}`);
      }
    }
    this.logger.log(`Weekly digest sent to ${sent} users`);
  }

  @Cron('0 9 1 * *')
  async handleMonthlyReport() {
    this.logger.log('Running monthly report notifications...');
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const users = await this.prisma.user.findMany({
      where: { isActive: true, deletedAt: null },
      select: { id: true },
    });

    let sent = 0;
    for (const user of users) {
      try {
        const settings = await this.prisma.settings.findUnique({ where: { userId: user.id } });
        if (settings && (settings.pushNotifications === false || settings.monthlyReport === false)) {continue;}

        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        const [expenses, incomes, categoryAgg, prevMonthCategoryAgg, goals] = await Promise.all([
          this.prisma.transaction.aggregate({
            where: { userId: user.id, date: { gte: monthStart, lte: monthEnd }, type: 'expense', deletedAt: null },
            _sum: { amount: true },
          }),
          this.prisma.transaction.aggregate({
            where: { userId: user.id, date: { gte: monthStart, lte: monthEnd }, type: 'income', deletedAt: null },
            _sum: { amount: true },
          }),
          this.prisma.transaction.groupBy({
            by: ['categoryId'],
            where: { userId: user.id, date: { gte: monthStart, lte: monthEnd }, type: 'expense', deletedAt: null },
            _sum: { amount: true },
            orderBy: { _sum: { amount: 'desc' } },
            take: 5,
          }),
          this.prisma.transaction.groupBy({
            by: ['categoryId'],
            where: { userId: user.id, date: { gte: prevMonthStart, lt: monthStart }, type: 'expense', deletedAt: null },
            _sum: { amount: true },
            orderBy: { _sum: { amount: 'desc' } },
            take: 5,
          }),
          this.prisma.goal.findMany({
            where: { userId: user.id, deletedAt: null },
            select: { name: true, targetAmount: true, currentAmount: true },
          }),
        ]);

        const totalExpense = Number(expenses._sum.amount || 0);
        const totalIncome = Number(incomes._sum.amount || 0);
        const savings = Math.max(0, totalIncome - totalExpense);
        const topCategory = categoryAgg[0]?.categoryId || 'Uncategorized';

        for (const cat of categoryAgg) {
          const prevCat = prevMonthCategoryAgg.find(c => c.categoryId === cat.categoryId);
          const currentAmount = Number(cat._sum.amount || 0);
          const prevAmount = Number(prevCat?._sum.amount || 0);
          if (prevAmount > 0 && currentAmount > prevAmount * 1.5) {
            const increase = currentAmount - prevAmount;
            const percent = Math.round((increase / prevAmount) * 100);
            this.notificationEvents.spendingSpike(user.id, {
              category: cat.categoryId || 'Unknown',
              currentMonth: currentAmount,
              lastMonth: prevAmount,
              increase: Math.round(increase),
              percent,
            }).catch((err) => this.logger.warn(`Spending spike notification failed: ${err.message}`));
          }
        }
        const goalProgress = goals.map(g => ({
          name: g.name,
          progress: g.targetAmount.toNumber() > 0 ? Number(g.currentAmount) / Number(g.targetAmount) * 100 : 0,
        }));
        const healthScore = Math.min(100, Math.max(0, Math.round((totalIncome > 0 ? savings / totalIncome * 100 : 50))));

        const roundedSavings = Math.round(savings);
        await this.notificationEvents.monthlyReport(user.id, {
          totalExpense,
          totalIncome,
          savings: roundedSavings,
          topCategory,
          goalProgress,
          healthScore,
        });

        if (roundedSavings > 0) {
          const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
          const prevMonth = monthNames[(now.getMonth() - 1 + 12) % 12];
          this.notificationEvents.monthlySavings(user.id, {
            savedAmount: roundedSavings,
            month: prevMonth,
          }).catch((err) => this.logger.warn(`Monthly savings notification failed: ${err.message}`));
        }
        sent++;
      } catch (err: any) {
        this.logger.error(`Monthly report failed for user ${user.id}: ${err.message}`);
      }
    }
    this.logger.log(`Monthly report sent to ${sent} users`);
  }
}

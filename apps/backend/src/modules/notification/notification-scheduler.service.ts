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

        const [expenses, incomes, categoryAgg, goals] = await Promise.all([
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
            take: 1,
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
        const goalProgress = goals.map(g => ({
          name: g.name,
          progress: g.targetAmount.toNumber() > 0 ? Number(g.currentAmount) / Number(g.targetAmount) * 100 : 0,
        }));
        const healthScore = Math.min(100, Math.max(0, Math.round((totalIncome > 0 ? savings / totalIncome * 100 : 50))));

        await this.notificationEvents.monthlyReport(user.id, {
          totalExpense,
          totalIncome,
          savings: Math.round(savings),
          topCategory,
          goalProgress,
          healthScore,
        });
        sent++;
      } catch (err: any) {
        this.logger.error(`Monthly report failed for user ${user.id}: ${err.message}`);
      }
    }
    this.logger.log(`Monthly report sent to ${sent} users`);
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async trackStreak(userId: string, type: string) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const streak = await this.prisma.userStreak.findUnique({
      where: { userId_streakType: { userId, streakType: type } },
    });

    let isConsecutive = false;
    if (streak?.lastActivityAt) {
      const last = new Date(streak.lastActivityAt);
      const lastDay = new Date(last.getFullYear(), last.getMonth(), last.getDate());
      const diffDays = Math.round((today.getTime() - lastDay.getTime()) / (1000 * 60 * 60 * 24));

      if (type === 'daily' || type === 'financial') isConsecutive = diffDays === 1 || diffDays === 0;
      if (type === 'weekly') isConsecutive = diffDays <= 7;
      if (type === 'monthly') isConsecutive = diffDays <= 31;
      if (type === 'savings' || type === 'goal_progress' || type === 'bill_payment') isConsecutive = diffDays <= 7;
    }

    if (!streak) {
      await this.prisma.userStreak.create({
        data: { userId, streakType: type, currentStreak: 1, longestStreak: 1, lastActivityAt: now },
      });
    } else if (isConsecutive) {
      const newStreak = streak.currentStreak + 1;
      await this.prisma.userStreak.update({
        where: { id: streak.id },
        data: {
          currentStreak: newStreak,
          longestStreak: Math.max(newStreak, streak.longestStreak),
          lastActivityAt: now,
        },
      });
    } else if (!isConsecutive && streak.lastActivityAt) {
      const last = new Date(streak.lastActivityAt);
      const lastDay = new Date(last.getFullYear(), last.getMonth(), last.getDate());
      const diffDays = Math.round((today.getTime() - lastDay.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 1 && type !== 'savings' && type !== 'goal_progress' && type !== 'bill_payment') {
        await this.prisma.userStreak.update({
          where: { id: streak.id },
          data: { currentStreak: 1, lastActivityAt: now },
        });
      }
    }

    return this.prisma.userStreak.findUnique({
      where: { userId_streakType: { userId, streakType: type } },
    });
  }

  async getUserStreaks(userId: string) {
    return this.prisma.userStreak.findMany({ where: { userId } });
  }

  async getYearlySummary(userId: string, year: number) {
    return this.prisma.yearlySummary.findUnique({
      where: { userId_year: { userId, year } },
    });
  }

  async generateYearlySummary(userId: string, year: number) {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59, 999);

    const [transactions, goals, bills, streaks, healthScores] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { userId, date: { gte: startDate, lte: endDate }, deletedAt: null },
      }),
      this.prisma.goal.findMany({
        where: { userId, deletedAt: null },
      }),
      this.prisma.bill.findMany({
        where: { userId, deletedAt: null },
      }),
      this.prisma.userStreak.findMany({ where: { userId } }),
      this.prisma.aiScore.findMany({
        where: { userId, createdAt: { gte: startDate, lte: endDate } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    const netSavings = totalIncome - totalExpense;
    const goalsCompleted = goals.filter(g => g.isCompleted).length;
    const billsPaid = bills.filter(b => b.isPaid).length;

    const categoryTotals: Record<string, number> = {};
    for (const t of transactions.filter(t => t.type === 'expense')) {
      if (t.categoryId) categoryTotals[t.categoryId] = (categoryTotals[t.categoryId] || 0) + Number(t.amount);
    }
    const topCategory = Object.entries(categoryTotals).sort(([, a], [, b]) => b - a)[0]?.[0] || null;
    const topCategoryAmount = topCategory ? categoryTotals[topCategory] : 0;

    const monthByMonth: any[] = [];
    for (let m = 0; m < 12; m++) {
      const ms = new Date(year, m, 1);
      const me = new Date(year, m + 1, 0, 23, 59, 59, 999);
      const monthTxns = transactions.filter(t => t.date >= ms && t.date <= me);
      monthByMonth.push({
        month: m + 1,
        income: monthTxns.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0),
        expense: monthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0),
        count: monthTxns.length,
      });
    }

    const longestStreak = Math.max(...streaks.map(s => s.longestStreak), 0);
    const healthScoreAvg = healthScores.length > 0
      ? healthScores.reduce((s, h) => s + Number(h.overallScore || 0), 0) / healthScores.length
      : 0;

    const summary = await this.prisma.yearlySummary.upsert({
      where: { userId_year: { userId, year } },
      update: {
        totalIncome, totalExpense, netSavings,
        topCategory: topCategory || undefined,
        topCategoryAmount,
        goalsCompleted,
        goalsCreated: goals.length,
        billsPaid,
        transactionsCount: transactions.length,
        longestStreak,
        healthScoreAvg: Math.round(healthScoreAvg * 100) / 100,
        monthByMonth,
        insights: this._generateInsights(totalIncome, totalExpense, netSavings, goalsCompleted, longestStreak, healthScoreAvg),
        generatedAt: new Date(),
      },
      create: {
        userId, year,
        totalIncome, totalExpense, netSavings,
        topCategory: topCategory || undefined,
        topCategoryAmount,
        goalsCompleted,
        goalsCreated: goals.length,
        billsPaid,
        transactionsCount: transactions.length,
        longestStreak,
        healthScoreAvg: Math.round(healthScoreAvg * 100) / 100,
        monthByMonth,
        insights: this._generateInsights(totalIncome, totalExpense, netSavings, goalsCompleted, longestStreak, healthScoreAvg),
      },
    });

    return summary;
  }

  private _generateInsights(
    income: number, expense: number, savings: number,
    goalsCompleted: number, longestStreak: number, healthScore: number,
  ) {
    const insights: string[] = [];
    const savingsRate = income > 0 ? (savings / income) * 100 : 0;
    if (savingsRate >= 20) insights.push('Great job saving over 20% of your income this year!');
    else if (savingsRate >= 10) insights.push('You saved over 10% of your income - keep building that habit.');
    else if (savingsRate < 0) insights.push('Your expenses exceeded your income this year. Consider reviewing your budget.');
    if (goalsCompleted >= 3) insights.push(`Amazing - you completed ${goalsCompleted} financial goals this year!`);
    else if (goalsCompleted >= 1) insights.push(`You completed ${goalsCompleted} goal(s) this year. Set more for next year!`);
    if (longestStreak >= 30) insights.push(`You maintained a ${longestStreak}-day tracking streak - consistency is key!`);
    else if (longestStreak >= 7) insights.push(`Your best streak was ${longestStreak} days. Can you beat that next year?`);
    if (healthScore >= 80) insights.push('Your financial health score is excellent. Keep it up!');
    else if (healthScore < 50) insights.push('Your financial health score needs attention. Check your AI insights for tips.');
    return { insights, savingsRate: Math.round(savingsRate * 100) / 100 };
  }

  async getEngagement(userId: string) {
    let engagement = await this.prisma.userEngagement.findUnique({ where: { userId } });
    if (!engagement) {
      engagement = await this.prisma.userEngagement.create({
        data: { userId, lastActionAt: new Date(), reEngagementStage: 'active' },
      });
    }
    return engagement;
  }

  async trackAction(userId: string) {
    const now = new Date();
    await this.prisma.userEngagement.upsert({
      where: { userId },
      update: { lastActionAt: now, reEngagementStage: 'active', reEngagementSentCount: 0 },
      create: { userId, lastActionAt: now, reEngagementStage: 'active' },
    });
    await this.trackStreak(userId, 'daily');
  }

  async trackFinancialAction(userId: string) {
    await this.trackStreak(userId, 'financial');
  }

  async trackSavingsAction(userId: string) {
    await this.trackStreak(userId, 'savings');
  }

  async trackGoalProgress(userId: string) {
    await this.trackStreak(userId, 'goal_progress');
  }

  async trackBillPayment(userId: string) {
    await this.trackStreak(userId, 'bill_payment');
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async generateDailyYearlySummaries() {
    this.logger.log('Checking for yearly summary generation...');
    const now = new Date();
    if (now.getMonth() !== 0 || now.getDate() !== 1) return;
    const lastYear = now.getFullYear() - 1;
    const users = await this.prisma.user.findMany({
      where: { isActive: true, deletedAt: null },
      select: { id: true },
    });
    for (const user of users) {
      try {
        await this.generateYearlySummary(user.id, lastYear);
      } catch (err: any) {
        this.logger.error(`Failed to generate yearly summary for user ${user.id}: ${err.message}`);
      }
    }
    this.logger.log(`Generated yearly summaries for ${users.length} users`);
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class HealthScoreService {
  constructor(private readonly prisma: PrismaService) {}

  async getScore(entityType: 'USER' | 'SPACE', entityId: string) {
    const existing = await this.prisma.healthScore.findUnique({
      where: { entityType_entityId: { entityType, entityId } },
    });

    if (existing) {
      return {
        score: existing.score,
        breakdown: existing.breakdownJson as any,
        calculatedAt: existing.calculatedAt,
      };
    }

    const score = 70;
    const breakdown = { savingsRate: 0, expenseRatio: 0, goalProgress: 0, stability: 70 };
    const calculatedAt = new Date();

    await this.prisma.healthScore.upsert({
      where: { entityType_entityId: { entityType, entityId } },
      create: { entityType, entityId, score, breakdownJson: breakdown, calculatedAt },
      update: { score, breakdownJson: breakdown, calculatedAt },
    });

    return { score, breakdown, calculatedAt };
  }

  async recalculate(userId: string) {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const [incomeAgg, expenseAgg, goals] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { userId, type: 'income', date: { gte: threeMonthsAgo }, deletedAt: null },
        _avg: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { userId, type: 'expense', date: { gte: threeMonthsAgo }, deletedAt: null },
        _avg: { amount: true },
      }),
      this.prisma.goal.findMany({
        where: { userId, deletedAt: null },
        select: { targetAmount: true, currentAmount: true },
      }),
    ]);

    const avgMonthlyIncome = Number(incomeAgg._avg.amount || 0);
    const avgMonthlyExpense = Number(expenseAgg._avg.amount || 0);

    const savingsRate = avgMonthlyIncome > 0
      ? Math.round(((avgMonthlyIncome - avgMonthlyExpense) / avgMonthlyIncome) * 100)
      : 0;

    const expenseRatio = avgMonthlyIncome > 0
      ? Math.round((avgMonthlyExpense / avgMonthlyIncome) * 100)
      : 100;

    const totalTarget = goals.reduce((s, g) => s + Number(g.targetAmount), 0);
    const totalCurrent = goals.reduce((s, g) => s + Number(g.currentAmount), 0);
    const goalProgress = totalTarget > 0
      ? Math.round((totalCurrent / totalTarget) * 100)
      : 0;

    const stability = Math.min(100, Math.max(0,
      70
      + (savingsRate > 20 ? 10 : savingsRate > 10 ? 5 : 0)
      - (expenseRatio > 80 ? 15 : expenseRatio > 60 ? 5 : 0)
      + (goalProgress > 50 ? 10 : goalProgress > 25 ? 5 : 0)
    ));

    let score = 70;
    score += expenseRatio < 50 ? 10 : expenseRatio > 80 ? -15 : -5;
    score += savingsRate > 20 ? 10 : savingsRate > 10 ? 5 : 0;
    score += goalProgress > 50 ? 10 : goalProgress > 25 ? 5 : 0;
    score = Math.min(100, Math.max(0, score));

    const breakdown = { savingsRate, expenseRatio, goalProgress, stability };
    const calculatedAt = new Date();

    await this.prisma.healthScore.upsert({
      where: { entityType_entityId: { entityType: 'USER', entityId: userId } },
      create: { entityType: 'USER', entityId: userId, score, breakdownJson: breakdown, calculatedAt },
      update: { score, breakdownJson: breakdown, calculatedAt },
    });

    return { score, breakdown, calculatedAt };
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LensDataService } from '../../common/lens/lens-data.service';

interface ScoreBreakdown {
  [key: string]: number;
  savingsRate: number;
  expenseRatio: number;
  goalProgress: number;
  stability: number;
}

@Injectable()
export class DabbuScoreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lensData: LensDataService,
  ) {}

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
    const breakdown: ScoreBreakdown = { savingsRate: 0, expenseRatio: 0, goalProgress: 0, stability: 70 };
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
    const lensFilter = await this.lensData.buildLensFilter(userId);

    const [incomeAgg, expenseAgg, goals] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { userId, ...lensFilter, type: 'income', date: { gte: threeMonthsAgo }, deletedAt: null },
        _avg: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { userId, ...lensFilter, type: 'expense', date: { gte: threeMonthsAgo }, deletedAt: null },
        _avg: { amount: true },
      }),
      this.prisma.goal.findMany({
        where: { userId, ...lensFilter, deletedAt: null },
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

    const breakdown: ScoreBreakdown = { savingsRate, expenseRatio, goalProgress, stability };
    const calculatedAt = new Date();

    await this.prisma.healthScore.upsert({
      where: { entityType_entityId: { entityType: 'USER', entityId: userId } },
      create: { entityType: 'USER', entityId: userId, score, breakdownJson: breakdown, calculatedAt },
      update: { score, breakdownJson: breakdown, calculatedAt },
    });

    return { score, breakdown, calculatedAt };
  }

  async getHistory(userId: string) {
    const scores = await this.prisma.healthScore.findMany({
      where: { userId, entityType: 'USER' },
      orderBy: { calculatedAt: 'desc' },
      take: 6,
    });

    if (scores.length === 0) {
      return [];
    }

    return scores.map((s) => ({
      score: s.score,
      date: s.calculatedAt,
    }));
  }

  async getComponents(entityType: 'USER' | 'SPACE', entityId: string) {
    const existing = await this.prisma.healthScore.findUnique({
      where: { entityType_entityId: { entityType, entityId } },
    });

    if (!existing || !existing.breakdownJson) {
      return { savingsRate: 0, expenseRatio: 0, goalProgress: 0, stability: 70 };
    }

    return existing.breakdownJson;
  }

  async getImprovements(userId: string) {
    const result = await this.recalculate(userId);
    const breakdown = result.breakdown as ScoreBreakdown;
    const suggestions: { category: string; message: string; priority: 'high' | 'medium' | 'low' }[] = [];

    if (breakdown.expenseRatio > 80) {
      suggestions.push({
        category: 'expenses',
        message: 'Your expenses exceed 80% of income. Try reducing discretionary spending.',
        priority: 'high',
      });
    } else if (breakdown.expenseRatio > 60) {
      suggestions.push({
        category: 'expenses',
        message: 'Your expense ratio is above 60%. Consider tracking and trimming non-essentials.',
        priority: 'medium',
      });
    }

    if (breakdown.savingsRate < 10) {
      suggestions.push({
        category: 'savings',
        message: 'Your savings rate is under 10%. Aim to save at least 20% of your income.',
        priority: 'high',
      });
    } else if (breakdown.savingsRate < 20) {
      suggestions.push({
        category: 'savings',
        message: 'Good start on savings! Try increasing to 20% for a stronger cushion.',
        priority: 'medium',
      });
    }

    if (breakdown.goalProgress < 25) {
      suggestions.push({
        category: 'goals',
        message: 'You are less than 25% toward your goals. Consider increasing contributions.',
        priority: 'medium',
      });
    } else if (breakdown.goalProgress < 50) {
      suggestions.push({
        category: 'goals',
        message: 'You are making progress on goals. Keep up the momentum!',
        priority: 'low',
      });
    }

    if (breakdown.stability < 50) {
      suggestions.push({
        category: 'stability',
        message: 'Your financial stability score is low. Building an emergency fund may help.',
        priority: 'high',
      });
    }

    return suggestions;
  }
}

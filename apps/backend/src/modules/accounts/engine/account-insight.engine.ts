import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

export interface SpendingInsight {
  type: 'spending_increase' | 'spending_decrease' | 'unusual_spending' | 'recurring_detected' | 'savings_opportunity' | 'budget_alert';
  category: string;
  title: string;
  description: string;
  percentageChange?: number;
  currentAmount: number;
  previousAmount?: number;
  severity: 'low' | 'medium' | 'high';
  recommendation?: string;
}

export interface RecurringPattern {
  merchant: string;
  estimatedAmount: number;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  confidence: number;
  lastDetected: string;
  category: string;
}

@Injectable()
export class AccountInsightEngine {
  constructor(private readonly prisma: PrismaService) {}

  async generateSpendingInsights(userId: string): Promise<SpendingInsight[]> {
    const insights: SpendingInsight[] = [];
    const now = new Date();
    const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentEnd = now;
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const categories = await this.prisma.transactionCategory.findMany({
      where: { userId, transactionType: 'expense' },
    });

    for (const cat of categories) {
      const currentSpend = await this.getSpending(userId, cat.id, currentStart, currentEnd);
      const previousSpend = await this.getSpending(userId, cat.id, prevStart, prevEnd);

      if (currentSpend <= 0 && previousSpend <= 0) {continue;}

      if (previousSpend > 0) {
        const change = ((currentSpend - previousSpend) / previousSpend) * 100;

        if (change > 30 && currentSpend > 1000) {
          insights.push({
            type: 'spending_increase',
            category: cat.name,
            title: `${cat.name} spending up ${Math.round(change)}%`,
            description: `You spent ₹${Math.round(currentSpend).toLocaleString('en-IN')} on ${cat.name.toLowerCase()} this month.`,
            percentageChange: Math.round(change),
            currentAmount: currentSpend,
            previousAmount: previousSpend,
            severity: change > 50 ? 'high' : 'medium',
            recommendation: `Review your ${cat.name.toLowerCase()} expenses for potential savings.`,
          });
        }

        if (change < -20 && currentSpend > 500) {
          insights.push({
            type: 'spending_decrease',
            category: cat.name,
            title: `${cat.name} spending down ${Math.round(Math.abs(change))}%`,
            description: `Great savings on ${cat.name.toLowerCase()} this month!`,
            percentageChange: Math.round(change),
            currentAmount: currentSpend,
            previousAmount: previousSpend,
            severity: 'low',
            recommendation: 'Keep up the good savings habits!',
          });
        }
      }

      const budgets = await this.prisma.budget.findFirst({
        where: {
          userId,
          categoryId: cat.id,
          startDate: { lte: now },
          endDate: { gte: now },
          isActive: true,
        },
      });

      if (budgets && currentSpend > Number(budgets.amount) * 0.8) {
        const pct = Math.round((currentSpend / Number(budgets.amount)) * 100);
        insights.push({
          type: 'budget_alert',
          category: cat.name,
          title: `${cat.name} budget at ${pct}%`,
          description: `Used ${pct}% of your ${cat.name.toLowerCase()} budget.`,
          currentAmount: currentSpend,
          previousAmount: Number(budgets.amount),
          severity: 'high',
          recommendation: `Reduce ${cat.name.toLowerCase()} spending to stay within budget.`,
        });
      }
    }

    const patterns = await this.detectRecurringPatterns(userId);
    const monthlySubs = patterns.filter((p) => p.frequency === 'monthly');
    for (const sub of monthlySubs.slice(0, 2)) {
      insights.push({
        type: 'recurring_detected',
        category: sub.category,
        title: `Recurring: ${sub.merchant}`,
        description: `~₹${Math.round(sub.estimatedAmount).toLocaleString('en-IN')}/mo for ${sub.merchant}`,
        currentAmount: sub.estimatedAmount,
        severity: 'medium',
        recommendation: 'Review if this subscription is still needed.',
      });
    }

    return insights;
  }

  async detectRecurringPatterns(userId: string): Promise<RecurringPattern[]> {
    const patterns: RecurringPattern[] = [];
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const txns = await this.prisma.transaction.findMany({
      where: {
        userId,
        type: 'expense',
        date: { gte: threeMonthsAgo },
      },
      orderBy: { date: 'desc' },
      take: 500,
    });

    const merchantMap = new Map<string, { amounts: number[]; dates: Date[] }>();

    for (const txn of txns) {
      const key = txn.description || 'unknown';
      if (!merchantMap.has(key)) {
        merchantMap.set(key, { amounts: [], dates: [] });
      }
      const entry = merchantMap.get(key)!;
      entry.amounts.push(Number(txn.amount));
      entry.dates.push(txn.date);
    }

    for (const [merchant, data] of merchantMap.entries()) {
      if (data.dates.length < 2) {continue;}

      const intervals: number[] = [];
      for (let i = 1; i < data.dates.length; i++) {
        intervals.push(Math.abs(data.dates[i].getTime() - data.dates[i - 1].getTime()) / 86400000);
      }

      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.map((v) => (v - avgInterval) ** 2).reduce((a, b) => a + b, 0) / intervals.length;
      const stdDev = Math.sqrt(variance);

      if (stdDev / Math.max(avgInterval, 1) < 0.3 && avgInterval < 45) {
        const avgAmount = data.amounts.reduce((a, b) => a + b, 0) / data.amounts.length;

        let frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
        if (avgInterval <= 10) {frequency = 'weekly';}
        else if (avgInterval <= 40) {frequency = 'monthly';}
        else if (avgInterval <= 100) {frequency = 'quarterly';}
        else {frequency = 'yearly';}

        const confidence = Math.min(1, Math.max(0.5, 1 - variance / 100));

        patterns.push({
          merchant,
          estimatedAmount: Math.round(avgAmount * 100) / 100,
          frequency,
          confidence: Math.round(confidence * 100) / 100,
          lastDetected: data.dates[0].toISOString(),
          category: 'expense',
        });
      }
    }

    return patterns.sort((a, b) => b.confidence - a.confidence);
  }

  async getMonthlyTrend(userId: string, months: number = 6): Promise<Array<{ month: string; income: number; expense: number; savings: number }>> {
    const trends: Array<{ month: string; income: number; expense: number; savings: number }> = [];

    for (let i = months - 1; i >= 0; i--) {
      const start = new Date();
      start.setMonth(start.getMonth() - i);
      start.setDate(1);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);

      const income = await this.totalByType(userId, 'income', start, end);
      const expense = await this.totalByType(userId, 'expense', start, end);

      trends.push({
        month: start.toLocaleString('default', { month: 'short', year: '2-digit' }),
        income,
        expense,
        savings: income - expense,
      });
    }

    return trends;
  }

  private async getSpending(userId: string, categoryId: string, start: Date, end: Date): Promise<number> {
    const result = await this.prisma.transaction.aggregate({
      where: {
        userId,
        categoryId,
        type: 'expense',
        date: { gte: start, lte: end },
        status: 'completed',
        deletedAt: null,
      },
      _sum: { amount: true },
    });
    return Number(result._sum.amount || 0);
  }

  private async totalByType(userId: string, type: 'income' | 'expense', start: Date, end: Date): Promise<number> {
    const result = await this.prisma.transaction.aggregate({
      where: { userId, type, date: { gte: start, lte: end }, status: 'completed', deletedAt: null },
      _sum: { amount: true },
    });
    return Number(result._sum.amount || 0);
  }
}

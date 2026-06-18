import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AiFamilyAdvisorService {
  private readonly logger = new Logger(AiFamilyAdvisorService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async getFamilyId(userId: string): Promise<string | null> {
    const membership = await this.prisma.familyMember.findFirst({
      where: { userId, family: { isActive: true } },
      select: { familyId: true },
    });
    return membership?.familyId || null;
  }

  private async getFamilyMemberIds(familyId: string): Promise<string[]> {
    const members = await this.prisma.familyMember.findMany({
      where: { familyId },
      select: { userId: true },
    });
    return members.map((m) => m.userId);
  }

  async generateFamilySpendingReview(userId: string): Promise<any> {
    const familyId = await this.getFamilyId(userId);
    if (!familyId) {
      return { review: null, message: 'No family found' };
    }

    const memberIds = await this.getFamilyMemberIds(familyId);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [currentTxns, prevTxns, familyBills, familyGoals] = await Promise.all([
      this.prisma.transaction.findMany({
        where: {
          userId: { in: memberIds },
          deletedAt: null,
          date: { gte: monthStart, lte: monthEnd },
        },
      }),
      this.prisma.transaction.findMany({
        where: {
          userId: { in: memberIds },
          deletedAt: null,
          date: { gte: prevMonthStart, lte: prevMonthEnd },
        },
      }),
      this.prisma.familyBill.findMany({ where: { familyId } }),
      this.prisma.familyGoal.findMany({ where: { familyId, status: 'active' } }),
    ]);

    const currentIncome = currentTxns
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + Number(t.amount), 0);
    const currentExpense = currentTxns
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + Number(t.amount), 0);
    const prevIncome = prevTxns
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + Number(t.amount), 0);
    const prevExpense = prevTxns
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + Number(t.amount), 0);

    const incomeChange =
      prevIncome > 0 ? Math.round(((currentIncome - prevIncome) / prevIncome) * 100) : 0;
    const expenseChange =
      prevExpense > 0 ? Math.round(((currentExpense - prevExpense) / prevExpense) * 100) : 0;
    const savingsRate =
      currentIncome > 0 ? Math.round(((currentIncome - currentExpense) / currentIncome) * 100) : 0;

    const pendingBills = familyBills.filter((b) => !b.isPaid);
    const totalBillDue = pendingBills.reduce((s, b) => s + Number(b.amount), 0);

    const insights: string[] = [];
    if (expenseChange > 10) {
      insights.push(
        `Family spending increased ${expenseChange}% vs last month. Consider cutting discretionary expenses.`,
      );
    } else if (expenseChange < -10) {
      insights.push(
        `Excellent! Family spending decreased ${Math.abs(expenseChange)}% vs last month.`,
      );
    } else {
      insights.push('Family spending is consistent with last month.');
    }

    if (savingsRate < 20) {
      insights.push(
        `Savings rate is ${savingsRate}%. Aim for at least 20% for healthy financial growth.`,
      );
    } else {
      insights.push(`Healthy savings rate of ${savingsRate}%. Keep it up!`);
    }

    if (pendingBills.length > 0) {
      insights.push(
        `You have ${pendingBills.length} unpaid bills totaling ${totalBillDue.toFixed(2)}.`,
      );
    }

    if (familyGoals.length > 0) {
      const tracked = familyGoals.filter((g) => {
        if (!g.deadline) {
          return true;
        }
        const progress =
          Number(g.targetAmount) > 0 ? Number(g.savedAmount) / Number(g.targetAmount) : 0;
        const elapsed =
          (now.getTime() - new Date(g.createdAt).getTime()) /
          (new Date(g.deadline).getTime() - new Date(g.createdAt).getTime());
        return progress >= elapsed;
      });
      if (tracked.length < familyGoals.length) {
        insights.push(`${familyGoals.length - tracked.length} goal(s) are behind schedule.`);
      }
    }

    return {
      period: { start: monthStart, end: monthEnd },
      income: { current: currentIncome, previous: prevIncome, change: incomeChange },
      expense: { current: currentExpense, previous: prevExpense, change: expenseChange },
      savings: { amount: Math.max(0, currentIncome - currentExpense), rate: savingsRate },
      pendingBills: { count: pendingBills.length, totalDue: totalBillDue },
      activeGoals: familyGoals.length,
      insights,
      recommendations: [
        savingsRate < 20 && {
          type: 'savings',
          message: 'Increase monthly savings contribution',
          priority: 'high',
        },
        expenseChange > 10 && {
          type: 'spending',
          message: 'Review and reduce discretionary spending',
          priority: 'medium',
        },
        pendingBills.length > 0 && {
          type: 'bills',
          message: 'Clear pending bills to avoid late fees',
          priority: 'high',
        },
      ].filter(Boolean),
    };
  }

  async generateSavingsRecommendations(userId: string): Promise<any> {
    const familyId = await this.getFamilyId(userId);
    if (!familyId) {
      return { recommendations: [], message: 'No family found' };
    }

    const memberIds = await this.getFamilyMemberIds(familyId);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [txns, budgets, goals, investments] = await Promise.all([
      this.prisma.transaction.findMany({
        where: {
          userId: { in: memberIds },
          deletedAt: null,
          date: { gte: monthStart, lte: monthEnd },
        },
      }),
      this.prisma.budget.findMany({
        where: { userId: { in: memberIds }, isActive: true },
      }),
      this.prisma.familyGoal.findMany({ where: { familyId, status: 'active' } }),
      this.prisma.familyInvestment.findMany({ where: { familyId } }),
    ]);

    const totalIncome = txns
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + Number(t.amount), 0);
    const totalExpense = txns
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + Number(t.amount), 0);
    const currentSavings = Math.max(0, totalIncome - totalExpense);
    const savingsRate = totalIncome > 0 ? Math.round((currentSavings / totalIncome) * 100) : 0;

    const recommendations: any[] = [];

    if (savingsRate < 10) {
      recommendations.push({
        type: 'savings_rate',
        title: 'Increase Savings Rate',
        description: `Current savings rate is ${savingsRate}%. Aim to save at least 20% of monthly income.`,
        potentialImpact: Math.round(totalIncome * 0.2 - currentSavings),
        priority: 'high',
      });
    }

    budgets.forEach((b) => {
      const spent = Number(b.spent);
      const budgeted = Number(b.amount);
      if (spent > budgeted) {
        recommendations.push({
          type: 'budget_overspend',
          title: `${b.name} Budget Exceeded`,
          description: `${b.name} has exceeded budget by ${(spent - budgeted).toFixed(2)}.`,
          potentialImpact: spent - budgeted,
          priority: 'medium',
        });
      }
    });

    const subscriptions = txns.filter(
      (t) =>
        t.categoryId &&
        t.type === 'expense' &&
        t.description?.toLowerCase().includes('subscription'),
    );
    if (subscriptions.length > 3) {
      recommendations.push({
        type: 'subscriptions',
        title: 'Review Subscriptions',
        description: `You have ${subscriptions.length} subscription payments this month. Consider consolidating or cancelling unused ones.`,
        potentialImpact: Math.round(subscriptions.reduce((s, t) => s + Number(t.amount), 0) * 0.3),
        priority: 'medium',
      });
    }

    return { savingsRate, currentSavings, totalIncome, totalExpense, recommendations };
  }

  async generateInsuranceSuggestions(userId: string): Promise<any> {
    const familyId = await this.getFamilyId(userId);
    if (!familyId) {
      return { suggestions: [], message: 'No family found' };
    }

    const memberIds = await this.getFamilyMemberIds(familyId);
    const documents = await this.prisma.userDocument.findMany({
      where: { userId: { in: memberIds }, category: 'insurance', deletedAt: null },
    });

    const now = new Date();
    const expiring = documents.filter(
      (d) => d.expiryDate && d.expiryDate < new Date(now.getFullYear() + 3, 0, 1),
    );
    const expired = documents.filter((d) => d.expiryDate && d.expiryDate < now);
    const valid = documents.filter((d) => d.expiryDate && d.expiryDate >= now);

    const suggestions: any[] = [];

    if (expired.length > 0) {
      suggestions.push({
        type: 'expired',
        title: 'Expired Insurance Policies',
        description: `${expired.length} insurance polic${expired.length > 1 ? 'ies' : 'y'} ha${expired.length > 1 ? 've' : 's'} expired. Renew immediately to avoid coverage gaps.`,
        priority: 'high',
        count: expired.length,
      });
    }

    if (expiring.length > 0) {
      suggestions.push({
        type: 'expiring_soon',
        title: 'Insurance Policies Expiring Soon',
        description: `${expiring.length} polic${expiring.length > 1 ? 'ies' : 'y'} expiring within 3 years. Plan renewal.`,
        priority: 'medium',
        count: expiring.length,
      });
    }

    if (documents.length < 3) {
      const types = ['health', 'life', 'term', 'motor', 'home'];
      const existing = new Set(documents.map((d) => d.documentNumber));
      const missing = types.filter((t) => !existing.has(t));
      if (missing.length > 0) {
        suggestions.push({
          type: 'missing_coverage',
          title: 'Consider Additional Coverage',
          description: `Your family may benefit from: ${missing.join(', ')} insurance.`,
          priority: 'low',
          missing,
        });
      }
    }

    return { total: documents.length, valid: valid.length, expired: expired.length, suggestions };
  }

  async generateInvestmentSuggestions(userId: string): Promise<any> {
    const familyId = await this.getFamilyId(userId);
    if (!familyId) {
      return { suggestions: [], message: 'No family found' };
    }

    const investments = await this.prisma.familyInvestment.findMany({ where: { familyId } });
    const totalInvested = investments.reduce((s, i) => s + Number(i.amount), 0);
    const totalCurrentValue = investments.reduce((s, i) => s + Number(i.currentValue), 0);
    const totalReturns =
      totalInvested > 0
        ? Math.round(((totalCurrentValue - totalInvested) / totalInvested) * 100)
        : 0;

    const typeDistribution = investments.reduce<
      Record<string, { invested: number; current: number }>
    >((acc, i) => {
      if (!acc[i.type]) {
        acc[i.type] = { invested: 0, current: 0 };
      }
      acc[i.type].invested += Number(i.amount);
      acc[i.type].current += Number(i.currentValue);
      return acc;
    }, {});

    const suggestions: any[] = [];
    if (investments.length === 0) {
      suggestions.push({
        type: 'start_investing',
        title: 'Start Family Investments',
        description:
          'Your family has no investments yet. Consider starting with low-risk options like mutual funds or fixed deposits.',
        priority: 'high',
      });
    }

    const highCash = typeDistribution['fd']?.invested > totalInvested * 0.7;
    if (highCash) {
      suggestions.push({
        type: 'diversify',
        title: 'Diversify Investments',
        description:
          'Heavily concentrated in fixed deposits. Consider diversifying into mutual funds or equities for better returns.',
        priority: 'medium',
      });
    }

    const bestPerformer = Object.entries(typeDistribution)
      .map(([type, v]) => ({
        type,
        returns: v.current > 0 ? Math.round(((v.current - v.invested) / v.invested) * 100) : 0,
      }))
      .sort((a, b) => b.returns - a.returns)[0];

    if (bestPerformer && bestPerformer.returns > 0) {
      suggestions.push({
        type: 'top_performer',
        title: `${bestPerformer.type} is Your Best Performer`,
        description: `${bestPerformer.type} returned ${bestPerformer.returns}%. Consider allocating more to this category.`,
        priority: 'low',
      });
    }

    return {
      totalInvested,
      totalCurrentValue,
      totalReturns,
      distribution: Object.entries(typeDistribution).map(([type, v]) => ({
        type,
        invested: v.invested,
        current: v.current,
      })),
      suggestions,
    };
  }

  async generateGoalForecasts(userId: string): Promise<any> {
    const familyId = await this.getFamilyId(userId);
    if (!familyId) {
      return { forecasts: [], message: 'No family found' };
    }

    const goals = await this.prisma.familyGoal.findMany({ where: { familyId, status: 'active' } });
    const forecasts = goals.map((g) => {
      const target = Number(g.targetAmount);
      const saved = Number(g.savedAmount);
      const remaining = Math.max(0, target - saved);
      const progress = target > 0 ? Math.round((saved / target) * 100) : 0;

      let forecast: any = {
        id: g.id,
        name: g.name,
        targetAmount: target,
        savedAmount: saved,
        progress,
        status: g.status,
        deadline: g.deadline,
      };

      if (g.deadline) {
        const daysLeft = Math.max(
          1,
          Math.round((new Date(g.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        );
        const requiredMonthly = remaining / Math.max(1, daysLeft / 30);
        const isOnTrack = progress >= 50 && daysLeft > 0;

        forecast = {
          ...forecast,
          daysLeft,
          requiredMonthlyContribution: Math.round(requiredMonthly),
          isOnTrack,
          recommendation: isOnTrack
            ? 'On track! Keep contributing consistently.'
            : requiredMonthly > 0
              ? `Need to save ~${Math.round(requiredMonthly)}/month to meet the deadline.`
              : 'Goal already reached.',
        };
      } else {
        forecast.recommendation = 'No deadline set. Consider setting a target date.';
      }

      return forecast;
    });

    return { forecasts, activeGoalCount: goals.length };
  }

  async generateRiskDetection(userId: string): Promise<any> {
    const familyId = await this.getFamilyId(userId);
    if (!familyId) {
      return { risks: [], message: 'No family found' };
    }

    const memberIds = await this.getFamilyMemberIds(familyId);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [txns, bills, goals, healthScores] = await Promise.all([
      this.prisma.transaction.findMany({
        where: {
          userId: { in: memberIds },
          deletedAt: null,
          date: { gte: new Date(now.getFullYear(), now.getMonth() - 3, 1) },
        },
      }),
      this.prisma.familyBill.findMany({ where: { familyId } }),
      this.prisma.familyGoal.findMany({ where: { familyId, status: 'active' } }),
      this.prisma.familyHealthScore.findMany({
        where: { familyId },
        orderBy: { createdAt: 'desc' },
        take: 1,
      }),
    ]);

    const risks: any[] = [];

    const avgMonthlyExpense = new Array(3).fill(0).map((_, i) => {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      return txns
        .filter((t) => t.type === 'expense' && t.date >= start && t.date <= end)
        .reduce((s, t) => s + Number(t.amount), 0);
    });
    const expenseTrend =
      avgMonthlyExpense.length >= 2 && avgMonthlyExpense[0] > avgMonthlyExpense[1] * 1.3;
    if (expenseTrend) {
      risks.push({
        type: 'spending_spike',
        title: 'Spending Spike Detected',
        description: `Monthly expense increased ${Math.round(((avgMonthlyExpense[0] - avgMonthlyExpense[1]) / avgMonthlyExpense[1]) * 100)}% compared to last month.`,
        severity: 'medium',
      });
    }

    const pendingBills = bills.filter((b) => !b.isPaid);
    if (pendingBills.length > 5) {
      risks.push({
        type: 'bill_accumulation',
        title: 'Bill Accumulation',
        description: `${pendingBills.length} unpaid bills totaling ${pendingBills.reduce((s, b) => s + Number(b.amount), 0).toFixed(2)}.`,
        severity: 'high',
      });
    }

    const behindGoals = goals.filter((g) => {
      if (!g.deadline) {
        return false;
      }
      const progress =
        Number(g.targetAmount) > 0 ? Number(g.savedAmount) / Number(g.targetAmount) : 0;
      const elapsed =
        (now.getTime() - new Date(g.createdAt).getTime()) /
        (new Date(g.deadline).getTime() - new Date(g.createdAt).getTime());
      return progress < elapsed;
    });
    if (behindGoals.length > 0) {
      risks.push({
        type: 'goals_behind',
        title: 'Goals Behind Schedule',
        description: `${behindGoals.length} goal(s) are falling behind. Review contribution amounts.`,
        severity: 'medium',
      });
    }

    const latestHealth = healthScores[0];
    if (latestHealth && latestHealth.overallScore < 50) {
      risks.push({
        type: 'low_health_score',
        title: 'Low Family Health Score',
        description: `Overall health score is ${latestHealth.overallScore}/100. Requires attention.`,
        severity: 'high',
      });
    }

    const largeTxns = txns.filter((t) => t.type === 'expense' && Number(t.amount) > 50000).length;
    if (largeTxns > 0) {
      risks.push({
        type: 'large_transactions_alert',
        title: 'Large Transactions Detected',
        description: `${largeTxns} transaction(s) over 50k in the last 3 months.`,
        severity: 'low',
      });
    }

    return {
      risks,
      riskCount: risks.length,
      highRiskCount: risks.filter((r) => r.severity === 'high').length,
      overallAssessment:
        risks.length === 0
          ? 'Family financial health appears stable with no significant risks detected.'
          : risks.filter((r) => r.severity === 'high').length > 0
            ? 'Some high-priority risks require immediate attention.'
            : 'Minor risks detected but overall financial health is manageable.',
    };
  }
}

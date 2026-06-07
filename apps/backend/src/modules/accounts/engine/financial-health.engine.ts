import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

export interface HealthScoreResult {
  score: number;
  label: string;
  color: string;
  factors: HealthFactor[];
  recommendations: string[];
}

export interface HealthFactor {
  name: string;
  score: number;
  maxScore: number;
  status: 'good' | 'fair' | 'poor';
  detail: string;
}

@Injectable()
export class FinancialHealthEngine {
  constructor(private readonly prisma: PrismaService) {}

  async calculate(userId: string): Promise<HealthScoreResult> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [salaryProfile, transactions, bills, reminders, goals, allTransactions] =
      await Promise.all([
        this.prisma.salaryProfile.findUnique({ where: { userId } }),
        this.prisma.transaction.findMany({
          where: { userId, date: { gte: monthStart }, deletedAt: null },
        }),
        this.prisma.bill.findMany({
          where: { userId, isPaid: false, deletedAt: null },
        }),
        this.prisma.reminder.findMany({
          where: { userId, status: 'active', deletedAt: null },
        }),
        this.prisma.goal.findMany({
          where: { userId, deletedAt: null },
        }),
        this.prisma.transaction.findMany({
          where: { userId, date: { gte: prevMonthStart }, deletedAt: null },
        }),
      ]);

    const hasNoData =
      transactions.length === 0 &&
      bills.length === 0 &&
      reminders.length === 0 &&
      goals.length === 0 &&
      allTransactions.length === 0 &&
      !salaryProfile;

    if (hasNoData) {
      return {
        score: 0,
        label: 'No Data',
        color: '#6366F1',
        factors: [
          { name: 'Savings', score: 0, maxScore: 20, status: 'poor', detail: 'No transactions yet' },
          { name: 'Commitments', score: 0, maxScore: 20, status: 'poor', detail: 'No recurring payments tracked' },
          { name: 'EMI Load', score: 0, maxScore: 15, status: 'poor', detail: 'No EMI data' },
          { name: 'Expense Growth', score: 0, maxScore: 15, status: 'poor', detail: 'Not enough data' },
          { name: 'Goal Completion', score: 0, maxScore: 15, status: 'poor', detail: 'No goals set' },
          { name: 'Subscription Burden', score: 0, maxScore: 15, status: 'poor', detail: 'Not tracked yet' },
        ],
        recommendations: [
          'Start by adding your first expense to track your spending.',
          'Set up a salary profile to calculate your savings ratio.',
        ],
      };
    }

    const monthlyIncome = Number(salaryProfile?.salary || 0);
    const monthlyExpenses = transactions
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + Number(t.amount), 0);
    const prevExpenses = allTransactions
      .filter((t) => t.type === 'expense' && t.date < monthStart)
      .reduce((s, t) => s + Number(t.amount), 0);

    const recurringTotal = [...bills, ...reminders.filter((r) => r.isRecurring)].reduce(
      (s, r) => s + (Number((r as any).amount) || 0),
      0,
    );
    const totalBills = bills.reduce((s, b) => s + Number(b.amount), 0);

    const completedGoals = goals.filter((g) => g.isCompleted).length;
    const totalGoals = goals.length;

    const factors: HealthFactor[] = [];
    const recommendations: string[] = [];

    const savingsRatio =
      monthlyIncome > 0
        ? Math.max(0, (monthlyIncome - monthlyExpenses) / monthlyIncome)
        : 0;
    const savingsScore = Math.round(Math.min(savingsRatio / 0.3, 1) * 20);
    factors.push({
      name: 'Savings Ratio',
      score: savingsScore,
      maxScore: 20,
      status: savingsRatio >= 0.3 ? 'good' : savingsRatio >= 0.15 ? 'fair' : 'poor',
      detail:
        monthlyIncome > 0
          ? `Saving ${Math.round(savingsRatio * 100)}% of income`
          : 'No income data',
    });
    if (savingsRatio < 0.15 && monthlyIncome > 0) {
      recommendations.push(
        `Try to save at least 15% of your income. Currently saving ${Math.round(savingsRatio * 100)}%.`,
      );
    }

    const commitmentRatio =
      monthlyIncome > 0 ? Math.min(recurringTotal / monthlyIncome, 1) : 0.5;
    const commitmentScore = Math.round(Math.max(1 - commitmentRatio, 0) * 20);
    factors.push({
      name: 'Recurring Commitments',
      score: commitmentScore,
      maxScore: 20,
      status: commitmentRatio <= 0.3 ? 'good' : commitmentRatio <= 0.5 ? 'fair' : 'poor',
      detail:
        recurringTotal > 0
          ? `${Math.round(commitmentRatio * 100)}% of income goes to recurring payments`
          : 'No recurring commitments',
    });
    if (commitmentRatio > 0.5 && monthlyIncome > 0) {
      recommendations.push(
        `Your recurring commitments take ${Math.round(commitmentRatio * 100)}% of income. Consider reducing where possible.`,
      );
    }

    const emiRatio =
      monthlyIncome > 0
        ? Math.min(
            [...bills.filter((b) => b.name?.toLowerCase().includes('emi') || b.name?.toLowerCase().includes('loan'))].reduce(
              (s, b) => s + Number(b.amount),
              0,
            ) / monthlyIncome,
            1,
          )
        : 0;
    const emiScore = Math.round(Math.max(1 - emiRatio, 0) * 15);
    factors.push({
      name: 'EMI Load',
      score: emiScore,
      maxScore: 15,
      status: emiRatio <= 0.2 ? 'good' : emiRatio <= 0.4 ? 'fair' : 'poor',
      detail:
        emiRatio > 0
          ? `EMI payments are ${Math.round(emiRatio * 100)}% of income`
          : 'No active EMIs',
    });
    if (emiRatio > 0.4) {
      recommendations.push('Your EMI burden is high. Consider prepayment or restructuring.');
    }

    const expenseGrowth = prevExpenses > 0
      ? (monthlyExpenses - prevExpenses) / prevExpenses
      : 0;
    const growthScore = Math.round(Math.max(1 - Math.max(expenseGrowth, 0) / 0.5, 0) * 15);
    factors.push({
      name: 'Expense Growth',
      score: growthScore,
      maxScore: 15,
      status: expenseGrowth <= 0.1 ? 'good' : expenseGrowth <= 0.25 ? 'fair' : 'poor',
      detail:
        prevExpenses > 0
          ? expenseGrowth > 0
            ? `Spending increased by ${Math.round(expenseGrowth * 100)}%`
            : `Spending decreased by ${Math.round(Math.abs(expenseGrowth) * 100)}%`
          : 'Not enough data',
    });
    if (expenseGrowth > 0.25) {
      recommendations.push(
        `Your expenses grew ${Math.round(expenseGrowth * 100)}% this month. Review discretionary spending.`,
      );
    }

    const goalCompletionRate = totalGoals > 0 ? completedGoals / totalGoals : 0;
    const goalScore = Math.round(Math.min(goalCompletionRate / 0.5, 1) * 15);
    factors.push({
      name: 'Goal Completion',
      score: goalScore,
      maxScore: 15,
      status: goalCompletionRate >= 0.5 ? 'good' : totalGoals > 0 ? 'fair' : 'poor',
      detail:
        totalGoals > 0
          ? `${completedGoals}/${totalGoals} goals completed`
          : 'No goals set',
    });
    if (totalGoals > 0 && goalCompletionRate < 0.3) {
      recommendations.push(
        `You've completed ${completedGoals} of ${totalGoals} goals. Try breaking goals into smaller milestones.`,
      );
    } else if (totalGoals === 0) {
      recommendations.push('Set a savings goal to track your financial progress.');
    }

    const subscriptionTotal = monthlyIncome > 0
      ? Math.min(
          transactions
            .filter((t) => t.isRecurring && t.type === 'expense')
            .reduce((s, t) => s + Number(t.amount), 0) / Math.max(monthlyIncome, 1),
          1,
        )
      : 0.1;
    const subScore = Math.round(Math.max(1 - subscriptionTotal, 0) * 15);
    factors.push({
      name: 'Subscription Burden',
      score: subScore,
      maxScore: 15,
      status: subscriptionTotal <= 0.1 ? 'good' : subscriptionTotal <= 0.2 ? 'fair' : 'poor',
      detail:
        subscriptionTotal > 0
          ? `Subscriptions cost ${Math.round(subscriptionTotal * 100)}% of income`
          : 'No active subscriptions detected',
    });
    if (subscriptionTotal > 0.15 && monthlyIncome > 0) {
      const subAmount = transactions
        .filter((t) => t.isRecurring && t.type === 'expense')
        .reduce((s, t) => s + Number(t.amount), 0);
      recommendations.push(
        `Your subscriptions cost approximately ₹${Math.round(subAmount).toLocaleString('en-IN')} monthly. Audit and cancel unused ones.`,
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Great financial habits! Keep up the good work.');
    }

    const totalScore = savingsScore + commitmentScore + emiScore + growthScore + goalScore + subScore;
    let label: string;
    let color: string;
    if (totalScore >= 80) {
      label = 'Excellent';
      color = '#00C853';
    } else if (totalScore >= 60) {
      label = 'Good';
      color = '#69F0AE';
    } else if (totalScore >= 40) {
      label = 'Fair';
      color = '#FFB300';
    } else {
      label = 'Needs Attention';
      color = '#FF5252';
    }

    return { score: totalScore, label, color, factors, recommendations };
  }
}

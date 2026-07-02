import { Injectable, Logger } from '@nestjs/common';
import { ForecastRepository } from './forecast.repository';

@Injectable()
export class ForecastService {
  private readonly logger = new Logger(ForecastService.name);

  constructor(private readonly repo: ForecastRepository) {}

  async cashFlowForecast(userId: string, months = 3) {
    const monthsCap = Math.min(months, 12);
    const now = new Date();

    const startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + monthsCap, 0, 23, 59, 59);

    const [transactions, bills, loans] = await Promise.all([
      this.repo.findTransactions(userId, startDate),
      this.repo.findUnpaidBills(userId),
      this.repo.findLoans(userId),
    ]);

    const currentBalance = 0;

    const monthlyData = new Map<string, { income: number; expense: number }>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      monthlyData.set(key, { income: 0, expense: 0 });
    }

    for (const t of transactions) {
      const key = `${t.date.getFullYear()}-${t.date.getMonth()}`;
      const data = monthlyData.get(key);
      if (!data) {
        continue;
      }
      if (t.type === 'income') {
        data.income += Number(t.amount);
      } else {
        data.expense += Number(t.amount);
      }
    }

    const values = Array.from(monthlyData.values());
    const avgIncome =
      values.length > 0 ? values.reduce((s, v) => s + v.income, 0) / values.length : 0;
    const avgExpense =
      values.length > 0 ? values.reduce((s, v) => s + v.expense, 0) / values.length : 0;

    type MonthProjection = {
      month: string;
      income: number;
      expense: number;
      netCashflow: number;
      projectedBalance: number;
      isShortfall: boolean;
      shortfallAmount: number;
    };
    const projections: MonthProjection[] = [];
    let projectedBalance = currentBalance;

    for (let i = 0; i < monthsCap; i++) {
      const month = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + i + 1, 0);
      const monthLabel = month.toLocaleString('default', { month: 'short', year: 'numeric' });

      const monthIncome = avgIncome;
      let monthExpense = avgExpense;

      for (const bill of bills) {
        if (bill.isRecurring || (bill.dueDate >= month && bill.dueDate <= monthEnd)) {
          monthExpense += Number(bill.amount);
        }
      }

      for (const loan of loans) {
        if (Number(loan.monthlyEmi) > 0) {
          monthExpense += Number(loan.monthlyEmi);
        }
      }

      projectedBalance = projectedBalance + monthIncome - monthExpense;

      projections.push({
        month: monthLabel,
        income: Math.round(monthIncome),
        expense: Math.round(monthExpense),
        netCashflow: Math.round(monthIncome - monthExpense),
        projectedBalance: Math.round(projectedBalance),
        isShortfall: projectedBalance < 0,
        shortfallAmount: projectedBalance < 0 ? Math.abs(Math.round(projectedBalance)) : 0,
      });
    }

    return {
      currentBalance: Math.round(currentBalance),
      averageMonthlyIncome: Math.round(avgIncome),
      averageMonthlyExpense: Math.round(avgExpense),
      monthlySurplus: Math.round(avgIncome - avgExpense),
      monthsUntilDepletion:
        avgExpense > avgIncome ? Math.ceil(currentBalance / (avgExpense - avgIncome)) : null,
      projections,
    };
  }

  async savingsForecast(userId: string, monthlySavings?: number, months = 12) {
    const monthsCap = Math.min(months, 120);
    const now = new Date();

    const [goals] = await Promise.all([
      this.repo.findGoals(userId),
    ]);

    const currentBalance = 0;
    const savingsRate = monthlySavings ?? 0;

    type SavingsProjection = {
      month: string;
      monthlyContribution: number;
      accumulated: number;
      goalMilestonesThisMonth: {
        name: string;
        targetAmount: number;
        currentAmount: number;
        remaining: number;
      }[];
    };
    const projections: SavingsProjection[] = [];
    let accumulated = 0;

    for (let i = 1; i <= monthsCap; i++) {
      accumulated += savingsRate;
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const label = date.toLocaleString('default', { month: 'short', year: 'numeric' });

      const milestoneGoals = goals
        .filter((g) => {
          if (!g.deadline) {
            return false;
          }
          return (
            g.deadline <= date &&
            g.deadline >= new Date(now.getFullYear(), now.getMonth() + i - 1, 1)
          );
        })
        .map((g) => ({
          name: g.name,
          targetAmount: Number(g.targetAmount),
          currentAmount: Number(g.currentAmount),
          remaining: Math.max(0, Number(g.targetAmount) - Number(g.currentAmount)),
        }));

      projections.push({
        month: label,
        monthlyContribution: savingsRate,
        accumulated: accumulated,
        goalMilestonesThisMonth: milestoneGoals,
      });
    }

    return {
      currentBalance: Math.round(currentBalance),
      monthlySavingsRate: savingsRate,
      totalProjectedSavings: Math.round(accumulated),
      goalCount: goals.length,
      goals,
      projections,
    };
  }

  async loanPayoffForecast(userId: string, loanId?: string, extraPayment = 0) {
    const where: any = { userId, deletedAt: null };
    if (loanId) {
      where.id = loanId;
    }

    const loans = loanId
      ? await this.repo.findLoanById(userId, loanId)
      : await this.repo.findLoansForPayoff(userId);
    if (loans.length === 0) {
      return { message: 'No active loans found' };
    }

    type AmortizationRow = {
      month: number;
      payment: number;
      principal: number;
      interest: number;
      remainingBalance: number;
    };

    const results = loans.map((loan) => {
      const totalAmount = Number(loan.totalAmount);
      const paidAmount = Number(loan.paidAmount);
      const monthlyEmi = Number(loan.monthlyEmi);
      const remaining = totalAmount - paidAmount;

      if (monthlyEmi <= 0) {
        return {
          id: loan.id,
          name: loan.name,
          remaining,
          monthlyEmi,
          note: 'No EMI set — cannot calculate payoff',
        };
      }

      const effectiveEmi = monthlyEmi + extraPayment;
      let monthsToPayoff = 0;
      const amortizationSchedule: AmortizationRow[] = [];
      let balance = remaining;
      const monthlyRate = 0.01; // ~12% annual / 12 months

      // Simulate month-by-month until paid off or 360 months (30 years) max
      for (let m = 1; m <= 360; m++) {
        if (balance <= 0) {
          break;
        }
        const interestPortion = Math.round(balance * monthlyRate);
        let principalPortion = effectiveEmi - interestPortion;
        if (principalPortion <= 0) {
          // EMI doesn't cover interest; use a minimum amortization
          principalPortion = Math.round(effectiveEmi * 0.3);
        }
        principalPortion = Math.min(principalPortion, balance);
        balance = Math.round((balance - principalPortion) * 100) / 100;
        amortizationSchedule.push({
          month: m,
          payment: Math.round(effectiveEmi),
          principal: Math.round(principalPortion),
          interest: Math.round(interestPortion),
          remainingBalance: Math.round(Math.max(0, balance)),
        });
        monthsToPayoff = m;
        if (balance <= 0.01) {
          break;
        }
      }

      const payoffDate = new Date();
      payoffDate.setMonth(payoffDate.getMonth() + monthsToPayoff);

      const totalPayment = effectiveEmi * monthsToPayoff;
      const totalInterest = Math.max(0, totalPayment - remaining);

      return {
        id: loan.id,
        name: loan.name,
        totalAmount: Math.round(totalAmount),
        paidAmount: Math.round(paidAmount),
        remaining: Math.round(remaining),
        monthlyEmi: Math.round(monthlyEmi),
        extraPayment: Math.round(extraPayment),
        effectiveMonthlyPayment: Math.round(effectiveEmi),
        monthsToPayoff,
        payoffDate: payoffDate.toISOString().split('T')[0],
        totalPayment: Math.round(totalPayment),
        totalInterest: Math.round(totalInterest),
        interestSaved: Math.round(Math.max(0, remaining * 0.12 - totalInterest)),
        amortizationSchedule,
      };
    });

    return { loans: results, count: results.length };
  }
}

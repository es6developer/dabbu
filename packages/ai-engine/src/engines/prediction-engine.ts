interface PredTransactionData {
  id: string;
  amount: number;
  description?: string;
  category?: string;
  date: Date;
  type: 'income' | 'expense' | 'transfer';
}

interface PredBudgetData {
  id: string;
  category?: string;
  amount: number;
  spent: number;
  period: string;
}

interface BudgetOverrunPrediction {
  category: string;
  budgetAmount: number;
  spentSoFar: number;
  projectedSpend: number;
  overrunAmount: number;
  daysUntilOverrun: number;
  probability: number;
}

interface SpendingPredictionOutput {
  endOfMonthBalance: number;
  expectedExpenses: number;
  expectedSavings: number;
  budgetOverruns: BudgetOverrunPrediction[];
  cashShortageProbability: number;
  cashShortageAmount?: number;
  shortfallDate?: string;
  confidence: number;
}

export class PredictionEngine {
  predictEndOfMonth(params: {
    transactions: PredTransactionData[];
    currentBalance: number;
    monthlyIncome: number;
  }): SpendingPredictionOutput {
    const { transactions, currentBalance, monthlyIncome } = params;

    const now = new Date();
    const startOfWindow = new Date(now);
    startOfWindow.setDate(startOfWindow.getDate() - 30);

    const recentExpenses = transactions.filter(
      t => t.type === 'expense' && new Date(t.date) >= startOfWindow
    );

    const totalSpent = recentExpenses.reduce((s, t) => s + t.amount, 0);
    const daysWithData = Math.max(new Set(recentExpenses.map(t =>
      new Date(t.date).toDateString()
    )).size, 1);
    const avgDailySpend = totalSpent / daysWithData;

    const year = now.getFullYear();
    const month = now.getMonth();
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    const daysRemaining = lastDayOfMonth - now.getDate();

    const expectedExpenses = Math.round(avgDailySpend * daysRemaining * 100) / 100;
    const endOfMonthBalance = Math.round((currentBalance + monthlyIncome - expectedExpenses) * 100) / 100;
    const expectedSavings = Math.round((monthlyIncome - expectedExpenses) * 100) / 100;

    const transactionRatio = Math.min(recentExpenses.length / 20, 1);
    const consistencyFactor = daysWithData >= 20 ? 0.15 : daysWithData >= 10 ? 0.1 : 0;
    const confidence = Math.round((75 + transactionRatio * 20 + consistencyFactor * 100) / 100 * 100);

    const budgetOverruns = this.predictBudgetOverruns({
      budgets: [],
      transactions,
    });

    const cashShortagePrediction = this.predictCashShortage({
      transactions,
      currentBalance,
      upcomingBills: [],
    });

    return {
      endOfMonthBalance,
      expectedExpenses,
      expectedSavings,
      budgetOverruns,
      cashShortageProbability: cashShortagePrediction.probability,
      cashShortageAmount: cashShortagePrediction.amount,
      shortfallDate: cashShortagePrediction.shortfallDate,
      confidence,
    };
  }

  predictBudgetOverruns(params: {
    budgets: PredBudgetData[];
    transactions: PredTransactionData[];
  }): BudgetOverrunPrediction[] {
    const { budgets, transactions } = params;
    const results: BudgetOverrunPrediction[] = [];

    for (const budget of budgets) {
      const category = budget.category || 'uncategorized';

      const categoryTxns = transactions.filter(
        t => (t.category || 'uncategorized') === category && t.type === 'expense'
      );

      if (categoryTxns.length === 0) continue;

      const sortedTxns = [...categoryTxns].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      const firstDate = new Date(sortedTxns[0].date);
      const lastDate = new Date(sortedTxns[sortedTxns.length - 1].date);
      const daysDiff = Math.max(
        (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24),
        1
      );

      const totalCategorySpend = categoryTxns.reduce((s, t) => s + t.amount, 0);
      const dailyAvg = totalCategorySpend / daysDiff;

      const periodDays = this.parsePeriodDays(budget.period);
      const projectedSpend = Math.round(dailyAvg * periodDays * 100) / 100;

      if (projectedSpend <= budget.amount) continue;

      const overrunAmount = Math.round((projectedSpend - budget.amount) * 100) / 100;

      const remainingBudget = budget.amount - budget.spent;
      const daysUntilOverrun = dailyAvg > 0
        ? Math.max(Math.ceil(remainingBudget / dailyAvg), 0)
        : periodDays;

      const amounts = categoryTxns.map(t => t.amount);
      const mean = amounts.reduce((s, a) => s + a, 0) / amounts.length;
      const variance = amounts.reduce((s, a) => s + (a - mean) ** 2, 0) / amounts.length;
      const stdDev = Math.sqrt(variance);
      const cv = mean > 0 ? stdDev / mean : 1;
      const probability = Math.round(Math.max(0.5, 1 - cv * 0.3) * 100);

      results.push({
        category,
        budgetAmount: budget.amount,
        spentSoFar: budget.spent,
        projectedSpend,
        overrunAmount,
        daysUntilOverrun,
        probability,
      });
    }

    return results;
  }

  predictCashShortage(params: {
    transactions: PredTransactionData[];
    currentBalance: number;
    upcomingBills: { amount: number; dueDate: Date }[];
  }): { probability: number; amount?: number; shortfallDate?: string } {
    const { transactions, currentBalance, upcomingBills } = params;

    const now = new Date();
    const startOfWindow = new Date(now);
    startOfWindow.setDate(startOfWindow.getDate() - 30);

    const recentExpenses = transactions.filter(
      t => t.type === 'expense' && new Date(t.date) >= startOfWindow
    );

    const totalSpent = recentExpenses.reduce((s, t) => s + t.amount, 0);
    const daysWithData = Math.max(new Set(recentExpenses.map(t =>
      new Date(t.date).toDateString()
    )).size, 1);
    const avgDailySpend = totalSpent / daysWithData;

    const year = now.getFullYear();
    const month = now.getMonth();
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    const daysRemaining = lastDayOfMonth - now.getDate();

    const projectedExpenses = avgDailySpend * daysRemaining;

    const sortedBills = [...upcomingBills].sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );

    const totalBills = sortedBills.reduce((s, b) => s + b.amount, 0);
    const totalOutflow = projectedExpenses + totalBills;

    if (totalOutflow <= currentBalance) {
      return { probability: 0 };
    }

    const shortfall = Math.round((totalOutflow - currentBalance) * 100) / 100;

    let runningBalance = currentBalance;
    let shortfallDate: string | undefined;

    for (const bill of sortedBills) {
      const dueDate = new Date(bill.dueDate);
      const daysUntilDue = Math.max(
        Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        0
      );
      const expensesUntilDue = avgDailySpend * daysUntilDue;
      runningBalance -= expensesUntilDue + bill.amount;

      if (runningBalance < 0) {
        shortfallDate = dueDate.toISOString().split('T')[0];
        break;
      }
    }

    if (!shortfallDate) {
      const daysToZero = Math.floor(currentBalance / avgDailySpend);
      const shortfallDateObj = new Date(now);
      shortfallDateObj.setDate(shortfallDateObj.getDate() + daysToZero);
      shortfallDate = shortfallDateObj.toISOString().split('T')[0];
    }

    const expenseConsistency = daysWithData >= 20 ? 0.9 : daysWithData >= 10 ? 0.7 : 0.5;
    const ratio = totalOutflow / currentBalance;
    const probability = Math.round(Math.min(ratio * expenseConsistency * 100, 99));

    return { probability, amount: shortfall, shortfallDate };
  }

  private parsePeriodDays(period: string): number {
    const lower = period.toLowerCase();
    if (lower.includes('month') || lower.includes('monthly')) return 30;
    if (lower.includes('week') || lower.includes('weekly')) return 7;
    if (lower.includes('year') || lower.includes('yearly') || lower.includes('annual')) return 365;
    if (lower.includes('quarter') || lower.includes('quarterly')) return 90;
    return 30;
  }
}

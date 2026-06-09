interface ReviewTransactionData {
  id: string;
  amount: number;
  description?: string;
  category?: string;
  date: Date;
  type: 'income' | 'expense';
}

interface ReviewBudgetData {
  id: string;
  name: string;
  amount: number;
  spent: number;
  category?: string;
}

interface ReviewGoalData {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: Date;
}

interface ReviewBillData {
  id: string;
  name: string;
  amount: number;
  dueDate: Date;
  isPaid: boolean;
}

interface ReviewInvestmentData {
  id: string;
  name: string;
  type: string;
  buyPrice: number;
  currentPrice: number;
  quantity: number;
}

interface MonthlyReviewOutput {
  month: number;
  year: number;
  period: string;
  summary: string;
  income: { total: number; sources: { name: string; amount: number }[]; vsLastMonth: number };
  expenses: { total: number; byCategory: { category: string; amount: number; percentage: number }[]; vsLastMonth: number };
  savings: { total: number; rate: number; vsLastMonth: number };
  budgets: { onTrack: number; exceeded: number; total: number; details: { name: string; status: string; spent: number; budget: number }[] };
  goals: { progress: { name: string; progress: number; status: string }[]; highlight: string };
  bills: { paid: number; pending: number; upcoming: { name: string; amount: number; dueDate: string }[] };
  investments: { totalValue: number; gainLoss: number; gainLossPct: number; topGainers: string[]; topLosers: string[] };
  healthScore: { current: number; change: number; level: string };
  insights: string[];
  recommendations: string[];
  achievements: string[];
  nextMonthFocus: string;
}

export class MonthlyAiReviewEngine {
  generateMonthlyReview(params: {
    month: number;
    year: number;
    transactions: ReviewTransactionData[];
    budgets: ReviewBudgetData[];
    goals: ReviewGoalData[];
    bills: ReviewBillData[];
    investments: ReviewInvestmentData[];
    previousMonthSavingsRate?: number;
    previousMonthExpenses?: number;
    healthScore?: { current: number; change: number; level: string };
  }): MonthlyReviewOutput {
    const { month, year } = params;

    const incomeTxns = params.transactions.filter(t => t.type === 'income');
    const expenseTxns = params.transactions.filter(t => t.type === 'expense');

    const totalIncome = incomeTxns.reduce((s, t) => s + t.amount, 0);
    const totalExpenses = expenseTxns.reduce((s, t) => s + t.amount, 0);
    const totalSavings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? Math.round((totalSavings / totalIncome) * 100) : 0;

    const incomeBySource = new Map<string, number>();
    for (const t of incomeTxns) {
      const cat = t.category || 'Other Income';
      incomeBySource.set(cat, (incomeBySource.get(cat) || 0) + t.amount);
    }
    const incomeSources = Array.from(incomeBySource.entries()).map(([name, amount]) => ({ name, amount }));

    const expensesByCat = new Map<string, number>();
    for (const t of expenseTxns) {
      const cat = t.category || 'Other';
      expensesByCat.set(cat, (expensesByCat.get(cat) || 0) + t.amount);
    }
    const byCategory = Array.from(expensesByCat.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const vsLastMonthIncome = 0;
    const vsLastMonthExpenses = params.previousMonthExpenses
      ? totalExpenses - params.previousMonthExpenses
      : 0;
    const vsLastMonthSavings = params.previousMonthSavingsRate
      ? savingsRate - params.previousMonthSavingsRate
      : 0;

    const budgetDetails = params.budgets.map(b => ({
      name: b.name,
      status: b.spent <= b.amount ? 'on_track' : 'exceeded',
      spent: b.spent,
      budget: b.amount,
    }));
    const budgetsOnTrack = budgetDetails.filter(b => b.status === 'on_track').length;
    const budgetsExceeded = budgetDetails.filter(b => b.status === 'exceeded').length;

    const goalProgress = params.goals.map(g => {
      const progress = g.targetAmount > 0 ? Math.min(Math.round((g.currentAmount / g.targetAmount) * 100), 100) : 0;
      let status = 'behind';
      if (g.deadline) {
        const totalDays = (g.deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
        const expectedProgress = totalDays > 0 ? Math.min(100, 100) : 100;
        if (progress >= 100) status = 'completed';
        else if (progress >= expectedProgress * 0.8) status = 'on_track';
        else status = 'behind';
      } else {
        if (progress >= 100) status = 'completed';
        else if (progress >= 50) status = 'on_track';
        else status = 'behind';
      }
      return { name: g.name, progress, status };
    });
    const goalHighlight = goalProgress.length > 0
      ? goalProgress.reduce((a, b) => (a.progress > b.progress ? a : b)).name
      : 'No goals tracked';

    const paidBills = params.bills.filter(b => b.isPaid).length;
    const pendingBills = params.bills.filter(b => !b.isPaid).length;
    const now = new Date();
    const upcomingBills = params.bills
      .filter(b => !b.isPaid && b.dueDate >= now)
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
      .slice(0, 5)
      .map(b => ({
        name: b.name,
        amount: b.amount,
        dueDate: b.dueDate.toISOString().split('T')[0],
      }));

    const totalInvValue = params.investments.reduce((s, i) => s + i.currentPrice * i.quantity, 0);
    const totalInvCost = params.investments.reduce((s, i) => s + i.buyPrice * i.quantity, 0);
    const gainLoss = totalInvValue - totalInvCost;
    const gainLossPct = totalInvCost > 0 ? Math.round((gainLoss / totalInvCost) * 100) : 0;

    const invReturns = params.investments.map(i => ({
      name: i.name,
      ret: ((i.currentPrice - i.buyPrice) / i.buyPrice) * 100,
    }));
    invReturns.sort((a, b) => b.ret - a.ret);
    const topGainers = invReturns.filter(i => i.ret > 0).slice(0, 3).map(i => i.name);
    const topLosers = invReturns.filter(i => i.ret < 0).slice(0, 3).map(i => i.name);

    const healthScore = params.healthScore || { current: 70, change: 0, level: 'good' };

    const insights = this.generateInsights(params, totalIncome, totalExpenses, savingsRate, byCategory);
    const recommendations = this.generateRecommendations(params, savingsRate, byCategory, healthScore);
    const achievements = this.generateAchievements(savingsRate, budgetDetails, goalProgress, paidBills);
    const nextMonthFocus = this.determineNextMonthFocus(savingsRate, healthScore, byCategory);

    const period = this.getMonthName(month) + ' ' + year;
    const summary = `In ${period}, your total income was ₹${totalIncome.toLocaleString()} and expenses were ₹${totalExpenses.toLocaleString()}, saving ${savingsRate}% of income. ${achievements.length > 0 ? achievements[0] : 'Keep tracking your finances for better insights.'}`;

    return {
      month,
      year,
      period,
      summary,
      income: { total: totalIncome, sources: incomeSources, vsLastMonth: vsLastMonthIncome },
      expenses: { total: totalExpenses, byCategory, vsLastMonth: vsLastMonthExpenses },
      savings: { total: totalSavings, rate: savingsRate, vsLastMonth: vsLastMonthSavings },
      budgets: { onTrack: budgetsOnTrack, exceeded: budgetsExceeded, total: params.budgets.length, details: budgetDetails },
      goals: { progress: goalProgress, highlight: goalHighlight },
      bills: { paid: paidBills, pending: pendingBills, upcoming: upcomingBills },
      investments: { totalValue: totalInvValue, gainLoss, gainLossPct, topGainers, topLosers },
      healthScore,
      insights,
      recommendations,
      achievements,
      nextMonthFocus,
    };
  }

  private generateInsights(
    params: {
      transactions: ReviewTransactionData[];
      budgets: ReviewBudgetData[];
      goals: ReviewGoalData[];
      bills: ReviewBillData[];
    },
    totalIncome: number,
    totalExpenses: number,
    savingsRate: number,
    byCategory: { category: string; amount: number; percentage: number }[],
  ): string[] {
    const insights: string[] = [];
    if (savingsRate >= 20) {
      insights.push(`Great savings rate of ${savingsRate}% — well above the recommended 20%`);
    } else if (savingsRate < 10) {
      insights.push(`Savings rate is only ${savingsRate}% — consider reducing expenses`);
    }
    const topCategory = byCategory[0];
    if (topCategory && topCategory.percentage > 30) {
      insights.push(`${topCategory.category} accounts for ${topCategory.percentage}% of all expenses`);
    }
    const exceededBudgets = params.budgets.filter(b => b.spent > b.amount);
    if (exceededBudgets.length > 0) {
      insights.push(`${exceededBudgets.length} budget${exceededBudgets.length > 1 ? 's were' : ' was'} exceeded this month`);
    }
    const behindGoals = params.goals.filter(g => {
      if (g.targetAmount === 0) return false;
      const pct = (g.currentAmount / g.targetAmount) * 100;
      return pct < 50;
    });
    if (behindGoals.length > 0) {
      insights.push(`${behindGoals.length} goal${behindGoals.length > 1 ? 's are' : ' is'} behind schedule`);
    }
    const pendingBills = params.bills.filter(b => !b.isPaid).length;
    if (pendingBills > 0) {
      insights.push(`You have ${pendingBills} unpaid bill${pendingBills > 1 ? 's' : ''}`);
    }
    return insights.slice(0, 5);
  }

  private generateRecommendations(
    params: {
      transactions: ReviewTransactionData[];
      budgets: ReviewBudgetData[];
      goals: ReviewGoalData[];
      bills: ReviewBillData[];
      investments: ReviewInvestmentData[];
    },
    savingsRate: number,
    byCategory: { category: string; amount: number; percentage: number }[],
    healthScore: { current: number; change: number; level: string },
  ): string[] {
    const recommendations: string[] = [];
    if (savingsRate < 20) {
      recommendations.push('Aim to save at least 20% of your income each month');
    }
    const exceededBudgets = params.budgets.filter(b => b.spent > b.amount);
    for (const b of exceededBudgets.slice(0, 2)) {
      recommendations.push(`Review ${b.name} spending — you exceeded by ₹${(b.spent - b.amount).toLocaleString()}`);
    }
    const behindGoals = params.goals.filter(g => {
      if (g.targetAmount === 0) return false;
      return (g.currentAmount / g.targetAmount) * 100 < 50;
    });
    if (behindGoals.length > 0) {
      recommendations.push(`Increase contributions to ${behindGoals[0].name} to stay on track`);
    }
    if (healthScore.current < 50) {
      recommendations.push('Improve financial health by reducing expenses and increasing savings');
    }
    if (params.investments.length === 0) {
      recommendations.push('Start investing to grow your wealth over time');
    }
    recommendations.push('Review your financial goals and adjust budget for next month');
    return recommendations.slice(0, 5);
  }

  private generateAchievements(
    savingsRate: number,
    budgetDetails: { name: string; status: string; spent: number; budget: number }[],
    goalProgress: { name: string; progress: number; status: string }[],
    paidBills: number,
  ): string[] {
    const achievements: string[] = [];
    if (savingsRate >= 25) {
      achievements.push(`You saved ${savingsRate}% of income — excellent!`);
    } else if (savingsRate >= 20) {
      achievements.push(`You saved ${savingsRate}% of income — great discipline!`);
    } else if (savingsRate >= 15) {
      achievements.push(`You saved ${savingsRate}% of income — keep it up!`);
    }
    const onTrackBudgets = budgetDetails.filter(b => b.status === 'on_track').length;
    if (onTrackBudgets === budgetDetails.length && budgetDetails.length > 0) {
      achievements.push('All budgets on track — fantastic budgeting!');
    } else if (onTrackBudgets >= budgetDetails.length * 0.7 && budgetDetails.length > 0) {
      achievements.push(`Most budgets (${onTrackBudgets}/${budgetDetails.length}) on track — good work!`);
    }
    const completedGoals = goalProgress.filter(g => g.status === 'completed');
    for (const g of completedGoals) {
      achievements.push(`Goal completed: ${g.name}`);
    }
    if (paidBills > 0) {
      achievements.push(`${paidBills} bill${paidBills > 1 ? 's' : ''} paid on time`);
    }
    return achievements;
  }

  private determineNextMonthFocus(
    savingsRate: number,
    healthScore: { current: number; change: number; level: string },
    byCategory: { category: string; amount: number; percentage: number }[],
  ): string {
    if (savingsRate < 10) return 'Increase savings rate — reduce discretionary spending';
    if (healthScore.current < 50) return 'Improve overall financial health score';
    const topCat = byCategory[0];
    if (topCat && topCat.percentage > 40) return `Reduce ${topCat.category} spending`;
    if (savingsRate < 20) return 'Push savings rate above 20%';
    return 'Maintain good habits and review investment portfolio';
  }

  private getMonthName(month: number): string {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month - 1] || 'Unknown';
  }
}

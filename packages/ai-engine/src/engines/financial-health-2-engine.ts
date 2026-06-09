interface HealthTxData {
  id: string;
  amount: number;
  category?: string;
  date: Date;
  type: string;
}

interface HealthBudgetData {
  id: string;
  category: string;
  amount: number;
  spent: number;
  period: string;
}

interface HealthBillData {
  id: string;
  name: string;
  amount: number;
  dueDate: Date;
  isPaid: boolean;
  paidDate?: Date;
}

interface HealthGoalData {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: Date;
}

interface HealthSettlementData {
  id: string;
  from: string;
  to: string;
  amount: number;
  date: Date;
  status: string;
}

interface HealthAccountData {
  id: string;
  type: string;
  balance: number;
}

interface FinancialHealth2Output {
  overallScore: number;
  components: {
    savingsRate: number;
    debtRatio: number;
    budgetDiscipline: number;
    goalProgress: number;
    billConsistency: number;
    emergencyFund: number;
  };
  monthlyChange: number;
  previousScore: number;
  financialLevel: 'critical' | 'building' | 'stable' | 'thriving' | 'exceptional';
  improvementTips: string[];
}

export class FinancialHealth2Engine {
  calculateScore(params: {
    transactions: HealthTxData[];
    budgets: HealthBudgetData[];
    bills: HealthBillData[];
    goals: HealthGoalData[];
    settlements: HealthSettlementData[];
    accounts: HealthAccountData[];
    monthlyIncome: number;
    previousScore?: number;
  }): FinancialHealth2Output {
    const {
      transactions, budgets, bills, goals, accounts, monthlyIncome, previousScore,
    } = params;

    const totalExpenses = transactions
      .filter(t => t.type === 'expense' || t.amount < 0)
      .reduce((s, t) => s + Math.abs(t.amount), 0);

    const savingsRate = this.calculateSavingsRate(monthlyIncome, totalExpenses);

    const debtPayments = transactions
      .filter(t =>
        t.category?.toLowerCase().includes('debt') ||
        t.category?.toLowerCase().includes('loan') ||
        t.category?.toLowerCase().includes('emi') ||
        t.category?.toLowerCase() === 'credit card'
      )
      .reduce((s, t) => s + Math.abs(t.amount), 0);
    const debtRatio = this.calculateDebtRatio(debtPayments, monthlyIncome);

    const budgetDiscipline = this.calculateBudgetDiscipline(budgets);

    const goalProgress = this.calculateGoalProgress(goals);

    const billConsistency = this.calculateBillConsistency(bills);

    const emergencyFund = this.calculateEmergencyFund(accounts, totalExpenses);

    const overallScore = Math.round(
      savingsRate * 0.25 +
      debtRatio * 0.20 +
      budgetDiscipline * 0.20 +
      goalProgress * 0.15 +
      billConsistency * 0.10 +
      emergencyFund * 0.10
    );

    const monthlyChange = previousScore !== undefined ? overallScore - previousScore : 0;

    const financialLevel = this.determineFinancialLevel(overallScore);

    const improvementTips = this.generateImprovementTips({
      savingsRate, debtRatio, budgetDiscipline, goalProgress, billConsistency, emergencyFund,
    });

    return {
      overallScore,
      components: {
        savingsRate: Math.round(savingsRate),
        debtRatio: Math.round(debtRatio),
        budgetDiscipline: Math.round(budgetDiscipline),
        goalProgress: Math.round(goalProgress),
        billConsistency: Math.round(billConsistency),
        emergencyFund: Math.round(emergencyFund),
      },
      monthlyChange,
      previousScore: previousScore ?? 0,
      financialLevel,
      improvementTips,
    };
  }

  private calculateSavingsRate(monthlyIncome: number, totalExpenses: number): number {
    if (monthlyIncome <= 0) return 0;
    const savings = monthlyIncome - totalExpenses;
    const rate = savings / monthlyIncome;
    if (rate >= 0.3) return 100;
    if (rate <= 0) return 0;
    return Math.round(rate * 100);
  }

  private calculateDebtRatio(debtPayments: number, monthlyIncome: number): number {
    if (monthlyIncome <= 0) return 100;
    const ratio = debtPayments / monthlyIncome;
    if (ratio < 0.1) return 100;
    if (ratio > 0.5) return 0;
    return Math.round(100 - ((ratio - 0.1) / 0.4) * 100);
  }

  private calculateBudgetDiscipline(budgets: HealthBudgetData[]): number {
    if (budgets.length === 0) return 100;
    const total = budgets.reduce((sum, b) => {
      if (b.spent <= b.amount) return sum + 100;
      const overRatio = b.spent / b.amount;
      const score = Math.max(0, 100 - (overRatio - 1) * 100);
      return sum + score;
    }, 0);
    return total / budgets.length;
  }

  private calculateGoalProgress(goals: HealthGoalData[]): number {
    if (goals.length === 0) return 100;
    const totalWeight = goals.reduce((s, g) => s + g.targetAmount, 0);
    if (totalWeight === 0) return 100;
    const weightedProgress = goals.reduce((sum, g) => {
      const progress = g.targetAmount > 0 ? g.currentAmount / g.targetAmount : 1;
      return sum + Math.min(progress, 1) * g.targetAmount;
    }, 0);
    return Math.round((weightedProgress / totalWeight) * 100);
  }

  private calculateBillConsistency(bills: HealthBillData[]): number {
    if (bills.length === 0) return 100;
    const paidOnTime = bills.filter(b => {
      if (!b.isPaid) return false;
      if (!b.paidDate) return true;
      return b.paidDate <= b.dueDate;
    });
    return Math.round((paidOnTime.length / bills.length) * 100);
  }

  private calculateEmergencyFund(accounts: HealthAccountData[], monthlyExpenses: number): number {
    const totalSavingsBalance = accounts
      .filter(a => a.type?.toLowerCase().includes('savings'))
      .reduce((s, a) => s + a.balance, 0);
    if (monthlyExpenses <= 0) {
      return totalSavingsBalance > 0 ? 100 : 0;
    }
    const monthsCovered = totalSavingsBalance / monthlyExpenses;
    if (monthsCovered >= 6) return 100;
    if (monthsCovered >= 3) return 75;
    if (monthsCovered >= 1) return 50;
    if (monthsCovered > 0) return 25;
    return 0;
  }

  private determineFinancialLevel(score: number): 'critical' | 'building' | 'stable' | 'thriving' | 'exceptional' {
    if (score >= 85) return 'exceptional';
    if (score >= 70) return 'thriving';
    if (score >= 50) return 'stable';
    if (score >= 30) return 'building';
    return 'critical';
  }

  private generateImprovementTips(components: Record<string, number>): string[] {
    const thresholds: Record<string, { low: number; tips: string[] }> = {
      savingsRate: {
        low: 50,
        tips: [
          'Try the 50/30/20 rule: 50% needs, 30% wants, 20% savings',
          'Set up an automatic monthly transfer to your savings account',
        ],
      },
      debtRatio: {
        low: 60,
        tips: [
          'Focus on paying off high-interest debts first',
          'Consider consolidating multiple debts into one manageable payment',
        ],
      },
      budgetDiscipline: {
        low: 60,
        tips: [
          'Review your top 3 overspent categories and set stricter limits',
          'Use the envelope method for variable expenses like dining out',
        ],
      },
      goalProgress: {
        low: 40,
        tips: [
          'Break down large goals into smaller monthly targets',
          'Increase your goal contributions by even 5% for faster progress',
        ],
      },
      billConsistency: {
        low: 70,
        tips: [
          'Set up auto-pay for recurring bills to never miss a due date',
          'Use bill reminders 3 days before each due date',
        ],
      },
      emergencyFund: {
        low: 60,
        tips: [
          'Aim to build 3-6 months of expenses in an emergency fund',
          'Start small — save just ₹500 a week for your emergency corpus',
        ],
      },
    };

    const sorted = Object.entries(components)
      .map(([key, score]) => ({ key, score, threshold: thresholds[key] }))
      .sort((a, b) => a.score - b.score);

    const tips: string[] = [];
    const usedTips = new Set<string>();

    for (const item of sorted) {
      if (item.score < item.threshold.low && tips.length < 4) {
        for (const tip of item.threshold.tips) {
          if (!usedTips.has(tip) && tips.length < 4) {
            usedTips.add(tip);
            tips.push(tip);
          }
        }
      }
    }

    if (tips.length === 0) {
      tips.push('Excellent financial health! Keep up the great habits.');
    }

    return tips;
  }
}

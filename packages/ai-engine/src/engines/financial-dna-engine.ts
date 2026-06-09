interface DnaTransactionData {
  id: string;
  amount: number;
  description?: string;
  category?: string;
  date: Date;
  type: 'income' | 'expense' | 'transfer';
}

interface DnaAccountData {
  id: string;
  type: string;
  balance: number;
}

interface DnaSettlementData {
  id: string;
  from: string;
  to: string;
  amount: number;
  date: Date;
  status: string;
}

interface DnaBudgetData {
  id: string;
  category?: string;
  amount: number;
  spent: number;
  period: string;
}

interface DnaGoalData {
  id: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: Date;
}

interface FinancialDnaOutput {
  spendingPersonality: string;
  savingPersonality: string;
  riskLevel: string;
  spendingScore: number;
  savingScore: number;
  disciplineScore: number;
  weekendSpendingPct: number;
  luxurySpendingScore: number;
  impulsePurchaseScore: number;
  familyContributionScore: number;
  settlementReliabilityScore: number;
  incomeConsistency: string;
  billPaymentBehavior: string;
  topCategoryPreference?: string;
  disciplinePercentile: number;
  savingsPercentile: number;
  weekStart: string;
  weekEnd: string;
  insights: string[];
}

const LUXURY_CATEGORIES = new Set(['shopping', 'entertainment', 'dining', 'travel']);

const LOW_RISK_CATEGORIES = new Set([
  'groceries', 'utilities', 'rent', 'health', 'insurance', 'education', 'transport',
]);

const HIGH_RISK_CATEGORIES = new Set([
  'investments', 'crypto', 'stocks', 'trading', 'business', 'venture',
]);

export class FinancialDnaEngine {
  generateDna(params: {
    transactions: DnaTransactionData[];
    accounts: DnaAccountData[];
    settlements: DnaSettlementData[];
    budgets: DnaBudgetData[];
    goals: DnaGoalData[];
    monthlyIncome: number;
    userId: string;
  }): FinancialDnaOutput {
    const { transactions, accounts, settlements, budgets, goals, monthlyIncome } = params;

    const expenses = transactions.filter(t => t.type === 'expense');
    const income = transactions.filter(t => t.type === 'income');
    const totalExpenses = expenses.reduce((s, t) => s + t.amount, 0);
    const totalIncome = income.reduce((s, t) => s + t.amount, 0) || monthlyIncome;
    const effectiveIncome = Math.max(totalIncome, monthlyIncome);

    const spendingToIncomeRatio = effectiveIncome > 0 ? totalExpenses / effectiveIncome : 0;
    const savingsRate = effectiveIncome > 0 ? (effectiveIncome - totalExpenses) / effectiveIncome : 0;

    const spendingPersonality = this.classifySpendingPersonality(spendingToIncomeRatio);
    const savingPersonality = this.classifySavingPersonality(savingsRate);

    const riskLevel = this.computeRiskLevel(expenses);
    const spendingScore = this.computeSpendingScore(spendingToIncomeRatio);
    const savingScore = this.computeSavingScore(savingsRate);
    const disciplineScore = this.computeDisciplineScore(expenses, budgets);
    const weekendSpendingPct = this.computeWeekendSpendingPct(expenses);
    const luxurySpendingScore = this.computeLuxurySpendingScore(expenses);
    const impulsePurchaseScore = this.computeImpulsePurchaseScore(expenses);
    const familyContributionScore = this.computeFamilyContributionScore(accounts, settlements);
    const settlementReliabilityScore = this.computeSettlementReliabilityScore(settlements);

    const incomeConsistency = this.classifyIncomeConsistency(income);
    const billPaymentBehavior = this.classifyBillPaymentBehavior(settlements);

    const topCategoryPreference = this.findTopCategory(expenses);

    const disciplinePercentile = this.simulatePercentile(disciplineScore);
    const savingsPercentile = this.simulatePercentile(savingScore);

    const { weekStart, weekEnd } = this.getCurrentWeekRange();

    const insights = this.generateInsights({
      spendingPersonality, savingPersonality, riskLevel, spendingScore, savingScore,
      disciplineScore, weekendSpendingPct, luxurySpendingScore, impulsePurchaseScore,
      familyContributionScore, settlementReliabilityScore, incomeConsistency,
      billPaymentBehavior, topCategoryPreference, disciplinePercentile, savingsPercentile,
      savingsRate, spendingToIncomeRatio, totalExpenses, effectiveIncome,
    });

    return {
      spendingPersonality,
      savingPersonality,
      riskLevel,
      spendingScore,
      savingScore,
      disciplineScore,
      weekendSpendingPct,
      luxurySpendingScore,
      impulsePurchaseScore,
      familyContributionScore,
      settlementReliabilityScore,
      incomeConsistency,
      billPaymentBehavior,
      topCategoryPreference,
      disciplinePercentile,
      savingsPercentile,
      weekStart,
      weekEnd,
      insights,
    };
  }

  private classifySpendingPersonality(ratio: number): string {
    if (ratio < 0.3) return 'frugal';
    if (ratio < 0.6) return 'balanced';
    if (ratio < 0.85) return 'spender';
    return 'lavish';
  }

  private classifySavingPersonality(rate: number): string {
    if (rate > 0.5) return 'hoarder';
    if (rate >= 0.2) return 'moderate';
    return 'spender';
  }

  private computeRiskLevel(expenses: DnaTransactionData[]): string {
    if (expenses.length === 0) return 'moderate';

    let lowRiskAmount = 0;
    let highRiskAmount = 0;
    let total = 0;

    for (const t of expenses) {
      const cat = t.category?.toLowerCase() || '';
      total += t.amount;
      if (LOW_RISK_CATEGORIES.has(cat)) {
        lowRiskAmount += t.amount;
      } else if (HIGH_RISK_CATEGORIES.has(cat)) {
        highRiskAmount += t.amount;
      }
    }

    if (total === 0) return 'moderate';

    const lowPct = lowRiskAmount / total;
    const highPct = highRiskAmount / total;

    if (highPct > 0.3) return 'aggressive';
    if (lowPct > 0.6) return 'conservative';
    return 'moderate';
  }

  private computeSpendingScore(ratio: number): number {
    if (ratio <= 0.2) return 10;
    if (ratio <= 0.4) return 30;
    if (ratio <= 0.6) return 50;
    if (ratio <= 0.85) return 70;
    return 90;
  }

  private computeSavingScore(rate: number): number {
    if (rate >= 0.5) return 95;
    if (rate >= 0.3) return 80;
    if (rate >= 0.2) return 65;
    if (rate >= 0.1) return 45;
    if (rate >= 0) return 25;
    return 10;
  }

  private computeDisciplineScore(
    expenses: DnaTransactionData[],
    budgets: DnaBudgetData[]
  ): number {
    if (expenses.length === 0 && budgets.length === 0) return 70;

    let budgetScore = 50;
    if (budgets.length > 0) {
      const totalBudgeted = budgets.reduce((s, b) => s + b.amount, 0);
      const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
      if (totalBudgeted > 0) {
        const adherence = totalSpent / totalBudgeted;
        budgetScore = adherence <= 0.8 ? 95 : adherence <= 1.0 ? 75 : adherence <= 1.2 ? 50 : 25;
      }
    }

    let consistencyScore = 50;
    if (expenses.length >= 2) {
      const amounts = expenses.map(t => t.amount);
      const avg = amounts.reduce((s, a) => s + a, 0) / amounts.length;
      const variance = amounts.reduce((s, a) => s + (a - avg) ** 2, 0) / amounts.length;
      const stdDev = Math.sqrt(variance);
      const cv = avg > 0 ? stdDev / avg : 0;
      consistencyScore = cv <= 0.5 ? 90 : cv <= 1 ? 70 : cv <= 1.5 ? 50 : 30;
    }

    return Math.round((budgetScore + consistencyScore) / 2);
  }

  private computeWeekendSpendingPct(expenses: DnaTransactionData[]): number {
    if (expenses.length === 0) return 0;

    let weekendAmount = 0;
    let totalAmount = 0;

    for (const t of expenses) {
      const day = t.date.getDay();
      totalAmount += t.amount;
      if (day === 0 || day === 6) {
        weekendAmount += t.amount;
      }
    }

    return totalAmount > 0 ? Math.round((weekendAmount / totalAmount) * 100) : 0;
  }

  private computeLuxurySpendingScore(expenses: DnaTransactionData[]): number {
    if (expenses.length === 0) return 0;

    let luxuryAmount = 0;
    let totalAmount = 0;

    for (const t of expenses) {
      totalAmount += t.amount;
      const cat = t.category?.toLowerCase() || '';
      if (LUXURY_CATEGORIES.has(cat)) {
        luxuryAmount += t.amount;
      }
    }

    return totalAmount > 0 ? Math.round((luxuryAmount / totalAmount) * 100) : 0;
  }

  private computeImpulsePurchaseScore(expenses: DnaTransactionData[]): number {
    if (expenses.length < 3) return 0;

    const amounts = expenses.map(t => t.amount);
    const avg = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    const largeTransactions = expenses.filter(t => t.amount > avg * 2).length;
    const largeRatio = largeTransactions / expenses.length;

    const luxuryCount = expenses.filter(t => {
      const cat = t.category?.toLowerCase() || '';
      return LUXURY_CATEGORIES.has(cat);
    }).length;
    const luxuryRatio = luxuryCount / expenses.length;

    const rawScore = (largeRatio * 60 + luxuryRatio * 40);
    return Math.min(Math.round(rawScore * 100), 100);
  }

  private computeFamilyContributionScore(
    accounts: DnaAccountData[],
    settlements: DnaSettlementData[]
  ): number {
    const hasSharedAccount = accounts.some(a =>
      a.type?.toLowerCase().includes('joint') || a.type?.toLowerCase().includes('shared') || a.type?.toLowerCase().includes('family')
    );

    const totalSettled = settlements.filter(s => s.status === 'completed').reduce((s, st) => s + st.amount, 0);
    const totalSettlements = settlements.reduce((s, st) => s + st.amount, 0);

    let score = hasSharedAccount ? 40 : 20;

    if (totalSettlements > 0) {
      const settledRatio = totalSettled / totalSettlements;
      score += Math.round(settledRatio * 40);
    }

    if (settlements.length >= 5) score += 10;
    if (settlements.length >= 10) score += 10;

    return Math.min(score, 100);
  }

  private computeSettlementReliabilityScore(settlements: DnaSettlementData[]): number {
    if (settlements.length === 0) return 80;

    const completedShare = settlements.filter(s => s.status === 'completed').length / settlements.length;
    const baseScore = Math.round(completedShare * 100);

    const pending = settlements.filter(s => s.status !== 'completed');
    if (pending.length === 0) return Math.max(baseScore, 70);

    const avgDaysOutstanding = pending.reduce((sum, s) => {
      const days = Math.abs((new Date().getTime() - new Date(s.date).getTime()) / (1000 * 60 * 60 * 24));
      return sum + days;
    }, 0) / pending.length;

    const timelinessDeduction = avgDaysOutstanding <= 3 ? 0 : avgDaysOutstanding <= 7 ? 10 : avgDaysOutstanding <= 14 ? 20 : 35;

    return Math.max(Math.min(baseScore - timelinessDeduction, 100), 10);
  }

  private classifyIncomeConsistency(income: DnaTransactionData[]): string {
    if (income.length < 2) return income.length === 0 ? 'stable' : 'irregular';

    const amounts = income.map(t => t.amount);
    const avg = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    const variance = amounts.reduce((s, a) => s + (a - avg) ** 2, 0) / amounts.length;
    const stdDev = Math.sqrt(variance);
    const cv = avg > 0 ? stdDev / avg : 0;

    if (cv <= 0.3) return 'stable';
    if (cv <= 0.7) return 'seasonal';
    return 'irregular';
  }

  private classifyBillPaymentBehavior(settlements: DnaSettlementData[]): string {
    if (settlements.length === 0) return 'ontime';

    const completed = settlements.filter(s => s.status === 'completed');
    if (completed.length === 0) return 'inconsistent';

    const fastSettlements = completed.filter(s => {
      const days = Math.abs((new Date().getTime() - new Date(s.date).getTime()) / (1000 * 60 * 60 * 24));
      return days <= 3;
    });
    const fastRatio = fastSettlements.length / completed.length;

    if (fastRatio >= 0.8) return 'ontime';
    if (fastRatio >= 0.4) return 'inconsistent';
    return 'late';
  }

  private findTopCategory(expenses: DnaTransactionData[]): string | undefined {
    const categoryTotals = new Map<string, number>();
    for (const t of expenses) {
      const cat = t.category || 'Other';
      categoryTotals.set(cat, (categoryTotals.get(cat) || 0) + t.amount);
    }
    if (categoryTotals.size === 0) return undefined;
    return [...categoryTotals.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }

  private simulatePercentile(score: number): number {
    const jitter = Math.random() * 10 - 5;
    return Math.max(1, Math.min(99, Math.round(score + jitter)));
  }

  private getCurrentWeekRange(): { weekStart: string; weekEnd: string } {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      weekStart: monday.toISOString().split('T')[0],
      weekEnd: sunday.toISOString().split('T')[0],
    };
  }

  private generateInsights(context: {
    spendingPersonality: string;
    savingPersonality: string;
    riskLevel: string;
    spendingScore: number;
    savingScore: number;
    disciplineScore: number;
    weekendSpendingPct: number;
    luxurySpendingScore: number;
    impulsePurchaseScore: number;
    familyContributionScore: number;
    settlementReliabilityScore: number;
    incomeConsistency: string;
    billPaymentBehavior: string;
    topCategoryPreference?: string;
    disciplinePercentile: number;
    savingsPercentile: number;
    savingsRate: number;
    spendingToIncomeRatio: number;
    totalExpenses: number;
    effectiveIncome: number;
  }): string[] {
    const insights: string[] = [];

    if (context.savingsRate >= 0.2) {
      insights.push(`You save ${Math.round(context.savingsRate * 100)}% of your income — great financial habit!`);
    } else if (context.savingsRate < 0) {
      insights.push('Your expenses exceed your income. Consider reviewing your spending.');
    } else {
      insights.push(`Your savings rate is ${Math.round(context.savingsRate * 100)}%. Aim for at least 20%.`);
    }

    if (context.luxurySpendingScore > 40) {
      insights.push(`${context.luxurySpendingScore}% of your spending goes to luxury categories — consider balancing with essentials.`);
    }

    if (context.weekendSpendingPct > 50) {
      insights.push(`Most of your spending (${context.weekendSpendingPct}%) happens on weekends — those little outings add up!`);
    }

    if (context.settlementReliabilityScore < 50) {
      insights.push('Your settlement reliability needs improvement. Try settling dues faster.');
    } else if (context.settlementReliabilityScore >= 80) {
      insights.push('You are highly reliable with settlements — your group members appreciate that!');
    }

    if (context.impulsePurchaseScore > 60) {
      insights.push('Frequent large or irregular purchases detected. Try a 24-hour wait rule before big spends.');
    }

    if (context.disciplineScore >= 80) {
      insights.push('Your spending discipline is excellent — you stick to your budgets well.');
    } else if (context.disciplineScore < 40) {
      insights.push('Your spending patterns are inconsistent. Setting a monthly budget could help.');
    }

    if (context.billPaymentBehavior === 'ontime') {
      insights.push('You always pay on time — your financial responsibility is commendable.');
    } else if (context.billPaymentBehavior === 'late') {
      insights.push('Late payments detected. Setting reminders could help avoid delays.');
    }

    if (context.familyContributionScore >= 70) {
      insights.push('You are a strong contributor to shared expenses — your family/group values your support.');
    }

    if (context.topCategoryPreference) {
      insights.push(`Your top spending category is "${context.topCategoryPreference}".`);
    }

    return insights.slice(0, 6);
  }
}

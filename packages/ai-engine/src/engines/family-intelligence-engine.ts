interface FamilyMemberData {
  id: string;
  userId: string;
  name: string;
}

interface FamilyTransactionData {
  id: string;
  amount: number;
  description?: string;
  category?: string;
  date: Date;
  userId: string;
  type: 'income' | 'expense';
}

interface FamilyBillData {
  id: string;
  name: string;
  amount: number;
  dueDate: Date;
  isPaid: boolean;
  paidByUserId?: string;
  category?: string;
}

interface FamilyGoalData {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
}

interface FamilyEmergencyFund {
  totalAmount: number;
  targetMonths: number;
}

interface FamilyDebtData {
  id: string;
  amount: number;
  name: string;
  interestRate?: number;
}

interface FamilyIntelligenceOutput {
  savingsRate: number;
  sharedBillScore: number;
  emergencyFundMonths: number;
  debtPressureScore: number;
  healthScore: number;
  monthlyChange: number;
  insights: string[];
  recommendations: string[];
  periodStart: string;
  periodEnd: string;
}

export class FamilyIntelligenceEngine {
  generateFamilyDashboard(params: {
    members: FamilyMemberData[];
    transactions: FamilyTransactionData[];
    bills: FamilyBillData[];
    goals: FamilyGoalData[];
    emergencyFund?: FamilyEmergencyFund;
    debts: FamilyDebtData[];
    previousHealthScore?: number;
  }): FamilyIntelligenceOutput {
    const { members, transactions, bills, goals, emergencyFund, debts, previousHealthScore } = params;

    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((s, t) => s + t.amount, 0);

    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0);

    const savingsRate = totalIncome > 0
      ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100)
      : 0;

    const totalBills = bills.length;
    const paidBills = bills.filter(b => b.isPaid).length;
    const sharedBillScore = totalBills > 0
      ? Math.round((paidBills / totalBills) * 100)
      : 100;

    const monthlyExpenses = this.calculateMonthlyExpenses(transactions);
    const emergencyFundMonths = monthlyExpenses > 0 && emergencyFund
      ? Math.round((emergencyFund.totalAmount / monthlyExpenses) * 10) / 10
      : 0;

    const totalDebt = debts.reduce((s, d) => s + d.amount, 0);
    const annualIncome = totalIncome * 12;
    const debtPressureScore = annualIncome > 0
      ? Math.min(Math.round((totalDebt / annualIncome) * 100), 100)
      : 0;

    const healthScore = Math.round(
      Math.min(savingsRate, 100) * 0.3 +
      sharedBillScore * 0.2 +
      Math.min(emergencyFundMonths * 16.67, 100) * 0.25 +
      (100 - debtPressureScore) * 0.25
    );

    const monthlyChange = previousHealthScore !== undefined
      ? healthScore - previousHealthScore
      : 0;

    const insights = this.generateInsights({
      savingsRate,
      sharedBillScore,
      emergencyFundMonths,
      debtPressureScore,
      totalIncome,
      totalExpenses,
      goals,
      members,
      totalBills,
      paidBills,
      debts,
      emergencyFund,
    });

    const recommendations = this.generateRecommendations({
      savingsRate,
      sharedBillScore,
      emergencyFundMonths,
      debtPressureScore,
      healthScore,
      goals,
      debts,
      emergencyFund,
      monthlyExpenses,
    });

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const periodEnd = now.toISOString();

    return {
      savingsRate: Math.min(savingsRate, 100),
      sharedBillScore,
      emergencyFundMonths,
      debtPressureScore,
      healthScore,
      monthlyChange,
      insights,
      recommendations,
      periodStart,
      periodEnd,
    };
  }

  calculateEmergencyFundReadiness(
    emergencyFund: number,
    monthlyExpenses: number
  ): { months: number; status: string } {
    const months = monthlyExpenses > 0
      ? Math.round((emergencyFund / monthlyExpenses) * 10) / 10
      : 0;

    let status: string;
    if (months < 1) {
      status = 'critical';
    } else if (months <= 3) {
      status = 'low';
    } else if (months <= 6) {
      status = 'adequate';
    } else {
      status = 'healthy';
    }

    return { months, status };
  }

  private calculateMonthlyExpenses(transactions: FamilyTransactionData[]): number {
    const expenses = transactions.filter(t => t.type === 'expense');
    if (expenses.length === 0) return 0;

    const dateGroups = new Map<string, number>();
    for (const t of expenses) {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      dateGroups.set(key, (dateGroups.get(key) || 0) + t.amount);
    }

    const monthlyTotals = [...dateGroups.values()];
    return monthlyTotals.reduce((s, v) => s + v, 0) / monthlyTotals.length;
  }

  private generateInsights(data: {
    savingsRate: number;
    sharedBillScore: number;
    emergencyFundMonths: number;
    debtPressureScore: number;
    totalIncome: number;
    totalExpenses: number;
    goals: FamilyGoalData[];
    members: FamilyMemberData[];
    totalBills: number;
    paidBills: number;
    debts: FamilyDebtData[];
    emergencyFund?: FamilyEmergencyFund;
  }): string[] {
    const insights: string[] = [];
    const { savingsRate, sharedBillScore, emergencyFundMonths, debtPressureScore, totalIncome, totalExpenses, goals, members, totalBills, paidBills, debts } = data;

    if (savingsRate >= 20) {
      insights.push(`Your family is saving ${savingsRate}% of income — an excellent habit.`);
    } else if (savingsRate >= 10) {
      insights.push(`Savings rate is ${savingsRate}%. Consider increasing it to 20% for stronger security.`);
    } else {
      insights.push(`Savings rate is low at ${savingsRate}%. Look for areas to cut expenses.`);
    }

    if (totalBills > 0) {
      const billPercent = Math.round((paidBills / totalBills) * 100);
      if (billPercent >= 90) {
        insights.push(`${billPercent}% of bills are paid on time — great shared responsibility.`);
      } else if (billPercent >= 70) {
        insights.push(`${billPercent}% of bills paid on time. Room for improvement in bill tracking.`);
      } else {
        insights.push(`Only ${billPercent}% of bills are paid on time. Set up reminders to avoid late fees.`);
      }
    }

    if (emergencyFundMonths > 0) {
      if (emergencyFundMonths >= 6) {
        insights.push(`Emergency fund covers ${emergencyFundMonths} months of expenses — very healthy.`);
      } else if (emergencyFundMonths >= 3) {
        insights.push(`Emergency fund covers ${emergencyFundMonths} months. Aim for 6 months for full security.`);
      } else {
        insights.push(`Emergency fund covers only ${emergencyFundMonths} months. Prioritize building this buffer.`);
      }
    } else {
      insights.push('No emergency fund set. This is a critical gap in your financial safety net.');
    }

    if (debtPressureScore > 50) {
      insights.push(`Debt level is high at ${debtPressureScore}%. Consider a debt reduction plan.`);
    } else if (debtPressureScore > 30) {
      insights.push(`Debt pressure is moderate at ${debtPressureScore}%. Keep paying down balances.`);
    } else if (debts.length > 0) {
      insights.push(`Debt is well-managed with a pressure score of ${debtPressureScore}%.`);
    }

    if (goals.length > 0) {
      const completedGoals = goals.filter(g => g.currentAmount >= g.targetAmount).length;
      if (completedGoals === goals.length) {
        insights.push('All family financial goals are on track or completed!');
      } else {
        const totalProgress = goals.reduce((s, g) => s + (g.currentAmount / g.targetAmount), 0) / goals.length;
        const progressPercent = Math.round(totalProgress * 100);
        insights.push(`Overall goal progress is ${progressPercent}% across ${goals.length} goals.`);
      }
    }

    return insights;
  }

  private generateRecommendations(data: {
    savingsRate: number;
    sharedBillScore: number;
    emergencyFundMonths: number;
    debtPressureScore: number;
    healthScore: number;
    goals: FamilyGoalData[];
    debts: FamilyDebtData[];
    emergencyFund?: FamilyEmergencyFund;
    monthlyExpenses: number;
  }): string[] {
    const recommendations: string[] = [];
    const { savingsRate, sharedBillScore, emergencyFundMonths, debtPressureScore, healthScore, goals, debts, monthlyExpenses } = data;

    if (savingsRate < 10) {
      recommendations.push('Create a family budget to increase savings rate above 10%.');
    }

    if (sharedBillScore < 80) {
      recommendations.push('Set up automated bill payments or shared reminders to improve bill tracking.');
    }

    if (emergencyFundMonths < 3) {
      if (data.emergencyFund) {
        const needed = Math.round(3 * monthlyExpenses - (data.emergencyFund?.totalAmount || 0));
        recommendations.push(`Build emergency fund to cover 3 months of expenses (need approximately ₹${needed.toLocaleString()} more).`);
      } else {
        const target = Math.round(3 * monthlyExpenses);
        recommendations.push(`Build an emergency fund of at least ₹${target.toLocaleString()} (3 months of expenses).`);
      }
    }

    if (debtPressureScore > 50) {
      const highInterestDebts = debts.filter(d => (d.interestRate || 0) > 12);
      if (highInterestDebts.length > 0) {
        recommendations.push(`Prioritize paying off high-interest debt (${highInterestDebts.map(d => d.name).join(', ')}).`);
      } else {
        recommendations.push('Create a debt payoff plan to reduce overall debt burden.');
      }
    }

    if (goals.length === 0) {
      recommendations.push('Set at least one family financial goal to align savings with shared aspirations.');
    } else {
      const stalledGoals = goals.filter(g => g.currentAmount < g.targetAmount * 0.1);
      if (stalledGoals.length > 0) {
        recommendations.push('Review stalled goals and define smaller milestones to regain momentum.');
      }
    }

    if (healthScore >= 80) {
      recommendations.push('Excellent financial health! Consider exploring investment options for surplus funds.');
    } else if (healthScore >= 60) {
      recommendations.push('Good financial foundation. Focus on the areas above to reach excellent health.');
    } else {
      recommendations.push('Start with one small change — automate savings or track expenses for a month.');
    }

    return recommendations;
  }
}

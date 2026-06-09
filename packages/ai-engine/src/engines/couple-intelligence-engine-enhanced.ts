interface CoupleTxData {
  id: string;
  amount: number;
  description?: string;
  category?: string;
  date: Date;
  paidBy: string;
  paidByName: string;
}

interface CoupleMemberData {
  id: string;
  userId: string;
  name: string;
}

interface CoupleGoalData {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  createdByUserId: string;
}

interface CoupleIncomeData {
  userId: string;
  amount: number;
  frequency: string;
}

interface CoupleIntelligenceOutput {
  compatibilityScore: number;
  spendingAlignment: number;
  savingsAlignment: number;
  financialDiscipline: number;
  sharedGoalAlignment: number;
  spendingDifferences: { category: string; partnerA: number; partnerB: number; difference: number }[];
  insights: string[];
  recommendations: string[];
  monthlyReport: {
    wins: string[];
    challenges: string[];
    suggestions: string[];
  };
  periodStart: string;
  periodEnd: string;
}

export class CoupleIntelligenceEngine {
  analyzeCompatibility(params: {
    partner1: CoupleMemberData;
    partner2: CoupleMemberData;
    expenses: CoupleTxData[];
    goals: CoupleGoalData[];
    incomes: CoupleIncomeData[];
    periodStart: Date;
    periodEnd: Date;
  }): CoupleIntelligenceOutput {
    const { partner1, partner2, expenses, goals, incomes, periodStart, periodEnd } = params;
    const p1Id = partner1.userId;
    const p2Id = partner2.userId;

    const spendingAlignment = this.calculateSpendingAlignment(expenses, p1Id, p2Id);
    const savingsAlignment = this.calculateSavingsAlignment(expenses, incomes, p1Id, p2Id);
    const financialDiscipline = this.calculateFinancialDiscipline(expenses, p1Id, p2Id);
    const sharedGoalAlignment = this.calculateSharedGoalAlignment(goals, p1Id, p2Id);

    const compatibilityScore = Math.round(
      spendingAlignment * 0.30 +
      savingsAlignment * 0.25 +
      financialDiscipline * 0.25 +
      sharedGoalAlignment * 0.20
    );

    const spendingDifferences = this.calculatePartnerComparison(expenses, p1Id, p2Id);
    const insights = this.generateInsights(
      spendingDifferences, spendingAlignment, savingsAlignment,
      financialDiscipline, sharedGoalAlignment, partner1, partner2
    );
    const recommendations = this.generateRecommendations(
      spendingAlignment, savingsAlignment, financialDiscipline,
      sharedGoalAlignment, spendingDifferences, partner1, partner2
    );
    const monthlyReport = this.generateMonthlyReport(
      spendingAlignment, savingsAlignment, financialDiscipline,
      sharedGoalAlignment, partner1, partner2
    );

    return {
      compatibilityScore,
      spendingAlignment,
      savingsAlignment,
      financialDiscipline,
      sharedGoalAlignment,
      spendingDifferences,
      insights,
      recommendations,
      monthlyReport,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    };
  }

  calculatePartnerComparison(
    expenses: CoupleTxData[],
    partner1Id: string,
    partner2Id: string
  ): { category: string; partnerA: number; partnerB: number; difference: number }[] {
    const categoryMap = new Map<string, { a: number; b: number }>();

    for (const tx of expenses) {
      const cat = tx.category || 'Other';
      if (!categoryMap.has(cat)) {
        categoryMap.set(cat, { a: 0, b: 0 });
      }
      const entry = categoryMap.get(cat)!;
      if (tx.paidBy === partner1Id) {
        entry.a += tx.amount;
      } else if (tx.paidBy === partner2Id) {
        entry.b += tx.amount;
      }
    }

    return [...categoryMap.entries()]
      .map(([category, { a, b }]) => ({
        category,
        partnerA: Math.round(a * 100) / 100,
        partnerB: Math.round(b * 100) / 100,
        difference: Math.round(Math.abs(a - b) * 100) / 100,
      }))
      .sort((x, y) => y.difference - x.difference);
  }

  private calculateSpendingAlignment(expenses: CoupleTxData[], p1Id: string, p2Id: string): number {
    const p1Total = expenses.filter(t => t.paidBy === p1Id).reduce((s, t) => s + t.amount, 0);
    const p2Total = expenses.filter(t => t.paidBy === p2Id).reduce((s, t) => s + t.amount, 0);
    const total = p1Total + p2Total;

    if (total === 0) return 100;

    const categories = [...new Set(expenses.map(t => t.category || 'Other'))];
    let totalDifference = 0;

    for (const cat of categories) {
      const p1Cat = expenses.filter(
        t => (t.category || 'Other') === cat && t.paidBy === p1Id
      ).reduce((s, t) => s + t.amount, 0);
      const p2Cat = expenses.filter(
        t => (t.category || 'Other') === cat && t.paidBy === p2Id
      ).reduce((s, t) => s + t.amount, 0);

      const p1Percent = p1Total > 0 ? (p1Cat / p1Total) * 100 : 0;
      const p2Percent = p2Total > 0 ? (p2Cat / p2Total) * 100 : 0;

      totalDifference += Math.abs(p1Percent - p2Percent);
    }

    const avgDifference = categories.length > 0 ? totalDifference / categories.length : 0;
    return Math.max(0, Math.min(100, Math.round(100 - avgDifference)));
  }

  private calculateSavingsAlignment(
    expenses: CoupleTxData[],
    incomes: CoupleIncomeData[],
    p1Id: string,
    p2Id: string
  ): number {
    const getMonthlyIncome = (userId: string): number => {
      const income = incomes.find(i => i.userId === userId);
      if (!income) return 0;
      switch (income.frequency) {
        case 'weekly': return income.amount * 4.33;
        case 'biweekly': return income.amount * 2.17;
        case 'monthly': return income.amount;
        case 'yearly': return income.amount / 12;
        default: return income.amount;
      }
    };

    const p1Income = getMonthlyIncome(p1Id);
    const p2Income = getMonthlyIncome(p2Id);

    if (p1Income === 0 && p2Income === 0) return 50;

    const months = [...new Set(expenses.map(t => {
      const d = new Date(t.date);
      return `${d.getFullYear()}-${d.getMonth()}`;
    }))];
    const numMonths = Math.max(months.length, 1);

    const p1Total = expenses.filter(t => t.paidBy === p1Id).reduce((s, t) => s + t.amount, 0);
    const p2Total = expenses.filter(t => t.paidBy === p2Id).reduce((s, t) => s + t.amount, 0);

    const p1Monthly = p1Total / numMonths;
    const p2Monthly = p2Total / numMonths;

    const p1SavingsRate = p1Income > 0 ? ((p1Income - p1Monthly) / p1Income) * 100 : 0;
    const p2SavingsRate = p2Income > 0 ? ((p2Income - p2Monthly) / p2Income) * 100 : 0;

    const rateDiff = Math.abs(p1SavingsRate - p2SavingsRate);
    return Math.max(0, Math.min(100, Math.round(100 - rateDiff)));
  }

  private calculateFinancialDiscipline(expenses: CoupleTxData[], p1Id: string, p2Id: string): number {
    const monthlyMap = new Map<string, { p1: number; p2: number }>();

    for (const tx of expenses) {
      const d = new Date(tx.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, { p1: 0, p2: 0 });
      }
      const entry = monthlyMap.get(key)!;
      if (tx.paidBy === p1Id) entry.p1 += tx.amount;
      if (tx.paidBy === p2Id) entry.p2 += tx.amount;
    }

    const months = [...monthlyMap.values()];
    if (months.length < 2) return 50;

    const p1Values = months.map(m => m.p1);
    const p2Values = months.map(m => m.p2);

    const calculateCV = (values: number[]): number => {
      const mean = values.reduce((s, v) => s + v, 0) / values.length;
      if (mean === 0) return 0;
      const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
      return Math.sqrt(variance) / mean;
    };

    const p1CV = calculateCV(p1Values);
    const p2CV = calculateCV(p2Values);

    const avgCV = (p1CV + p2CV) / 2;
    return Math.max(0, Math.min(100, Math.round(100 - avgCV * 100)));
  }

  private calculateSharedGoalAlignment(goals: CoupleGoalData[], p1Id: string, p2Id: string): number {
    if (goals.length === 0) return 50;

    const p1Target = goals.filter(g => g.createdByUserId === p1Id).reduce((s, g) => s + g.targetAmount, 0);
    const p2Target = goals.filter(g => g.createdByUserId === p2Id).reduce((s, g) => s + g.targetAmount, 0);
    const totalTarget = p1Target + p2Target;

    if (totalTarget === 0) return 50;

    const p1Ratio = p1Target / totalTarget;
    const deviation = Math.abs(p1Ratio - 0.5);
    return Math.max(0, Math.min(100, Math.round((1 - deviation * 2) * 100)));
  }

  private generateInsights(
    spendingDifferences: { category: string; partnerA: number; partnerB: number; difference: number }[],
    spendingAlignment: number,
    savingsAlignment: number,
    financialDiscipline: number,
    sharedGoalAlignment: number,
    partner1: CoupleMemberData,
    partner2: CoupleMemberData
  ): string[] {
    const insights: string[] = [];

    if (spendingAlignment >= 80) {
      insights.push(`You and ${partner2.name} have very similar spending patterns.`);
    } else if (spendingAlignment >= 60) {
      insights.push(`Your spending habits are moderately aligned with ${partner2.name}.`);
    } else {
      insights.push(`Your spending patterns differ significantly from ${partner2.name}.`);
    }

    const topDiff = spendingDifferences[0];
    if (topDiff && topDiff.difference > 0) {
      const bigger = topDiff.partnerA > topDiff.partnerB ? partner1.name : partner2.name;
      insights.push(`${bigger} spends more on ${topDiff.category} compared to the other partner.`);
    }

    if (savingsAlignment >= 80) {
      insights.push('You both save at very similar rates.');
    } else if (savingsAlignment < 50) {
      insights.push('Your savings rates differ notably. Consider discussing savings goals.');
    }

    if (sharedGoalAlignment >= 80) {
      insights.push('You both contribute equally to shared financial goals.');
    } else if (sharedGoalAlignment < 50) {
      insights.push('Goal contributions are uneven. Try to balance shared goal ownership.');
    }

    if (financialDiscipline >= 80) {
      insights.push('Both partners show strong financial discipline.');
    } else if (financialDiscipline < 50) {
      insights.push('Irregular spending patterns detected. A joint budget may help.');
    }

    return insights;
  }

  private generateRecommendations(
    spendingAlignment: number,
    savingsAlignment: number,
    financialDiscipline: number,
    sharedGoalAlignment: number,
    spendingDifferences: { category: string; partnerA: number; partnerB: number; difference: number }[],
    partner1: CoupleMemberData,
    partner2: CoupleMemberData
  ): string[] {
    const recommendations: string[] = [];

    if (spendingAlignment < 60) {
      recommendations.push(`Create a shared budget to align spending between ${partner1.name} and ${partner2.name}.`);
    }

    if (savingsAlignment < 60) {
      recommendations.push('Open a joint savings account to build savings together.');
    }

    if (financialDiscipline < 60) {
      recommendations.push('Set up spending alerts and monthly budget reviews.');
    }

    if (sharedGoalAlignment < 60) {
      recommendations.push('Schedule a financial date night to align on shared goals.');
    }

    if (spendingDifferences.length > 0) {
      const bigDiff = spendingDifferences[0];
      if (bigDiff.difference > 500) {
        recommendations.push(
          `Review ${bigDiff.category} spending — there's a ₹${Math.round(bigDiff.difference).toLocaleString()} gap between partners.`
        );
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('Keep up the great financial teamwork!');
    }

    return recommendations;
  }

  private generateMonthlyReport(
    spendingAlignment: number,
    savingsAlignment: number,
    financialDiscipline: number,
    sharedGoalAlignment: number,
    partner1: CoupleMemberData,
    partner2: CoupleMemberData
  ): { wins: string[]; challenges: string[]; suggestions: string[] } {
    const wins: string[] = [];
    const challenges: string[] = [];
    const suggestions: string[] = [];

    if (spendingAlignment >= 70) wins.push('You both have compatible spending habits.');
    else challenges.push('Spending patterns need better alignment.');

    if (savingsAlignment >= 70) wins.push('Your savings rates are well matched.');
    else challenges.push('Savings rates differ — consider joint savings goals.');

    if (financialDiscipline >= 70) wins.push('Financial discipline is strong for both partners.');
    else challenges.push('Inconsistent spending patterns detected.');

    if (sharedGoalAlignment >= 70) wins.push('Shared goals are evenly contributed to.');
    else challenges.push('Goal contributions are unbalanced.');

    if (wins.length === 0) wins.push('You are tracking your expenses — that\'s a great start!');
    if (challenges.length === 0) challenges.push('No major issues detected this period.');

    suggestions.push('Review monthly spending together.');
    if (spendingAlignment < 70) suggestions.push('Consider separate discretionary budgets.');
    if (sharedGoalAlignment < 70) suggestions.push('Set a joint goal both partners contribute to equally.');

    return { wins, challenges, suggestions };
  }
}

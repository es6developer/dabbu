import {
  FinancialHealthScore,
  TrustScore,
  StressIndicator,
  SettlementData,
  MemberData,
  TransactionData,
} from '../types';

export class FinancialHealthEngine {
  calculateHealthScore(
    transactions: TransactionData[],
    settlements: SettlementData[],
    members: MemberData[],
    monthlyIncome?: number
  ): FinancialHealthScore {
    const settlement = this.calculateSettlementScore(settlements, members);
    const budgeting = this.calculateBudgetingScore(transactions, monthlyIncome);
    const savings = this.calculateSavingsScore(transactions, monthlyIncome);
    const discipline = this.calculateDisciplineScore(transactions, settlements);

    const overall = Math.round((settlement + budgeting + savings + discipline) / 4);

    let stressLevel: 'low' | 'moderate' | 'high' = 'low';
    if (overall < 40) stressLevel = 'high';
    else if (overall < 65) stressLevel = 'moderate';

    const warnings: string[] = [];
    const recommendations: string[] = [];

    if (settlement < 50) {
      warnings.push('Settlement reliability is low');
      recommendations.push('Try to settle dues within 3 days');
    }
    if (budgeting < 50) {
      warnings.push('Spending exceeds recommended limits');
      recommendations.push('Create a monthly budget');
    }
    if (savings < 40) {
      warnings.push('Savings rate is very low');
      recommendations.push('Aim to save at least 20% of income');
    }
    if (discipline < 50) {
      warnings.push('Irregular spending patterns detected');
      recommendations.push('Track daily expenses for better control');
    }

    if (overall >= 80) {
      recommendations.push('Great financial health! Consider investing surplus.');
    }

    return {
      overall, budgeting: Math.round(budgeting), settlement: Math.round(settlement),
      savings: Math.round(savings), discipline: Math.round(discipline),
      stressLevel, warnings, recommendations,
    };
  }

  calculateTrustScore(
    memberId: string,
    memberName: string,
    settlements: SettlementData[],
    transactions: TransactionData[]
  ): TrustScore {
    const mySettlements = settlements.filter(s => s.from === memberId || s.to === memberId);
    const myTransactions = transactions.filter(t => t.paidBy === memberId);

    const completedSettlements = mySettlements.filter(s => s.status === 'completed');
    const settlementReliability = mySettlements.length > 0
      ? Math.round((completedSettlements.length / mySettlements.length) * 100)
      : 100;

    const avgAmount = myTransactions.length > 0
      ? myTransactions.reduce((s, t) => s + t.amount, 0) / myTransactions.length
      : 0;
    const consistentTxns = myTransactions.filter(t =>
      Math.abs(t.amount - avgAmount) <= avgAmount * 0.5
    );
    const contributionConsistency = myTransactions.length > 0
      ? Math.round((consistentTxns.length / myTransactions.length) * 100)
      : 100;

    const asPayer = settlements.filter(s => s.from === memberId);
    const avgDaysToPay = asPayer.length > 0
      ? asPayer.reduce((sum, s) => {
          const days = Math.abs((new Date(s.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          return sum + days;
        }, 0) / asPayer.length
      : 0;
    const reimbursementSpeed = avgDaysToPay <= 1 ? 100 : avgDaysToPay <= 3 ? 80 : avgDaysToPay <= 7 ? 60 : avgDaysToPay <= 14 ? 40 : 20;

    const participationRate = transactions.length > 0
      ? Math.round((myTransactions.length / transactions.length) * 100)
      : 0;

    const score = Math.round((settlementReliability + contributionConsistency + reimbursementSpeed + participationRate) / 4);

    return {
      memberId, memberName, score, settlementReliability,
      contributionConsistency, reimbursementSpeed, participationRate,
    };
  }

  detectStress(transactions: TransactionData[], settlements: SettlementData[]): StressIndicator[] {
    const indicators: StressIndicator[] = [];

    const repeatingBorrowing = settlements.filter(s => s.from !== s.to);
    const borrowCounts = new Map<string, number>();
    for (const s of repeatingBorrowing) {
      borrowCounts.set(s.from, (borrowCounts.get(s.from) || 0) + 1);
    }
    for (const [memberId, count] of borrowCounts) {
      if (count >= 5) {
        indicators.push({
          type: 'repeated_borrowing',
          severity: count >= 10 ? 'high' : 'moderate',
          description: `Frequent settlements needed (${count} times)`,
          trend: count > 7 ? 'worsening' : 'stable',
          recommendation: 'Consider a shared budget to reduce frequent settlements',
        });
      }
    }

    const amounts = transactions.map(t => t.amount);
    const avgAmount = amounts.length > 0 ? amounts.reduce((s, a) => s + a, 0) / amounts.length : 0;
    const sorted = [...amounts].sort((a, b) => a - b);
    const increasing = sorted.slice(Math.floor(sorted.length * 0.7));
    if (increasing.length >= 3) {
      const recentAvg = increasing.reduce((s, a) => s + a, 0) / increasing.length;
      if (recentAvg > avgAmount * 1.5) {
        indicators.push({
          type: 'rising_emi',
          severity: 'moderate',
          description: 'Recent spending is significantly higher than average',
          trend: 'worsening',
          recommendation: 'Review recent large expenses for potential savings',
        });
      }
    }

    return indicators;
  }

  private calculateSettlementScore(settlements: SettlementData[], members: MemberData[]): number {
    if (settlements.length === 0) return 80;
    const completed = settlements.filter(s => s.status === 'completed').length;
    return Math.round((completed / settlements.length) * 100);
  }

  private calculateBudgetingScore(transactions: TransactionData[], monthlyIncome?: number): number {
    if (!monthlyIncome) return 70;
    const totalSpent = transactions.reduce((s, t) => s + t.amount, 0);
    const ratio = totalSpent / monthlyIncome;
    if (ratio <= 0.5) return 95;
    if (ratio <= 0.7) return 80;
    if (ratio <= 0.9) return 65;
    if (ratio <= 1.0) return 50;
    return 30;
  }

  private calculateSavingsScore(transactions: TransactionData[], monthlyIncome?: number): number {
    if (!monthlyIncome || monthlyIncome === 0) return 60;
    const totalSpent = transactions.reduce((s, t) => s + t.amount, 0);
    const savings = monthlyIncome - totalSpent;
    const rate = savings / monthlyIncome;
    if (rate >= 0.3) return 95;
    if (rate >= 0.2) return 80;
    if (rate >= 0.1) return 60;
    if (rate >= 0) return 40;
    return 20;
  }

  private calculateDisciplineScore(transactions: TransactionData[], settlements: SettlementData[]): number {
    if (transactions.length === 0) return 70;

    const amounts = transactions.map(t => t.amount);
    const avg = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    const variance = amounts.reduce((s, a) => s + (a - avg) ** 2, 0) / amounts.length;
    const stdDev = Math.sqrt(variance);
    const cv = avg > 0 ? stdDev / avg : 0;

    const baseScore = cv <= 0.5 ? 90 : cv <= 1 ? 70 : cv <= 1.5 ? 50 : 30;

    const pendingSettlements = settlements.filter(s => s.status !== 'completed').length;
    const pendingPenalty = Math.min(pendingSettlements * 5, 30);

    return Math.max(baseScore - pendingPenalty, 10);
  }
}

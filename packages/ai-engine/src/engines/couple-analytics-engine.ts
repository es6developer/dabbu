import { TransactionData, CoupleHealthScore, MemberData } from '../types';

export class CoupleAnalyticsEngine {
  calculateHealthScore(
    partnerA: string,
    partnerB: string,
    partnerAName: string,
    partnerBName: string,
    transactions: TransactionData[],
    monthlyIncomeA?: number,
    monthlyIncomeB?: number
  ): CoupleHealthScore {
    const aSpent = transactions.filter(t => t.paidBy === partnerA).reduce((s, t) => s + t.amount, 0);
    const bSpent = transactions.filter(t => t.paidBy === partnerB).reduce((s, t) => s + t.amount, 0);
    const totalSpent = aSpent + bSpent;

    const aPercent = totalSpent > 0 ? Math.round((aSpent / totalSpent) * 100) : 50;
    const bPercent = totalSpent > 0 ? Math.round((bSpent / totalSpent) * 100) : 50;

    const incomeRatio = monthlyIncomeA && monthlyIncomeB
      ? monthlyIncomeA / (monthlyIncomeA + monthlyIncomeB)
      : 0.5;

    const expectedContribution = Math.round(incomeRatio * 100);
    const deviation = Math.abs(aPercent - expectedContribution);

    let spendingCompatibility: number;
    if (deviation <= 10) spendingCompatibility = 90;
    else if (deviation <= 20) spendingCompatibility = 70;
    else if (deviation <= 30) spendingCompatibility = 50;
    else spendingCompatibility = 30;

    const monthlyTotals = this.getMonthlyTotals(transactions);
    let savingsTrend: 'up' | 'stable' | 'down' = 'stable';
    if (monthlyTotals.length >= 2) {
      const recent = monthlyTotals.slice(-3);
      const trend = recent.map(m => m.total);
      if (trend.length >= 2) {
        const firstHalf = trend.slice(0, Math.ceil(trend.length / 2));
        const secondHalf = trend.slice(Math.ceil(trend.length / 2));
        const firstAvg = firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length;
        savingsTrend = secondAvg < firstAvg ? 'up' : secondAvg > firstAvg * 1.1 ? 'down' : 'stable';
      }
    }

    const score = Math.round((spendingCompatibility + (savingsTrend === 'up' ? 90 : savingsTrend === 'stable' ? 70 : 40)) / 2);

    const recommendations: string[] = [];
    if (deviation > 20) {
      recommendations.push(`Contribution gap detected: ${partnerAName} contributes ${aPercent}% vs ${partnerBName}'s ${bPercent}%. Consider adjusting based on income.`);
    }
    if (spendingCompatibility < 50) {
      recommendations.push('Spending patterns differ significantly. Try a shared budget.');
    }
    if (savingsTrend === 'down') {
      recommendations.push('Combined savings are trending down. Review joint expenses.');
    }
    if (score >= 80) {
      recommendations.push('Great financial teamwork! Keep communicating openly.');
    }

    return {
      score,
      level: score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'needs_attention',
      contributionRatio: {
        partnerA: partnerAName,
        partnerB: partnerBName,
        ratio: `${aPercent}:${bPercent}`,
      },
      savingsTrend,
      spendingCompatibility,
      recommendations,
    };
  }

  generateMonthlyComparison(
    partnerA: string,
    partnerB: string,
    transactions: TransactionData[],
    month: number,
    year: number
  ): { partnerA: { name: string; spent: number; topCategory: string }; partnerB: { name: string; spent: number; topCategory: string }; difference: number; insight: string } {
    const monthTxns = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === month && d.getFullYear() === year;
    });

    const aTotal = monthTxns.filter(t => t.paidBy === partnerA).reduce((s, t) => s + t.amount, 0);
    const bTotal = monthTxns.filter(t => t.paidBy === partnerB).reduce((s, t) => s + t.amount, 0);

    const aTopCat = this.getTopCategory(monthTxns.filter(t => t.paidBy === partnerA));
    const bTopCat = this.getTopCategory(monthTxns.filter(t => t.paidBy === partnerB));

    const diff = Math.abs(aTotal - bTotal);
    const higher = aTotal > bTotal ? 'Partner A' : 'Partner B';

    return {
      partnerA: { name: 'Partner A', spent: aTotal, topCategory: aTopCat },
      partnerB: { name: 'Partner B', spent: bTotal, topCategory: bTopCat },
      difference: diff,
      insight: diff < 1000
        ? 'Nearly equal spending this month!'
        : `${higher} spent ₹${diff.toLocaleString()} more this month`,
    };
  }

  private getMonthlyTotals(transactions: TransactionData[]): { month: number; year: number; total: number }[] {
    const monthlyMap = new Map<string, number>();
    for (const t of transactions) {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      monthlyMap.set(key, (monthlyMap.get(key) || 0) + t.amount);
    }
    return [...monthlyMap.entries()]
      .map(([key, total]) => {
        const [year, month] = key.split('-').map(Number);
        return { month, year, total };
      })
      .sort((a, b) => a.year - b.year || a.month - b.month);
  }

  private getTopCategory(transactions: TransactionData[]): string {
    const catTotals = new Map<string, number>();
    for (const t of transactions) {
      const cat = t.category || 'Other';
      catTotals.set(cat, (catTotals.get(cat) || 0) + t.amount);
    }
    const sorted = [...catTotals.entries()].sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0][0] : 'N/A';
  }
}

interface AnomTransactionData {
  id: string;
  amount: number;
  description?: string;
  category?: string;
  date: Date;
  type: 'income' | 'expense';
}

interface AnomalyResult {
  type: 'spending_spike' | 'large_transaction' | 'unusual_category' | 'income_drop' | 'missing_expected';
  category?: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  actualValue: number;
  expectedValue: number;
  deviationPct: number;
  transactionId?: string;
}

export class AnomalyDetectionEngine {
  detectCategorySpikes(transactions: AnomTransactionData[]): AnomalyResult[] {
    const results: AnomalyResult[] = [];

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const currentMonthTxns = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear && t.type === 'expense';
    });

    let prevMonth = currentMonth - 1;
    let prevYear = currentYear;
    if (prevMonth < 0) {
      prevMonth = 11;
      prevYear--;
    }

    const prevMonthTxns = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === prevMonth && d.getFullYear() === prevYear && t.type === 'expense';
    });

    const currentByCategory = new Map<string, number>();
    for (const t of currentMonthTxns) {
      const cat = t.category || 'uncategorized';
      currentByCategory.set(cat, (currentByCategory.get(cat) || 0) + t.amount);
    }

    const prevByCategory = new Map<string, number>();
    for (const t of prevMonthTxns) {
      const cat = t.category || 'uncategorized';
      prevByCategory.set(cat, (prevByCategory.get(cat) || 0) + t.amount);
    }

    for (const [category, currentAmount] of currentByCategory) {
      const prevAmount = prevByCategory.get(category) || 0;
      if (prevAmount === 0) continue;

      const deviationPct = ((currentAmount - prevAmount) / prevAmount) * 100;
      if (deviationPct > 50) {
        let severity: 'low' | 'medium' | 'high' | 'critical';
        if (deviationPct > 200) severity = 'critical';
        else if (deviationPct > 120) severity = 'high';
        else if (deviationPct > 80) severity = 'medium';
        else severity = 'low';

        results.push({
          type: 'spending_spike',
          category,
          description: `${category} spending increased ${Math.round(deviationPct)}% this month`,
          severity,
          actualValue: currentAmount,
          expectedValue: prevAmount,
          deviationPct: Math.round(deviationPct),
        });
      }
    }

    return results;
  }

  detectLargeTransactions(transactions: AnomTransactionData[]): AnomalyResult[] {
    const results: AnomalyResult[] = [];
    const expenses = transactions.filter(t => t.type === 'expense');

    const categoryTotals = new Map<string, { sum: number; count: number }>();
    for (const t of expenses) {
      const cat = t.category || 'uncategorized';
      const entry = categoryTotals.get(cat) || { sum: 0, count: 0 };
      entry.sum += t.amount;
      entry.count++;
      categoryTotals.set(cat, entry);
    }

    const categoryAvg = new Map<string, number>();
    for (const [cat, { sum, count }] of categoryTotals) {
      categoryAvg.set(cat, sum / count);
    }

    for (const t of expenses) {
      const cat = t.category || 'uncategorized';
      const avg = categoryAvg.get(cat) || 0;
      if (avg === 0) continue;

      const ratio = t.amount / avg;
      if (ratio > 2) {
        let severity: 'low' | 'medium' | 'high' | 'critical';
        if (ratio > 10) severity = 'critical';
        else if (ratio > 5) severity = 'high';
        else if (ratio > 3) severity = 'medium';
        else severity = 'low';

        results.push({
          type: 'large_transaction',
          category: cat,
          description: `${t.description || 'Transaction'} of ${t.amount} is ${Math.round(ratio)}x the average for ${cat}`,
          severity,
          actualValue: t.amount,
          expectedValue: Math.round(avg),
          deviationPct: Math.round((ratio - 1) * 100),
          transactionId: t.id,
        });
      }
    }

    return results;
  }

  detectIncomeDrop(transactions: AnomTransactionData[]): AnomalyResult[] {
    const results: AnomalyResult[] = [];

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const currentIncome = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear && t.type === 'income';
    }).reduce((sum, t) => sum + t.amount, 0);

    let totalPrevIncome = 0;
    let monthsCount = 0;

    for (let i = 1; i <= 3; i++) {
      let m = currentMonth - i;
      let y = currentYear;
      while (m < 0) {
        m += 12;
        y--;
      }

      const monthIncome = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === m && d.getFullYear() === y && t.type === 'income';
      }).reduce((sum, t) => sum + t.amount, 0);

      if (monthIncome > 0) {
        totalPrevIncome += monthIncome;
        monthsCount++;
      }
    }

    if (monthsCount === 0) return results;

    const avgPrevIncome = totalPrevIncome / monthsCount;
    if (avgPrevIncome === 0) return results;

    const deviationPct = ((currentIncome - avgPrevIncome) / avgPrevIncome) * 100;

    if (deviationPct < -30) {
      let severity: 'low' | 'medium' | 'high' | 'critical';
      if (deviationPct < -50) severity = 'high';
      else if (deviationPct < -40) severity = 'medium';
      else severity = 'low';

      results.push({
        type: 'income_drop',
        description: `Income dropped by ${Math.round(Math.abs(deviationPct))}% compared to average of last ${monthsCount} months`,
        severity,
        actualValue: currentIncome,
        expectedValue: Math.round(avgPrevIncome),
        deviationPct: Math.round(deviationPct),
      });
    }

    return results;
  }

  detectAll(transactions: AnomTransactionData[]): AnomalyResult[] {
    const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

    const results = [
      ...this.detectCategorySpikes(transactions),
      ...this.detectLargeTransactions(transactions),
      ...this.detectIncomeDrop(transactions),
    ];

    return results.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }
}

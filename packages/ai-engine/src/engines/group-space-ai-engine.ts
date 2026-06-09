interface GroupExpenseData {
  id: string;
  amount: number;
  description: string;
  category?: string;
  date: Date;
  paidBy: string;
  paidByName: string;
}

interface GroupMemberData {
  id: string;
  name: string;
}

interface TripGroupData {
  id: string;
  name: string;
  totalBudget: number;
  startDate: Date;
  endDate: Date;
  expenses: GroupExpenseData[];
  members: GroupMemberData[];
}

interface RoommateGroupData {
  id: string;
  name: string;
  expenses: GroupExpenseData[];
  members: GroupMemberData[];
  settlements: { from: string; to: string; amount: number; date: Date; status: string }[];
}

interface TripAIOutput {
  budgetBurnRate: number;
  predictedOverspend: number;
  dailyAverage: number;
  daysRemaining: number;
  projectedTotal: number;
  expenseDistributionFairness: number;
  insights: string[];
}

interface RoommateAIOutput {
  contributionFairness: number;
  settlementDelays: { memberId: string; memberName: string; avgDelayDays: number }[];
  fairnessScore: number;
  insights: string[];
}

interface FamilyGroupAIOutput {
  sharedBillOptimization: { billId: string; billName: string; suggestion: string; savings: number }[];
  savingsOpportunities: string[];
}

export class GroupSpaceAiEngine {
  analyzeTrip(trip: TripGroupData): TripAIOutput {
    const now = new Date();
    const totalSpent = trip.expenses.reduce((s, e) => s + e.amount, 0);
    const totalDays = Math.max(1, Math.round((trip.endDate.getTime() - trip.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const daysElapsed = Math.max(1, Math.round((now.getTime() - trip.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const daysRemaining = Math.max(0, Math.round((trip.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    const budgetBurnRate = trip.totalBudget > 0 ? Math.round((totalSpent / trip.totalBudget) * 100) : 0;
    const dailyAverage = totalSpent / daysElapsed;
    const projectedTotal = Math.round(dailyAverage * (daysElapsed + daysRemaining));
    const predictedOverspend = Math.max(0, projectedTotal - trip.totalBudget);

    const memberTotals = new Map<string, number>();
    for (const expense of trip.expenses) {
      memberTotals.set(expense.paidBy, (memberTotals.get(expense.paidBy) || 0) + expense.amount);
    }

    const totals = [...memberTotals.values()];
    const expenseDistributionFairness = this.calculateFairness(totals);

    const insights: string[] = [];

    if (budgetBurnRate > 0) {
      insights.push(
        `Budget utilization: ${budgetBurnRate}% with ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining.`
      );
    }

    if (predictedOverspend > 0) {
      insights.push(
        `Daily spend is ₹${Math.round(dailyAverage).toLocaleString()}. You might overshoot by ₹${predictedOverspend.toLocaleString()}.`
      );
    } else {
      insights.push(
        `You're on track to stay within budget with a projected ₹${(Math.max(0, trip.totalBudget - projectedTotal)).toLocaleString()} to spare.`
      );
    }

    if (totals.length > 0) {
      const maxContributor = [...memberTotals.entries()].sort((a, b) => b[1] - a[1])[0];
      const minContributor = [...memberTotals.entries()].sort((a, b) => a[1] - b[1])[0];
      const maxName = trip.members.find(m => m.id === maxContributor[0])?.name || maxContributor[0];
      const minName = trip.members.find(m => m.id === minContributor[0])?.name || minContributor[0];
      if (maxName !== minName) {
        insights.push(
          `${maxName} has paid the most (₹${Math.round(maxContributor[1]).toLocaleString()}) while ${minName} has paid the least (₹${Math.round(minContributor[1]).toLocaleString()}).`
        );
      }
    }

    const topCategory = this.getTopCategory(trip.expenses);
    if (topCategory) {
      insights.push(`Most spending is on ${topCategory.name} (₹${Math.round(topCategory.amount).toLocaleString()}).`);
    }

    return {
      budgetBurnRate,
      predictedOverspend,
      dailyAverage: Math.round(dailyAverage),
      daysRemaining,
      projectedTotal,
      expenseDistributionFairness,
      insights,
    };
  }

  analyzeRoommates(group: RoommateGroupData): RoommateAIOutput {
    const memberTotals = new Map<string, number>();
    for (const expense of group.expenses) {
      memberTotals.set(expense.paidBy, (memberTotals.get(expense.paidBy) || 0) + expense.amount);
    }

    const totals = [...memberTotals.values()];
    const contributionFairness = this.calculateFairness(totals);

    const settlementDelays = group.members.map(member => {
      const memberSettlements = group.settlements.filter(
        s => s.from === member.id && s.status === 'completed'
      );
      if (memberSettlements.length === 0) {
        return { memberId: member.id, memberName: member.name, avgDelayDays: 0 };
      }
      const totalDelay = memberSettlements.reduce((sum, s) => {
        const delay = s.date.getTime() - s.date.getTime();
        return sum + Math.max(0, delay);
      }, 0);
      return {
        memberId: member.id,
        memberName: member.name,
        avgDelayDays: Math.round(totalDelay / memberSettlements.length / (1000 * 60 * 60 * 24)),
      };
    });

    const pendingCount = group.settlements.filter(s => s.status !== 'completed').length;
    const settlementRatio = group.settlements.length > 0
      ? (group.settlements.filter(s => s.status === 'completed').length / group.settlements.length)
      : 1;
    const fairnessScore = Math.round((contributionFairness + (settlementRatio * 100)) / 2);

    const insights: string[] = [];
    if (totals.length > 0) {
      const sorted = [...memberTotals.entries()].sort((a, b) => b[1] - a[1]);
      const most = sorted[0];
      const least = sorted[sorted.length - 1];
      const mostName = group.members.find(m => m.id === most[0])?.name || most[0];
      const leastName = group.members.find(m => m.id === least[0])?.name || least[0];

      if (most[0] !== least[0]) {
        insights.push(
          `${mostName} has contributed the most (₹${Math.round(most[1]).toLocaleString()}).`
        );
        insights.push(
          `${leastName} has contributed the least (₹${Math.round(least[1]).toLocaleString()}).`
        );
      }
    }

    const slowPayers = settlementDelays.filter(d => d.avgDelayDays > 3);
    for (const sp of slowPayers) {
      insights.push(
        `${sp.memberName} takes ~${sp.avgDelayDays} days on average to settle.`
      );
    }

    if (pendingCount > 0) {
      insights.push(`${pendingCount} settlement${pendingCount > 1 ? 's' : ''} still pending. Time to settle up!`);
    }

    return {
      contributionFairness,
      settlementDelays,
      fairnessScore,
      insights,
    };
  }

  analyzeFamilyGroup(
    expenses: GroupExpenseData[],
    bills: { id: string; name: string; amount: number; category?: string; paidBy: string }[]
  ): FamilyGroupAIOutput {
    const sharedBillOptimization: { billId: string; billName: string; suggestion: string; savings: number }[] = [];
    const savingsOpportunities: string[] = [];

    if (bills.length <= 1) {
      savingsOpportunities.push('Track shared bills to identify optimization opportunities.');
      return { sharedBillOptimization, savingsOpportunities };
    }

    const payerTotals = new Map<string, { name: string; count: number; total: number }>();
    for (const bill of bills) {
      const existing = payerTotals.get(bill.paidBy) || { name: bill.paidBy, count: 0, total: 0 };
      existing.count++;
      existing.total += bill.amount;
      payerTotals.set(bill.paidBy, existing);
    }

    if (payerTotals.size >= 2) {
      const sortedPayers = [...payerTotals.entries()].sort((a, b) => b[1].total - a[1].total);
      const highestPayer = sortedPayers[0];
      const lowestPayer = sortedPayers[sortedPayers.length - 1];
      const avgPerPerson = bills.reduce((s, b) => s + b.amount, 0) / payerTotals.size;

      if (highestPayer[1].total > avgPerPerson * 1.3) {
        const potentialSavings = Math.round(highestPayer[1].total - avgPerPerson);
        savingsOpportunities.push(
          `Consider redistributing bills — ${highestPayer[1].name} pays ₹${(highestPayer[1].total).toLocaleString()} while others pay ₹${(lowestPayer[1].total).toLocaleString()}. Splitting could save ₹${potentialSavings.toLocaleString()}.`
        );
      }
    }

    for (const bill of bills) {
      const category = bill.category?.toLowerCase() || '';
      if (category === 'utilities' || category === 'electricity' || category === 'internet') {
        sharedBillOptimization.push({
          billId: bill.id,
          billName: bill.name,
          suggestion: `Consider assigning ${bill.name} to the highest earner or rotating bill responsibility monthly for fairness.`,
          savings: Math.round(bill.amount * 0.1),
        });
      }
      if (category === 'subscription' || category === 'entertainment') {
        sharedBillOptimization.push({
          billId: bill.id,
          billName: bill.name,
          suggestion: `Family sharing ${bill.name} — ensure everyone contributes equally to avoid one person bearing the full cost.`,
          savings: Math.round(bill.amount * (1 - 1 / Math.max(2, payerTotals.size))),
        });
      }
    }

    const categoryTotals = new Map<string, number>();
    for (const expense of expenses) {
      const cat = expense.category || 'other';
      categoryTotals.set(cat, (categoryTotals.get(cat) || 0) + expense.amount);
    }

    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    if (totalExpenses > 0) {
      const sortedCats = [...categoryTotals.entries()].sort((a, b) => b[1] - a[1]);
      const top3 = sortedCats.slice(0, 3);
      if (top3.length > 0) {
        savingsOpportunities.push(
          `Top expense categories: ${top3.map(([c, a]) => `${c} (₹${Math.round(a).toLocaleString()})`).join(', ')}. Reviewing these could reveal savings.`
        );
      }
    }

    return { sharedBillOptimization, savingsOpportunities };
  }

  private calculateFairness(values: number[]): number {
    if (values.length <= 1) return 100;
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    if (mean === 0) return 100;
    const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / mean;
    return Math.max(0, Math.min(100, Math.round((1 - cv) * 100)));
  }

  private getTopCategory(expenses: GroupExpenseData[]): { name: string; amount: number } | null {
    const catTotals = new Map<string, number>();
    for (const e of expenses) {
      const cat = e.category || 'uncategorized';
      catTotals.set(cat, (catTotals.get(cat) || 0) + e.amount);
    }
    const sorted = [...catTotals.entries()].sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? { name: sorted[0][0], amount: sorted[0][1] } : null;
  }
}

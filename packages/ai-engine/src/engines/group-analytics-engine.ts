import {
  ExpenseData,
  SettlementData,
  MemberData,
  GroupPersonality,
  Badge,
  MemberBadge,
  TrustScore,
} from '../types';
import { InsightEngine } from './insight-engine';
import { FinancialHealthEngine } from './financial-health-engine';

export class GroupAnalyticsEngine {
  private insightEngine = new InsightEngine();
  private healthEngine = new FinancialHealthEngine();

  generateGroupPersonality(
    groupId: string,
    groupName: string,
    type: string,
    expenses: ExpenseData[],
    settlements: SettlementData[],
    members: MemberData[]
  ): GroupPersonality {
    const transactions = expenses.map(e => ({
      id: e.id, amount: e.amount, description: e.description,
      category: e.category, date: e.date, paidBy: e.paidBy,
      paidByName: e.paidByName, splitType: e.splits?.[0]?.amount ? 'exact' : 'equal',
    }));

    const memberTotals = this.aggregateByMember(transactions);
    const sorted = [...memberTotals.entries()].sort((a, b) => b[1].total - a[1].total);

    const findName = (id: string) => members.find(m => m.id === id)?.name || 'Unknown';

    const topSpender = sorted.length > 0
      ? { name: findName(sorted[0][0]), amount: sorted[0][1].total }
      : { name: 'No one', amount: 0 };

    const payerFreq = new Map<string, number>();
    for (const s of settlements) {
      payerFreq.set(s.from, (payerFreq.get(s.from) || 0) + 1);
    }
    const fastestPayer = [...payerFreq.entries()].sort((a, b) => b[1] - a[1])[0];
    const fastestPayerObj = fastestPayer
      ? { name: findName(fastestPayer[0]), avgSettlementDays: 1 }
      : { name: 'N/A', avgSettlementDays: 0 };

    const expenseCount = new Map<string, number>();
    for (const e of expenses) {
      expenseCount.set(e.paidBy, (expenseCount.get(e.paidBy) || 0) + 1);
    }
    const mostActive = [...expenseCount.entries()].sort((a, b) => b[1] - a[1])[0];
    const mostActiveObj = mostActive
      ? { name: findName(mostActive[0]), expenseCount: mostActive[1] }
      : { name: 'No one', expenseCount: 0 };

    const generosities = this.calculateGenerosity(expenses, members);
    const mostGenerous = generosities.length > 0 ? generosities[0] : { name: 'No one', timesPaid: 0, totalAmount: 0 };

    const badges = this.insightEngine.generateBadges(transactions, members);

    const fuelExpenses = expenses.filter(e =>
      e.category?.toLowerCase().includes('fuel') || e.description?.toLowerCase().includes('petrol')
    );
    const fuelTotals = this.aggregateByMember(
      fuelExpenses.map(e => ({
        id: e.id, amount: e.amount, description: e.description,
        category: e.category, date: e.date, paidBy: e.paidBy,
        paidByName: e.paidByName,
      }))
    );
    const fuelKing = [...fuelTotals.entries()].sort((a, b) => b[1].total - a[1].total)[0];

    const foodExpenses = expenses.filter(e =>
      e.category?.toLowerCase().includes('food') || e.description?.toLowerCase().includes('food') || e.description?.toLowerCase().includes('pizza')
    );
    const foodTotals = this.aggregateByMember(
      foodExpenses.map(e => ({
        id: e.id, amount: e.amount, description: e.description,
        category: e.category, date: e.date, paidBy: e.paidBy,
        paidByName: e.paidByName,
      }))
    );
    const foodLover = [...foodTotals.entries()].sort((a, b) => b[1].total - a[1].total)[0];

    const result: GroupPersonality = {
      groupId, groupName, type,
      topSpender, fastestPayer: fastestPayerObj,
      mostGenerous, mostActive: mostActiveObj,
      badges,
    };

    if (fuelKing) result.fuelKing = { name: findName(fuelKing[0]), amount: fuelKing[1].total };
    if (foodLover) result.foodLover = { name: findName(foodLover[0]), amount: foodLover[1].total };

    return result;
  }

  calculateTrustScores(
    expenses: ExpenseData[],
    settlements: SettlementData[],
    members: MemberData[]
  ): TrustScore[] {
    return members.map(m => {
      const memberSettlements = settlements.filter(s => s.from === m.id || s.to === m.id);
      const memberExpenses = expenses.filter(e => e.paidBy === m.id);
      return this.healthEngine.calculateTrustScore(
        m.id, m.name, memberSettlements,
        memberExpenses.map(e => ({
          id: e.id, amount: e.amount, description: e.description,
          category: e.category, date: e.date, paidBy: e.paidBy,
          paidByName: e.paidByName,
        }))
      );
    });
  }

  calculateGroupBalance(expenses: ExpenseData[], settlements: SettlementData[]): Map<string, number> {
    const balances = new Map<string, number>();

    for (const expense of expenses) {
      for (const split of expense.splits) {
        if (split.memberId === expense.paidBy) continue;
        balances.set(split.memberId, (balances.get(split.memberId) || 0) - split.amount);
        balances.set(expense.paidBy, (balances.get(expense.paidBy) || 0) + split.amount);
      }
    }

    for (const settlement of settlements) {
      if (settlement.status === 'completed') {
        balances.set(settlement.from, (balances.get(settlement.from) || 0) + settlement.amount);
        balances.set(settlement.to, (balances.get(settlement.to) || 0) - settlement.amount);
      }
    }

    return balances;
  }

  private aggregateByMember(
    transactions: { paidBy: string; amount: number }[]
  ): Map<string, { total: number; count: number }> {
    const map = new Map<string, { total: number; count: number }>();
    for (const t of transactions) {
      const existing = map.get(t.paidBy) || { total: 0, count: 0 };
      existing.total += t.amount;
      existing.count++;
      map.set(t.paidBy, existing);
    }
    return map;
  }

  private calculateGenerosity(
    expenses: ExpenseData[],
    members: MemberData[]
  ): { name: string; timesPaid: number; totalAmount: number }[] {
    const result: { name: string; timesPaid: number; totalAmount: number }[] = [];

    for (const member of members) {
      const memberExpenses = expenses.filter(e => e.paidBy === member.id);
      if (memberExpenses.length > 0) {
        result.push({
          name: member.name,
          timesPaid: memberExpenses.length,
          totalAmount: memberExpenses.reduce((s, e) => s + e.amount, 0),
        });
      }
    }

    return result.sort((a, b) => b.timesPaid - a.timesPaid);
  }
}

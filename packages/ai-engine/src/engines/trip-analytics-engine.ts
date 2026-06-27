import { ExpenseData, MemberData, TripStory, MemoryEntry } from '../types';
import { InsightEngine } from './insight-engine';

export class TripAnalyticsEngine {
  private insightEngine = new InsightEngine();

  async generateTripStory(
    tripId: string,
    tripName: string,
    expenses: ExpenseData[],
    members: MemberData[],
    startDate: Date,
    endDate: Date,
  ): Promise<TripStory> {
    const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
    const totalDays = Math.max(
      1,
      Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1,
    );

    const categoryTotals = new Map<string, number>();
    for (const e of expenses) {
      const cat = e.category || 'Other';
      categoryTotals.set(cat, (categoryTotals.get(cat) || 0) + e.amount);
    }

    const categoryBreakdown = [...categoryTotals.entries()]
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const memberTotals = new Map<string, number>();
    for (const e of expenses) {
      memberTotals.set(e.paidBy, (memberTotals.get(e.paidBy) || 0) + e.amount);
    }
    const topSpenderMember = [...memberTotals.entries()].sort((a, b) => b[1] - a[1])[0];
    const topSpender = {
      name: topSpenderMember
        ? members.find((m) => m.id === topSpenderMember[0])?.name || 'Unknown'
        : 'No one',
      amount: topSpenderMember ? topSpenderMember[1] : 0,
    };

    const transactions = expenses.map((e) => ({
      id: e.id,
      amount: e.amount,
      description: e.description,
      category: e.category,
      date: e.date,
      paidBy: e.paidBy,
      paidByName: e.paidByName,
    }));
    const funFacts = await this.insightEngine.generateFunFacts(transactions, members);

    const dayExpenses = new Map<number, ExpenseData[]>();
    for (const e of expenses) {
      const dayIndex =
        Math.round((e.date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      if (dayIndex >= 1 && dayIndex <= totalDays) {
        const existing = dayExpenses.get(dayIndex) || [];
        existing.push(e);
        dayExpenses.set(dayIndex, existing);
      }
    }

    const timeline = [...dayExpenses.entries()]
      .map(([day, dayExp]) => ({
        day,
        summary: `${dayExp.length} expenses totaling ₹${dayExp.reduce((s, e) => s + e.amount, 0).toLocaleString()}`,
        expenseCount: dayExp.length,
      }))
      .sort((a, b) => a.day - b.day);

    const highlights: string[] = [];
    const maxDay = [...dayExpenses.entries()].sort((a, b) => {
      const totalA = a[1].reduce((s, e) => s + e.amount, 0);
      const totalB = b[1].reduce((s, e) => s + e.amount, 0);
      return totalB - totalA;
    })[0];
    if (maxDay) {
      highlights.push(
        `Day ${maxDay[0]} was the most expensive — ₹${maxDay[1].reduce((s, e) => s + e.amount, 0).toLocaleString()}`,
      );
    }

    if (funFacts.length > 0) {
      highlights.push(funFacts[0]);
    }

    const foodTotal = expenses
      .filter((e) => e.category?.toLowerCase().includes('food'))
      .reduce((s, e) => s + e.amount, 0);

    const fuelTotal = expenses
      .filter(
        (e) =>
          e.category?.toLowerCase().includes('fuel') ||
          e.description?.toLowerCase().includes('petrol'),
      )
      .reduce((s, e) => s + e.amount, 0);

    const accommodations = expenses
      .filter(
        (e) =>
          e.category?.toLowerCase().includes('hotel') ||
          e.category?.toLowerCase().includes('stay') ||
          e.description?.toLowerCase().includes('airbnb'),
      )
      .reduce((s, e) => s + e.amount, 0);

    return {
      tripId,
      tripName,
      totalSpent,
      totalDays,
      categoryBreakdown,
      topSpender,
      funFact: funFacts[0] || 'A great trip!',
      timeline,
      highlights,
      foodTotal,
      fuelTotal,
      accommodations,
    };
  }

  async generateMemories(
    expenses: ExpenseData[],
    members: MemberData[],
    tripName: string,
    startDate: Date,
    endDate: Date,
  ): Promise<MemoryEntry[]> {
    const memories: MemoryEntry[] = [];

    memories.push({
      id: `trip_${tripName}`,
      type: 'trip',
      title: `${tripName} Trip`,
      description: `${members.length} friends, ${expenses.length} expenses`,
      date: startDate,
      amount: expenses.reduce((s, e) => s + e.amount, 0),
      members: members.map((m) => m.name),
      emoji: '✈️',
    });

    const largestExpense = expenses.sort((a, b) => b.amount - a.amount)[0];
    if (largestExpense) {
      const payer = members.find((m) => m.id === largestExpense.paidBy)?.name || 'Someone';
      memories.push({
        id: `expense_${largestExpense.id}`,
        type: 'expense',
        title: largestExpense.description || 'Biggest expense',
        description: `${payer} paid ₹${largestExpense.amount.toLocaleString()}`,
        date: largestExpense.date,
        amount: largestExpense.amount,
        members: [payer],
        emoji: '💸',
      });
    }

    if (expenses.length >= 10) {
      memories.push({
        id: `milestone_${tripName}_10`,
        type: 'milestone',
        title: '10+ expenses!',
        description: 'An eventful trip with lots of shared moments',
        date: endDate,
        members: members.map((m) => m.name),
        emoji: '🎉',
      });
    }

    return memories;
  }

  async generateTripSummaryFacts(
    expenses: ExpenseData[],
    members: MemberData[],
  ): Promise<string[]> {
    const facts: string[] = [];
    const transactions = expenses.map((e) => ({
      id: e.id,
      amount: e.amount,
      description: e.description,
      category: e.category,
      date: e.date,
      paidBy: e.paidBy,
      paidByName: e.paidByName,
    }));

    const funFacts = await this.insightEngine.generateFunFacts(transactions, members);
    const humor = await this.insightEngine.generateHumorInsights(transactions, members);

    facts.push(...funFacts.slice(0, 3));
    facts.push(...humor.slice(0, 2));

    return facts;
  }
}

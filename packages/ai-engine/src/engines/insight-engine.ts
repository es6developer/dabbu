import { MemberData, TransactionData, Badge, MemberBadge, BadgeCategory } from '../types';

export class InsightEngine {
  generateSpendingInsights(transactions: TransactionData[], members: MemberData[]): string[] {
    const insights: string[] = [];
    const memberTotals = this.aggregateByMember(transactions);
    const categoryTotals = this.aggregateByCategory(transactions);

    const sorted = [...memberTotals.entries()].sort((a, b) => b[1].total - a[1].total);
    if (sorted.length > 0) {
      const top = sorted[0];
      const member = members.find(m => m.id === top[0]);
      insights.push(`${member?.name || 'Someone'} spent the most — ₹${top[1].total.toLocaleString()}`);
    }

    if (categoryTotals.size > 0) {
      const topCat = [...categoryTotals.entries()].sort((a, b) => b[1] - a[1])[0];
      insights.push(`Most spending was on ${topCat[0]} — ₹${topCat[1].toLocaleString()}`);
    }

    const avgPerPerson = Math.round(
      transactions.reduce((s, t) => s + t.amount, 0) / Math.max(members.length, 1)
    );
    insights.push(`Average spend per person: ₹${avgPerPerson.toLocaleString()}`);

    return insights;
  }

  generateFunFacts(transactions: TransactionData[], members: MemberData[]): string[] {
    const facts: string[] = [];
    const memberTotals = this.aggregateByMember(transactions);

    const sorted = [...memberTotals.entries()].sort((a, b) => b[1].total - a[1].total);
    if (sorted.length > 1) {
      const top = sorted[0];
      const memberName = members.find(m => m.id === top[0])?.name || 'Someone';
      facts.push(`${memberName} carried the team — paid ${top[1].count} times totaling ₹${top[1].total.toLocaleString()}`);
    }

    const foodTransactions = transactions.filter(
      t => t.category?.toLowerCase().includes('food') || t.description?.toLowerCase().includes('food')
    );
    if (foodTransactions.length > 0) {
      const foodTotal = foodTransactions.reduce((s, t) => s + t.amount, 0);
      const foodie = this.findTopInCategory(transactions, members, 'food');
      if (foodie) facts.push(`🍕 ${foodie.name} is the official Foodie — ₹${foodie.amount.toLocaleString()} on food`);
    }

    const fuelTransactions = transactions.filter(
      t => t.category?.toLowerCase().includes('fuel') || t.description?.toLowerCase().includes('petrol') || t.description?.toLowerCase().includes('diesel')
    );
    if (fuelTransactions.length > 0) {
      const fuelTotal = fuelTransactions.reduce((s, t) => s + t.amount, 0);
      const fuelKing = this.findTopInCategory(transactions, members, 'fuel');
      if (fuelKing) facts.push(`⛽ ${fuelKing.name} is the Fuel King — ₹${fuelKing.amount.toLocaleString()} on fuel`);
    }

    const coffeeTransactions = transactions.filter(
      t => t.description?.toLowerCase().includes('coffee') || t.description?.toLowerCase().includes('tea')
    );
    if (coffeeTransactions.length >= 3) {
      const totalCups = coffeeTransactions.length;
      facts.push(`☕ ${totalCups} coffee runs! Someone was caffeinated.`);
    }

    return facts;
  }

  generateBadges(transactions: TransactionData[], members: MemberData[]): MemberBadge[] {
    const badges: MemberBadge[] = [];
    const memberTotals = this.aggregateByMember(transactions);

    for (const [memberId, data] of memberTotals) {
      const member = members.find(m => m.id === memberId);
      if (!member) continue;

      if (data.total > 0) {
        const sorted = [...memberTotals.entries()].sort((a, b) => b[1].total - a[1].total);
        if (sorted[0][0] === memberId) {
          badges.push({
            memberId, memberName: member.name,
            badge: { id: 'top_spender', name: 'Top Spender', emoji: '👑', description: 'Highest total spending', category: 'spending', rarity: 'epic' },
            earnedAt: new Date(),
          });
        }
      }

      if (data.count >= 5) {
        badges.push({
          memberId, memberName: member.name,
          badge: { id: 'frequent_payer', name: 'Frequent Payer', emoji: '💳', description: 'Paid 5+ times', category: 'contribution', rarity: 'common' },
          earnedAt: new Date(),
        });
      }

      if (data.count >= 15) {
        badges.push({
          memberId, memberName: member.name,
          badge: { id: 'payment_machine', name: 'Payment Machine', emoji: '🏧', description: 'Paid 15+ times', category: 'contribution', rarity: 'rare' },
          earnedAt: new Date(),
        });
      }
    }

    const foodTotals = this.aggregateByCategoryForMember(transactions, 'food');
    for (const [memberId, amount] of foodTotals) {
      const member = members.find(m => m.id === memberId);
      if (member && amount > 1000) {
        badges.push({
          memberId, memberName: member.name,
          badge: { id: 'foodie', name: 'Foodie', emoji: '🍕', description: `Spent ₹${amount.toLocaleString()} on food`, category: 'spending', rarity: 'common' },
          earnedAt: new Date(),
        });
      }
    }

    const fuelTotals = this.aggregateByCategoryForMember(transactions, 'fuel');
    for (const [memberId, amount] of fuelTotals) {
      const member = members.find(m => m.id === memberId);
      if (member && amount > 2000) {
        badges.push({
          memberId, memberName: member.name,
          badge: { id: 'fuel_king', name: 'Fuel King', emoji: '⛽', description: `Spent ₹${amount.toLocaleString()} on fuel`, category: 'spending', rarity: 'rare' },
          earnedAt: new Date(),
        });
      }
    }

    return badges;
  }

  generateHumorInsights(transactions: TransactionData[], members: MemberData[]): string[] {
    const humor: string[] = [];
    const memberTotals = this.aggregateByMember(transactions);

    const sorted = [...memberTotals.entries()].sort((a, b) => b[1].total - a[1].total);
    if (sorted.length > 1) {
      const lowest = sorted[sorted.length - 1];
      const member = members.find(m => m.id === lowest[0]);
      if (member) humor.push(`${member.name} somehow spent the least. Suspicious. 🤔`);
    }

    const foodTrans = transactions.filter(t => t.description?.toLowerCase().includes('food') || t.description?.toLowerCase().includes('pizza') || t.description?.toLowerCase().includes('burger'));
    if (foodTrans.length > 3) {
      humor.push(`🍔 Food expenses: ${foodTrans.length} transactions. No regrets.`);
    }

    const midnightTrans = transactions.filter(t => {
      const hour = t.date.getHours();
      return hour >= 22 || hour < 5;
    });
    if (midnightTrans.length > 0) {
      const nightOwl = this.findMostFrequent(midnightTrans, members);
      if (nightOwl) humor.push(`🌙 ${nightOwl.name} spends at midnight. Impulse king.`);
    }

    return humor;
  }

  private aggregateByMember(transactions: TransactionData[]): Map<string, { total: number; count: number }> {
    const map = new Map<string, { total: number; count: number }>();
    for (const t of transactions) {
      const existing = map.get(t.paidBy) || { total: 0, count: 0 };
      existing.total += t.amount;
      existing.count++;
      map.set(t.paidBy, existing);
    }
    return map;
  }

  private aggregateByCategory(transactions: TransactionData[]): Map<string, number> {
    const map = new Map<string, number>();
    for (const t of transactions) {
      const cat = t.category || 'Other';
      map.set(cat, (map.get(cat) || 0) + t.amount);
    }
    return map;
  }

  private findTopInCategory(transactions: TransactionData[], members: MemberData[], category: string): { name: string; amount: number } | null {
    const memberTotals = this.aggregateByCategoryForMember(transactions, category);
    if (memberTotals.size === 0) return null;
    const top = [...memberTotals.entries()].sort((a, b) => b[1] - a[1])[0];
    const member = members.find(m => m.id === top[0]);
    return member ? { name: member.name, amount: top[1] } : null;
  }

  private aggregateByCategoryForMember(transactions: TransactionData[], category: string): Map<string, number> {
    const map = new Map<string, number>();
    const filtered = transactions.filter(
      t => t.category?.toLowerCase().includes(category) || t.description?.toLowerCase().includes(category)
    );
    for (const t of filtered) {
      map.set(t.paidBy, (map.get(t.paidBy) || 0) + t.amount);
    }
    return map;
  }

  private findMostFrequent(transactions: TransactionData[], members: MemberData[]): { name: string } | null {
    const counts = new Map<string, number>();
    for (const t of transactions) {
      counts.set(t.paidBy, (counts.get(t.paidBy) || 0) + 1);
    }
    if (counts.size === 0) return null;
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    const member = members.find(m => m.id === top[0]);
    return member ? { name: member.name } : null;
  }
}

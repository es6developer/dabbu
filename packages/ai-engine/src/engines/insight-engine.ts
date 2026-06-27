import { MemberData, TransactionData, Badge, MemberBadge, BadgeCategory } from '../types';
import { LlmClient } from '../llm-client';

export class InsightEngine {
  private llm: LlmClient | null;

  constructor(llm?: LlmClient) {
    this.llm = llm || null;
  }

  async generateSpendingInsights(
    transactions: TransactionData[],
    members: MemberData[],
  ): Promise<string[]> {
    if (this.llm) {
      try {
        const memberTotals = this.aggregateByMember(transactions);
        const categoryTotals = this.aggregateByCategory(transactions);
        const totalSpent = transactions.reduce((s, t) => s + t.amount, 0);

        const prompt = `You are a group spending analyst for Indian friends/family. Generate 3-4 spending insights.
Members: ${members
          .map((m) => {
            const data = memberTotals.get(m.id);
            return `${m.name}: ₹${(data?.total || 0).toLocaleString()} (${data?.count || 0} txns)`;
          })
          .join(', ')}
Total Spent: ₹${totalSpent.toLocaleString()}
Top Categories: ${[...categoryTotals.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([cat, amt]) => `${cat} ₹${amt.toLocaleString()}`)
          .join(', ')}

Return ONLY a JSON array of 3-4 short insight strings. Be specific with ₹ amounts and names.`;

        const result = await this.llm.generateJson<string[]>(prompt, { temperature: 0.5 });
        if (result && result.length >= 2) {
          return result.slice(0, 4);
        }
      } catch {
        /* fall through */
      }
    }
    return this.getFallbackSpendingInsights(transactions, members);
  }

  private getFallbackSpendingInsights(
    transactions: TransactionData[],
    members: MemberData[],
  ): string[] {
    const insights: string[] = [];
    const memberTotals = this.aggregateByMember(transactions);
    const categoryTotals = this.aggregateByCategory(transactions);
    const sorted = [...memberTotals.entries()].sort((a, b) => b[1].total - a[1].total);
    if (sorted.length > 0) {
      const top = sorted[0];
      const member = members.find((m) => m.id === top[0]);
      insights.push(
        `${member?.name || 'Someone'} spent the most — ₹${top[1].total.toLocaleString()}`,
      );
    }
    if (categoryTotals.size > 0) {
      const topCat = [...categoryTotals.entries()].sort((a, b) => b[1] - a[1])[0];
      insights.push(`Most spending was on ${topCat[0]} — ₹${topCat[1].toLocaleString()}`);
    }
    const avgPerPerson = Math.round(
      transactions.reduce((s, t) => s + t.amount, 0) / Math.max(members.length, 1),
    );
    insights.push(`Average spend per person: ₹${avgPerPerson.toLocaleString()}`);
    return insights;
  }

  async generateFunFacts(
    transactions: TransactionData[],
    members: MemberData[],
  ): Promise<string[]> {
    if (this.llm) {
      try {
        const memberTotals = this.aggregateByMember(transactions);
        const totalSpent = transactions.reduce((s, t) => s + t.amount, 0);

        const prompt = `You are a fun spending storyteller for Indian friends/family. Generate 2-3 fun facts.
Members: ${members
          .map((m) => {
            const data = memberTotals.get(m.id);
            return `${m.name}: ₹${(data?.total || 0).toLocaleString()}`;
          })
          .join(', ')}
Total: ₹${totalSpent.toLocaleString()}, Transactions: ${transactions.length}

Return ONLY a JSON array of 2-3 fun fact strings. Use emojis. Be playful.`;

        const result = await this.llm.generateJson<string[]>(prompt, { temperature: 0.7 });
        if (result && result.length >= 1) {
          return result.slice(0, 3);
        }
      } catch {
        /* fall through */
      }
    }
    return this.getFallbackFunFacts(transactions, members);
  }

  private getFallbackFunFacts(transactions: TransactionData[], members: MemberData[]): string[] {
    const facts: string[] = [];
    const memberTotals = this.aggregateByMember(transactions);
    const sorted = [...memberTotals.entries()].sort((a, b) => b[1].total - a[1].total);
    if (sorted.length > 1) {
      const top = sorted[0];
      const memberName = members.find((m) => m.id === top[0])?.name || 'Someone';
      facts.push(
        `${memberName} carried the team — paid ${top[1].count} times totaling ₹${top[1].total.toLocaleString()}`,
      );
    }
    const foodTransactions = transactions.filter(
      (t) =>
        t.category?.toLowerCase().includes('food') || t.description?.toLowerCase().includes('food'),
    );
    if (foodTransactions.length > 0) {
      const foodie = this.findTopInCategory(transactions, members, 'food');
      if (foodie) {
        facts.push(
          `🍕 ${foodie.name} is the official Foodie — ₹${foodie.amount.toLocaleString()} on food`,
        );
      }
    }
    const fuelTransactions = transactions.filter(
      (t) =>
        t.category?.toLowerCase().includes('fuel') ||
        t.description?.toLowerCase().includes('petrol'),
    );
    if (fuelTransactions.length > 0) {
      const fuelKing = this.findTopInCategory(transactions, members, 'fuel');
      if (fuelKing) {
        facts.push(
          `⛽ ${fuelKing.name} is the Fuel King — ₹${fuelKing.amount.toLocaleString()} on fuel`,
        );
      }
    }
    return facts;
  }

  generateBadges(transactions: TransactionData[], members: MemberData[]): MemberBadge[] {
    const badges: MemberBadge[] = [];
    const memberTotals = this.aggregateByMember(transactions);

    for (const [memberId, data] of memberTotals) {
      const member = members.find((m) => m.id === memberId);
      if (!member) {
        continue;
      }

      if (data.total > 0) {
        const sorted = [...memberTotals.entries()].sort((a, b) => b[1].total - a[1].total);
        if (sorted[0][0] === memberId) {
          badges.push({
            memberId,
            memberName: member.name,
            badge: {
              id: 'top_spender',
              name: 'Top Spender',
              emoji: '👑',
              description: 'Highest total spending',
              category: 'spending',
              rarity: 'epic',
            },
            earnedAt: new Date(),
          });
        }
      }

      if (data.count >= 5) {
        badges.push({
          memberId,
          memberName: member.name,
          badge: {
            id: 'frequent_payer',
            name: 'Frequent Payer',
            emoji: '💳',
            description: 'Paid 5+ times',
            category: 'contribution',
            rarity: 'common',
          },
          earnedAt: new Date(),
        });
      }

      if (data.count >= 15) {
        badges.push({
          memberId,
          memberName: member.name,
          badge: {
            id: 'payment_machine',
            name: 'Payment Machine',
            emoji: '🏧',
            description: 'Paid 15+ times',
            category: 'contribution',
            rarity: 'rare',
          },
          earnedAt: new Date(),
        });
      }
    }

    const foodTotals = this.aggregateByCategoryForMember(transactions, 'food');
    for (const [memberId, amount] of foodTotals) {
      const member = members.find((m) => m.id === memberId);
      if (member && amount > 1000) {
        badges.push({
          memberId,
          memberName: member.name,
          badge: {
            id: 'foodie',
            name: 'Foodie',
            emoji: '🍕',
            description: `Spent ₹${amount.toLocaleString()} on food`,
            category: 'spending',
            rarity: 'common',
          },
          earnedAt: new Date(),
        });
      }
    }

    const fuelTotals = this.aggregateByCategoryForMember(transactions, 'fuel');
    for (const [memberId, amount] of fuelTotals) {
      const member = members.find((m) => m.id === memberId);
      if (member && amount > 2000) {
        badges.push({
          memberId,
          memberName: member.name,
          badge: {
            id: 'fuel_king',
            name: 'Fuel King',
            emoji: '⛽',
            description: `Spent ₹${amount.toLocaleString()} on fuel`,
            category: 'spending',
            rarity: 'rare',
          },
          earnedAt: new Date(),
        });
      }
    }

    return badges;
  }

  async generateHumorInsights(
    transactions: TransactionData[],
    members: MemberData[],
  ): Promise<string[]> {
    if (this.llm) {
      try {
        const memberTotals = this.aggregateByMember(transactions);

        const prompt = `You are a witty financial humorist for Indian friends. Generate 2-3 humorous observations.
Members: ${members
          .map((m) => {
            const data = memberTotals.get(m.id);
            return `${m.name}: ₹${(data?.total || 0).toLocaleString()}`;
          })
          .join(', ')}
Transactions: ${transactions.length}

Return ONLY a JSON array of 2-3 humorous strings. Use emojis. Be witty but kind.`;

        const result = await this.llm.generateJson<string[]>(prompt, { temperature: 0.8 });
        if (result && result.length >= 1) {
          return result.slice(0, 3);
        }
      } catch {
        /* fall through */
      }
    }
    return this.getFallbackHumorInsights(transactions, members);
  }

  private getFallbackHumorInsights(
    transactions: TransactionData[],
    members: MemberData[],
  ): string[] {
    const humor: string[] = [];
    const memberTotals = this.aggregateByMember(transactions);
    const sorted = [...memberTotals.entries()].sort((a, b) => b[1].total - a[1].total);
    if (sorted.length > 1) {
      const lowest = sorted[sorted.length - 1];
      const member = members.find((m) => m.id === lowest[0]);
      if (member) {
        humor.push(`${member.name} somehow spent the least. Suspicious. 🤔`);
      }
    }
    const foodTrans = transactions.filter(
      (t) =>
        t.description?.toLowerCase().includes('food') ||
        t.description?.toLowerCase().includes('pizza'),
    );
    if (foodTrans.length > 3) {
      humor.push(`🍔 Food expenses: ${foodTrans.length} transactions. No regrets.`);
    }
    const midnightTrans = transactions.filter((t) => {
      const hour = t.date.getHours();
      return hour >= 22 || hour < 5;
    });
    if (midnightTrans.length > 0) {
      const nightOwl = this.findMostFrequent(midnightTrans, members);
      if (nightOwl) {
        humor.push(`🌙 ${nightOwl.name} spends at midnight. Impulse king.`);
      }
    }
    return humor;
  }

  private aggregateByMember(
    transactions: TransactionData[],
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

  private aggregateByCategory(transactions: TransactionData[]): Map<string, number> {
    const map = new Map<string, number>();
    for (const t of transactions) {
      const cat = t.category || 'Other';
      map.set(cat, (map.get(cat) || 0) + t.amount);
    }
    return map;
  }

  private findTopInCategory(
    transactions: TransactionData[],
    members: MemberData[],
    category: string,
  ): { name: string; amount: number } | null {
    const memberTotals = this.aggregateByCategoryForMember(transactions, category);
    if (memberTotals.size === 0) {
      return null;
    }
    const top = [...memberTotals.entries()].sort((a, b) => b[1] - a[1])[0];
    const member = members.find((m) => m.id === top[0]);
    return member ? { name: member.name, amount: top[1] } : null;
  }

  private aggregateByCategoryForMember(
    transactions: TransactionData[],
    category: string,
  ): Map<string, number> {
    const map = new Map<string, number>();
    const filtered = transactions.filter(
      (t) =>
        t.category?.toLowerCase().includes(category) ||
        t.description?.toLowerCase().includes(category),
    );
    for (const t of filtered) {
      map.set(t.paidBy, (map.get(t.paidBy) || 0) + t.amount);
    }
    return map;
  }

  private findMostFrequent(
    transactions: TransactionData[],
    members: MemberData[],
  ): { name: string } | null {
    const counts = new Map<string, number>();
    for (const t of transactions) {
      counts.set(t.paidBy, (counts.get(t.paidBy) || 0) + 1);
    }
    if (counts.size === 0) {
      return null;
    }
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    const member = members.find((m) => m.id === top[0]);
    return member ? { name: member.name } : null;
  }
}

import { TransactionData, SettlementData, MemberData } from '../types';

export interface BehaviorPattern {
  memberId: string;
  memberName: string;
  pattern: string;
  confidence: number;
  detail: string;
}

export class BehaviorEngine {
  analyzeSpendingPatterns(transactions: TransactionData[], members: MemberData[]): BehaviorPattern[] {
    const patterns: BehaviorPattern[] = [];

    for (const member of members) {
      const memberTxns = transactions.filter(t => t.paidBy === member.id);
      if (memberTxns.length < 3) continue;

      const categories = new Map<string, number>();
      for (const t of memberTxns) {
        const cat = t.category || 'Other';
        categories.set(cat, (categories.get(cat) || 0) + t.amount);
      }

      const topCategory = [...categories.entries()].sort((a, b) => b[1] - a[1])[0];
      if (topCategory && topCategory[1] > memberTxns.reduce((s, t) => s + t.amount, 0) * 0.5) {
        patterns.push({
          memberId: member.id, memberName: member.name,
          pattern: 'category_focused',
          confidence: 0.8,
          detail: `${member.name} spends mostly on ${topCategory[0]} (${Math.round(topCategory[1] / memberTxns.reduce((s, t) => s + t.amount, 0) * 100)}%)`,
        });
      }

      const avgAmount = memberTxns.reduce((s, t) => s + t.amount, 0) / memberTxns.length;
      const largeTxns = memberTxns.filter(t => t.amount > avgAmount * 2);
      if (largeTxns.length >= 2) {
        patterns.push({
          memberId: member.id, memberName: member.name,
          pattern: 'impulse_spender',
          confidence: 0.6,
          detail: `${member.name} has ${largeTxns.length} unusually large transactions`,
        });
      }

      const morningTxns = memberTxns.filter(t => {
        const h = t.date?.getHours?.() ?? 12;
        return h >= 6 && h <= 11;
      });
      if (morningTxns.length > memberTxns.length * 0.5) {
        patterns.push({
          memberId: member.id, memberName: member.name,
          pattern: 'morning_spender',
          confidence: 0.5,
          detail: `${member.name} does most spending in the morning`,
        });
      }

      const weekendTxns = memberTxns.filter(t => {
        const d = t.date?.getDay?.() ?? -1;
        return d === 0 || d === 6;
      });
      if (weekendTxns.length > memberTxns.length * 0.4) {
        patterns.push({
          memberId: member.id, memberName: member.name,
          pattern: 'weekend_spender',
          confidence: 0.5,
          detail: `${member.name} spends mostly on weekends`,
        });
      }
    }

    return patterns;
  }

  analyzeSettlementBehavior(settlements: SettlementData[], members: MemberData[]): BehaviorPattern[] {
    const patterns: BehaviorPattern[] = [];

    for (const member of members) {
      const asPayer = settlements.filter(s => s.from === member.id);
      if (asPayer.length < 2) continue;

      const avgDelay = asPayer.reduce((sum, s) => {
        const delay = (new Date(s.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
        return sum + Math.abs(delay);
      }, 0) / asPayer.length;

      if (avgDelay <= 1) {
        patterns.push({
          memberId: member.id, memberName: member.name,
          pattern: 'fast_settler',
          confidence: 0.9,
          detail: `${member.name} settles within a day on average`,
        });
      } else if (avgDelay > 7) {
        patterns.push({
          memberId: member.id, memberName: member.name,
          pattern: 'slow_settler',
          confidence: 0.7,
          detail: `${member.name} takes ${Math.round(avgDelay)} days to settle on average`,
        });
      }

      const asReceiver = settlements.filter(s => s.to === member.id);
      if (asReceiver.length > 0) {
        const totalReceived = asReceiver.reduce((s, st) => s + st.amount, 0);
        if (totalReceived > 10000) {
          patterns.push({
            memberId: member.id, memberName: member.name,
            pattern: 'trusted_receiver',
            confidence: 0.6,
            detail: `${member.name} has received ₹${totalReceived.toLocaleString()} in settlements — trusted member`,
          });
        }
      }
    }

    return patterns;
  }

  detectRecurringExpenses(transactions: TransactionData[]): { description: string; amount: number; frequency: string; confidence: number }[] {
    const recurring: { description: string; amount: number; frequency: string; confidence: number }[] = [];
    const descriptionMap = new Map<string, { amounts: number[]; dates: Date[] }>();

    for (const t of transactions) {
      if (!t.description) continue;
      const key = t.description.toLowerCase().trim();
      const existing = descriptionMap.get(key) || { amounts: [], dates: [] };
      existing.amounts.push(t.amount);
      existing.dates.push(t.date);
      descriptionMap.set(key, existing);
    }

    for (const [desc, data] of descriptionMap) {
      if (data.dates.length >= 2) {
        const sortedDates = data.dates.sort((a, b) => a.getTime() - b.getTime());
        const gaps: number[] = [];
        for (let i = 1; i < sortedDates.length; i++) {
          const gap = (sortedDates[i].getTime() - sortedDates[i - 1].getTime()) / (1000 * 60 * 60 * 24);
          gaps.push(gap);
        }

        const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
        const isConsistent = gaps.every(g => Math.abs(g - avgGap) <= avgGap * 0.3);

        if (isConsistent && avgGap >= 20 && avgGap <= 35) {
          recurring.push({
            description: desc,
            amount: Math.round(data.amounts.reduce((s, a) => s + a, 0) / data.amounts.length),
            frequency: 'monthly',
            confidence: 0.9,
          });
        } else if (isConsistent && avgGap >= 5 && avgGap <= 9) {
          recurring.push({
            description: desc,
            amount: Math.round(data.amounts.reduce((s, a) => s + a, 0) / data.amounts.length),
            frequency: 'weekly',
            confidence: 0.8,
          });
        } else if (data.dates.length >= 3) {
          recurring.push({
            description: desc,
            amount: Math.round(data.amounts.reduce((s, a) => s + a, 0) / data.amounts.length),
            frequency: 'irregular',
            confidence: 0.4,
          });
        }
      }
    }

    return recurring;
  }
}

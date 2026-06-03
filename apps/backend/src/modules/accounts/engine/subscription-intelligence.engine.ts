import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

export interface SubscriptionItem {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  category: string;
  nextDue: string | null;
  isActive: boolean;
  daysUntilDue: number | null;
  source: 'transaction' | 'reminder' | 'bill';
}

export interface SubscriptionIntelligence {
  monthlyTotal: number;
  yearlyTotal: number;
  activeCount: number;
  inactiveCount: number;
  upcomingRenewals: SubscriptionItem[];
  inactiveSubscriptions: SubscriptionItem[];
  allSubscriptions: SubscriptionItem[];
  annualBreakdown: { name: string; amount: number; frequency: string; annualCost: number }[];
}

@Injectable()
export class SubscriptionIntelligenceEngine {
  constructor(private readonly prisma: PrismaService) {}

  async analyze(userId: string): Promise<SubscriptionIntelligence> {
    const now = new Date();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const [recurringTxns, subscriptionReminders, recurringBills] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { userId, isRecurring: true, type: 'expense', deletedAt: null },
        orderBy: { date: 'desc' },
      }),
      this.prisma.reminder.findMany({
        where: { userId, type: 'subscription', status: 'active', deletedAt: null },
        orderBy: { remindAt: 'asc' },
      }),
      this.prisma.bill.findMany({
        where: { userId, isRecurring: true, deletedAt: null },
        orderBy: { dueDate: 'asc' },
      }),
    ]);

    const recentTxns = await this.prisma.transaction.findMany({
      where: {
        userId,
        type: 'expense',
        deletedAt: null,
        date: { gte: threeMonthsAgo },
      },
      orderBy: { date: 'desc' },
      take: 500,
    });

    const recentAmountMap = new Map<string, number>();
    for (const t of recentTxns) {
      const key = t.description || 'unknown';
      recentAmountMap.set(key, (recentAmountMap.get(key) || 0) + 1);
    }

    const freqToMonths: Record<string, number> = {
      weekly: 52,
      biweekly: 26,
      monthly: 12,
      quarterly: 4,
      half_yearly: 2,
      yearly: 1,
      daily: 365,
    };

    const annualize = (amount: number, freq: string): number => {
      const f = freq?.toLowerCase() || 'monthly';
      return amount * (freqToMonths[f] || 12);
    };

    const subscriptionSet = new Set<string>();
    const allSubscriptions: SubscriptionItem[] = [];

    for (const t of recurringTxns) {
      const name = t.description || 'Subscription';
      const key = `txn-${t.id}`;
      if (subscriptionSet.has(key)) continue;
      subscriptionSet.add(key);

      const freq = t.recurringFrequency || 'monthly';
      const amount = Number(t.amount);
      const lastSeenCount = recentAmountMap.get(t.description || 'unknown') || 0;
      const isActive = lastSeenCount > 0 || !t.date || (now.getTime() - new Date(t.date).getTime() < 90 * 86400000);

      const nextDue = this.estimateNextDue(t.date, freq);
      allSubscriptions.push({
        id: t.id,
        name,
        amount,
        frequency: freq,
        category: 'Subscription',
        nextDue: nextDue?.toISOString() || null,
        isActive,
        daysUntilDue: nextDue ? Math.round((nextDue.getTime() - now.getTime()) / 86400000) : null,
        source: 'transaction',
      });
    }

    for (const r of subscriptionReminders) {
      const name = r.title;
      const key = `rem-${r.id}`;
      if (subscriptionSet.has(key)) continue;
      subscriptionSet.add(key);

      const amount = Number((r.metadata as any)?.amount) || 0;
      const freq = (r.metadata as any)?.frequency || 'monthly';
      const isActive = r.status === 'active';
      allSubscriptions.push({
        id: r.id,
        name,
        amount,
        frequency: freq,
        category: 'Subscription',
        nextDue: r.remindAt?.toISOString() || null,
        isActive,
        daysUntilDue: r.remindAt ? Math.round((r.remindAt.getTime() - now.getTime()) / 86400000) : null,
        source: 'reminder',
      });
    }

    for (const b of recurringBills) {
      const name = b.name;
      const key = `bill-${b.id}`;
      if (subscriptionSet.has(key)) continue;
      subscriptionSet.add(key);

      const amount = Number(b.amount);
      const freq = b.frequency || 'monthly';
      const isActive = !b.isPaid;
      allSubscriptions.push({
        id: b.id,
        name,
        amount,
        frequency: freq,
        category: 'Bill',
        nextDue: b.dueDate?.toISOString() || null,
        isActive,
        daysUntilDue: b.dueDate ? Math.round((b.dueDate.getTime() - now.getTime()) / 86400000) : null,
        source: 'bill',
      });
    }

    const monthlyTotal = allSubscriptions
      .filter((s) => s.isActive)
      .reduce((sum, s) => {
        const months = freqToMonths[s.frequency?.toLowerCase()] || 12;
        return sum + (s.amount * months) / 12;
      }, 0);

    const yearlyTotal = allSubscriptions
      .filter((s) => s.isActive)
      .reduce((sum, s) => sum + annualize(s.amount, s.frequency), 0);

    const activeSubs = allSubscriptions.filter((s) => s.isActive);
    const inactiveSubs = allSubscriptions.filter((s) => !s.isActive);
    const upcomingRenewals = allSubscriptions
      .filter((s) => s.isActive && s.daysUntilDue !== null && s.daysUntilDue >= 0 && s.daysUntilDue <= 30)
      .sort((a, b) => (a.daysUntilDue || 0) - (b.daysUntilDue || 0));

    const annualBreakdown = allSubscriptions
      .filter((s) => s.isActive)
      .map((s) => ({
        name: s.name,
        amount: s.amount,
        frequency: s.frequency,
        annualCost: annualize(s.amount, s.frequency),
      }))
      .sort((a, b) => b.annualCost - a.annualCost);

    return {
      monthlyTotal: Math.round(monthlyTotal),
      yearlyTotal: Math.round(yearlyTotal),
      activeCount: activeSubs.length,
      inactiveCount: inactiveSubs.length,
      upcomingRenewals,
      inactiveSubscriptions: inactiveSubs,
      allSubscriptions,
      annualBreakdown,
    };
  }

  private estimateNextDue(lastDate: Date, freq: string): Date | null {
    if (!lastDate) return null;
    const d = new Date(lastDate);
    const f = freq?.toLowerCase() || 'monthly';
    switch (f) {
      case 'daily': d.setDate(d.getDate() + 1); break;
      case 'weekly': d.setDate(d.getDate() + 7); break;
      case 'biweekly': d.setDate(d.getDate() + 14); break;
      case 'monthly': d.setMonth(d.getMonth() + 1); break;
      case 'quarterly': d.setMonth(d.getMonth() + 3); break;
      case 'half_yearly': d.setMonth(d.getMonth() + 6); break;
      case 'yearly': d.setFullYear(d.getFullYear() + 1); break;
      default: d.setMonth(d.getMonth() + 1);
    }
    return d > new Date() ? d : null;
  }
}

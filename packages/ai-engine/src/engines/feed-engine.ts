export interface RawTransaction {
  id: string;
  amount: number;
  category?: string;
  description?: string;
  date: Date;
  type: 'income' | 'expense';
  merchantName?: string;
}

export interface RawBudget {
  id: string;
  name: string;
  amount: number;
  spent: number;
  category?: string;
  periodStart: Date;
  periodEnd: Date;
}

export interface RawGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: Date;
  type: string;
  isCompleted: boolean;
}

export interface RawAccount {
  id: string;
  name: string;
  balance: number;
  type: string;
}

export interface RawSettlement {
  id: string;
  from: string;
  to: string;
  amount: number;
  date: Date;
  status: string;
}

export interface RawGroupExpense {
  id: string;
  paidBy: string;
  amount: number;
  category?: string;
  date: Date;
  splits: { memberId: string; amount: number }[];
}

export interface RawSubscription {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  isActive: boolean;
  lastBilled?: Date;
}

export interface RawBill {
  id: string;
  name: string;
  amount: number;
  dueDate: Date;
  isPaid: boolean;
  category?: string;
}

export interface PrecomputedData {
  anomalies?: any[];
  predictions?: any[];
  insights?: any[];
  recommendations?: any[];
  dna?: any;
  healthScore?: any;
  goalPredictions?: any[];
  settlementOptimizations?: any[];
  coupleIntelligence?: any;
  familyIntelligence?: any;
  savingsOpportunities?: any[];
  milestones?: any[];
  lifeEvents?: any[];
}

export interface FeedCardInput {
  type: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  message: string;
  impactValue?: number;
  confidenceScore?: number;
  category: string;
  actionType?: string;
  actionPayload?: Record<string, any>;
  metadata?: Record<string, any>;
  expiresAt?: Date;
}

export class FeedEngine {
  generate(data: {
    userId: string;
    transactions: RawTransaction[];
    budgets: RawBudget[];
    goals: RawGoal[];
    accounts: RawAccount[];
    settlements: RawSettlement[];
    groupExpenses: RawGroupExpense[];
    subscriptions: RawSubscription[];
    bills: RawBill[];
    precomputed: PrecomputedData;
  }): FeedCardInput[] {
    const cards: FeedCardInput[] = [];

    const pushers = [
      () => this.analyzeSpending(data.transactions, data.budgets),
      () => this.analyzeBudgetRisk(data.budgets, data.transactions),
      () => this.integratePredictions(data.precomputed.predictions),
      () => this.integrateAnomalies(data.precomputed.anomalies),
      () => this.analyzeSavings(data.transactions, data.subscriptions, data.bills, data.precomputed.savingsOpportunities),
      () => this.analyzeGoals(data.goals, data.precomputed.goalPredictions, data.precomputed.milestones),
      () => this.integrateRelationship(data.precomputed.coupleIntelligence, data.precomputed.familyIntelligence),
      () => this.integrateGroups(data.settlements, data.groupExpenses, data.precomputed.settlementOptimizations),
      () => this.integrateLifeEvents(data.precomputed.lifeEvents),
    ];

    for (const push of pushers) {
      try {
        const result = push();
        for (const card of result) {
          cards.push(card);
        }
      } catch {
        continue;
      }
    }

    cards.sort((a, b) => {
      const rank = { critical: 0, high: 1, medium: 2, low: 3 };
      return (rank[a.priority] ?? 99) - (rank[b.priority] ?? 99);
    });

    return cards;
  }

  private analyzeSpending(
    transactions: RawTransaction[],
    budgets: RawBudget[],
  ): FeedCardInput[] {
    const cards: FeedCardInput[] = [];
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const expenses = transactions.filter(t => t.type === 'expense');
    const recent = expenses.filter(t => t.date >= sevenDaysAgo);
    const monthly = expenses.filter(t => t.date >= thirtyDaysAgo);

    const byCategory = new Map<string, { recent: number[]; monthly: number[] }>();
    for (const t of expenses) {
      const cat = t.category || 'uncategorized';
      if (!byCategory.has(cat)) byCategory.set(cat, { recent: [], monthly: [] });
      const entry = byCategory.get(cat)!;
      if (t.date >= sevenDaysAgo) entry.recent.push(t.amount);
      if (t.date >= thirtyDaysAgo) entry.monthly.push(t.amount);
    }

    for (const [cat, data] of byCategory) {
      const avgRecent = data.recent.length > 0 ? data.recent.reduce((s, a) => s + a, 0) / data.recent.length : 0;
      const avgMonthly = data.monthly.length > 0 ? data.monthly.reduce((s, a) => s + a, 0) / data.monthly.length : 0;

      if (avgMonthly > 0 && avgRecent > avgMonthly * 1.3) {
        const pctIncrease = Math.round(((avgRecent - avgMonthly) / avgMonthly) * 100);
        cards.push({
          type: 'spending_insight',
          priority: pctIncrease > 50 ? 'high' : 'medium',
          title: `Spending spike in ${cat}`,
          message: `You are spending ${pctIncrease}% more on ${cat} than usual in the last 7 days.`,
          impactValue: Math.round((avgRecent - avgMonthly) * 30),
          confidenceScore: 85,
          category: 'spending',
          actionType: 'view_transactions',
          actionPayload: { category: cat, filter: 'recent' },
          metadata: { category: cat, pctIncrease, avgRecent, avgMonthly },
        });
      }
    }

    const totalRecent = recent.reduce((s, t) => s + t.amount, 0);
    const totalMonthly = monthly.reduce((s, t) => s + t.amount, 0);
    const avgDailyRecent = totalRecent / 7;
    const avgDailyMonthly = totalMonthly / 30;

    if (avgDailyMonthly > 0 && avgDailyRecent > avgDailyMonthly * 1.2) {
      const pctUp = Math.round(((avgDailyRecent - avgDailyMonthly) / avgDailyMonthly) * 100);
      cards.push({
        type: 'spending_insight',
        priority: pctUp > 40 ? 'high' : 'medium',
        title: 'Overall spending increasing',
        message: `Your daily spending is up ${pctUp}% this week compared to your monthly average.`,
        impactValue: Math.round(avgDailyRecent * 30),
        confidenceScore: 80,
        category: 'spending',
        actionType: 'view_insights',
        actionPayload: { section: 'transactions' },
      });
    }

    const weekendExpenses = recent.filter(t => {
      const d = t.date.getDay();
      return d === 0 || d === 6;
    });
    const weekdayExpenses = recent.filter(t => {
      const d = t.date.getDay();
      return d > 0 && d < 6;
    });

    if (weekendExpenses.length > 0 && weekdayExpenses.length > 0) {
      const avgWeekend = weekendExpenses.reduce((s, t) => s + t.amount, 0) / weekendExpenses.length;
      const avgWeekday = weekdayExpenses.reduce((s, t) => s + t.amount, 0) / weekdayExpenses.length;
      if (avgWeekend > avgWeekday * 1.5) {
        cards.push({
          type: 'spending_insight',
          priority: 'low',
          title: 'Weekend spending pattern',
          message: 'Your average weekend transaction is 50% higher than weekdays. Consider mindful spending on weekends.',
          impactValue: Math.round((avgWeekend - avgWeekday) * 8),
          confidenceScore: 75,
          category: 'spending',
        });
      }
    }

    return cards;
  }

  private analyzeBudgetRisk(
    budgets: RawBudget[],
    transactions: RawTransaction[],
  ): FeedCardInput[] {
    const cards: FeedCardInput[] = [];
    const now = new Date();

    for (const budget of budgets) {
      const utilization = budget.amount > 0 ? budget.spent / budget.amount : 0;
      const totalDays = (budget.periodEnd.getTime() - budget.periodStart.getTime()) / (24 * 60 * 60 * 1000);
      const daysElapsed = (now.getTime() - budget.periodStart.getTime()) / (24 * 60 * 60 * 1000);
      const daysLeft = Math.max(0, totalDays - daysElapsed);
      const expectedUtilization = totalDays > 0 ? daysElapsed / totalDays : 0;

      if (utilization > 0.8 && daysLeft < 10) {
        const dailyRate = budget.amount > 0 ? budget.spent / Math.max(1, daysElapsed) : 0;
        const projectedTotal = dailyRate * totalDays;
        const overrun = Math.max(0, projectedTotal - budget.amount);

        cards.push({
          type: 'budget_risk',
          priority: overrun > budget.amount * 0.2 ? 'critical' : 'high',
          title: `${budget.name} budget at risk`,
          message: `You've used ${Math.round(utilization * 100)}% of your ${budget.name} budget with ${Math.round(daysLeft)} days remaining. Projected overrun: ₹${Math.round(overrun)}.`,
          impactValue: Math.round(overrun),
          confidenceScore: 90,
          category: 'budget',
          actionType: 'view_budget',
          actionPayload: { budgetId: budget.id },
          metadata: { utilization, daysLeft, projectedTotal, budgetName: budget.name },
        });
      }

      if (utilization > expectedUtilization * 1.3 && daysLeft > 5) {
        cards.push({
          type: 'budget_risk',
          priority: 'medium',
          title: `${budget.name} spending ahead of pace`,
          message: `Your ${budget.name} spending is ${Math.round((utilization / expectedUtilization - 1) * 100)}% ahead of schedule. Consider adjusting your spending.`,
          impactValue: Math.round(budget.spent - budget.amount * expectedUtilization),
          confidenceScore: 80,
          category: 'budget',
          actionType: 'view_budget',
          actionPayload: { budgetId: budget.id },
          metadata: { utilization, expectedUtilization, budgetName: budget.name },
        });
      }
    }

    return cards;
  }

  private integratePredictions(predictions?: any[]): FeedCardInput[] {
    const cards: FeedCardInput[] = [];
    if (!predictions || predictions.length === 0) return cards;

    for (const pred of predictions) {
      if (pred.status === 'critical' || (pred.predictedValue && pred.currentValue && pred.predictedValue > pred.currentValue * 1.15)) {
        cards.push({
          type: 'spending_insight',
          priority: pred.status === 'critical' ? 'high' : 'medium',
          title: pred.message?.split('.')[0] || 'Month-end projection',
          message: pred.message || `Projected ${pred.type || 'spending'}: ₹${Math.round(pred.predictedValue)} vs ₹${Math.round(pred.currentValue)} current.`,
          impactValue: Math.round((pred.predictedValue || 0) - (pred.currentValue || 0)),
          confidenceScore: Math.round((pred.confidence || 0.7) * 100),
          category: 'budget',
          actionType: 'view_predictions',
          actionPayload: { predictionId: pred.id },
          metadata: { predictionId: pred.id, type: pred.type },
        });
      }
    }

    return cards;
  }

  private integrateAnomalies(anomalies?: any[]): FeedCardInput[] {
    const cards: FeedCardInput[] = [];
    if (!anomalies || anomalies.length === 0) return cards;

    for (const anomaly of anomalies) {
      cards.push({
        type: 'anomaly_alert',
        priority: anomaly.severity === 'critical' ? 'critical' : anomaly.severity === 'high' ? 'high' : 'medium',
        title: anomaly.title || anomaly.description?.split('.')[0] || 'Unusual transaction detected',
        message: anomaly.description || `Detected ${anomaly.type || 'anomaly'} in ${anomaly.category || 'spending'}. Actual: ₹${Math.round(anomaly.actualValue || 0)} vs Expected: ₹${Math.round(anomaly.expectedValue || 0)} (${Math.round(anomaly.deviationPct || 0)}% deviation).`,
        impactValue: Math.round(Math.abs((anomaly.actualValue || 0) - (anomaly.expectedValue || 0))),
        confidenceScore: Math.round((1 - Math.min(1, Math.abs(anomaly.deviationPct || 0) / 100)) * 100),
        category: 'anomaly',
        actionType: 'view_anomaly',
        actionPayload: { anomalyId: anomaly.id },
        metadata: { anomalyId: anomaly.id, severity: anomaly.severity, category: anomaly.category },
      });
    }

    return cards;
  }

  private analyzeSavings(
    transactions: RawTransaction[],
    subscriptions: RawSubscription[],
    bills: RawBill[],
    savingsOpportunities?: any[],
  ): FeedCardInput[] {
    const cards: FeedCardInput[] = [];

    const now = new Date();
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const unusedSubs = subscriptions.filter(s => {
      if (!s.isActive) return true;
      if (s.lastBilled && s.lastBilled < threeMonthsAgo) return true;
      return false;
    });

    for (const sub of unusedSubs) {
      cards.push({
        type: 'subscription_warning',
        priority: sub.amount > 500 ? 'high' : 'medium',
        title: `Unused subscription: ${sub.name}`,
        message: `You're paying ₹${sub.amount}/${sub.frequency || 'month'} for ${sub.name} but haven't used it recently. Cancelling saves ₹${Math.round(sub.amount * 12)}/year.`,
        impactValue: Math.round(sub.amount * 12),
        confidenceScore: 85,
        category: 'subscription',
        actionType: 'manage_subscription',
        actionPayload: { subscriptionId: sub.id, name: sub.name },
        metadata: { subscriptionId: sub.id, amount: sub.amount, frequency: sub.frequency },
      });
    }

    const merchantCounts = new Map<string, { count: number; total: number }>();
    for (const t of transactions.filter(t => t.type === 'expense' && t.date >= threeMonthsAgo)) {
      const merchant = t.merchantName || t.description || 'unknown';
      if (!merchantCounts.has(merchant)) merchantCounts.set(merchant, { count: 0, total: 0 });
      const entry = merchantCounts.get(merchant)!;
      entry.count++;
      entry.total += t.amount;
    }

    for (const [merchant, data] of merchantCounts) {
      if (data.count >= 8 && data.total > 2000) {
        cards.push({
          type: 'savings_opportunity',
          priority: data.total > 10000 ? 'high' : 'medium',
          title: `Frequent visits to ${merchant}`,
          message: `You've visited ${merchant} ${data.count} times in 3 months spending ₹${Math.round(data.total)}. Reducing by 25% saves ₹${Math.round(data.total * 0.25)}.`,
          impactValue: Math.round(data.total * 0.25),
          confidenceScore: 80,
          category: 'savings',
          actionType: 'view_transactions',
          actionPayload: { merchant },
          metadata: { merchant, count: data.count, total: data.total },
        });
      }
    }

    if (savingsOpportunities) {
      for (const opp of savingsOpportunities) {
        cards.push({
          type: 'savings_opportunity',
          priority: (opp.monthlySavings || 0) > 2000 ? 'high' : 'medium',
          title: opp.title || 'Savings opportunity found',
          message: opp.description || `Potential savings: ₹${Math.round(opp.monthlySavings || 0)}/month.`,
          impactValue: Math.round((opp.monthlySavings || 0) * 12),
          confidenceScore: opp.confidenceScore || 70,
          category: 'savings',
          actionType: opp.actionType || 'view_savings',
          actionPayload: opp.actionPayload || {},
          metadata: { opportunityId: opp.id, type: opp.type },
        });
      }
    }

    const unpaidBills = bills.filter(b => !b.isPaid);
    for (const bill of unpaidBills) {
      const daysUntilDue = Math.round((bill.dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      if (daysUntilDue <= 3 && daysUntilDue >= 0) {
        cards.push({
          type: 'budget_risk',
          priority: daysUntilDue <= 1 ? 'high' : 'medium',
          title: `${bill.name} due in ${daysUntilDue === 0 ? 'today' : `${daysUntilDue} days`}`,
          message: `Your ${bill.name} bill of ₹${Math.round(bill.amount)} is due ${daysUntilDue === 0 ? 'today' : `in ${daysUntilDue} days`}. Pay now to avoid late fees.`,
          impactValue: Math.round(bill.amount),
          confidenceScore: 95,
          category: 'budget',
          actionType: 'pay_bill',
          actionPayload: { billId: bill.id },
          metadata: { billId: bill.id, dueDate: bill.dueDate, daysUntilDue },
        });
      }
    }

    return cards;
  }

  private analyzeGoals(
    goals: RawGoal[],
    goalPredictions?: any[],
    milestones?: any[],
  ): FeedCardInput[] {
    const cards: FeedCardInput[] = [];

    for (const goal of goals) {
      if (goal.isCompleted) continue;
      const progress = goal.targetAmount > 0 ? goal.currentAmount / goal.targetAmount : 0;

      if (goal.deadline) {
        const now = new Date();
        const totalDays = (goal.deadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
        const expectedProgress = Math.max(0, 1 - totalDays / 365);

        if (progress < expectedProgress * 0.7 && totalDays > 0) {
          cards.push({
            type: 'goal_update',
            priority: totalDays < 30 ? 'high' : 'medium',
            title: `${goal.name} is behind schedule`,
            message: `Your goal "${goal.name}" is at ${Math.round(progress * 100)}% but should be at ${Math.round(expectedProgress * 100)}% by now.`,
            impactValue: Math.round(goal.targetAmount * (expectedProgress - progress)),
            confidenceScore: 85,
            category: 'goal',
            actionType: 'view_goal',
            actionPayload: { goalId: goal.id },
            metadata: { goalId: goal.id, progress, expectedProgress, daysLeft: Math.round(totalDays) },
          });
        }
      }

      if (progress >= 0.9 && progress < 1) {
        cards.push({
          type: 'goal_update',
          priority: 'high',
          title: `Almost there: ${goal.name}`,
          message: `You're ${Math.round(progress * 100)}% to your "${goal.name}" goal. Just ₹${Math.round(goal.targetAmount - goal.currentAmount)} to go!`,
          impactValue: Math.round(goal.targetAmount - goal.currentAmount),
          confidenceScore: 95,
          category: 'goal',
          actionType: 'view_goal',
          actionPayload: { goalId: goal.id },
          metadata: { goalId: goal.id, progress },
        });
      }
    }

    if (goalPredictions) {
      for (const gp of goalPredictions) {
        if (gp.delayRisk === 'high' || gp.delayRisk === 'critical') {
          cards.push({
            type: 'goal_update',
            priority: gp.delayRisk === 'critical' ? 'critical' : 'high',
            title: `Goal delay risk`,
            message: gp.improvementTip || `Your goal has a ${gp.delayMonths || ''}-month delay risk. Consider increasing contributions.`,
            impactValue: Math.round(gp.requiredMonthlyContribution || 0),
            confidenceScore: Math.round((gp.successProbability || 0.5) * 100),
            category: 'goal',
            actionType: 'view_goal',
            actionPayload: { goalId: gp.goalId },
            metadata: { goalId: gp.goalId, delayRisk: gp.delayRisk, delayMonths: gp.delayMonths },
          });
        }
      }
    }

    if (milestones) {
      const recentMilestones = (milestones as any[]).filter(m => {
        if (!m.isAchieved) return false;
        const achievedDate = m.achievedAt ? new Date(m.achievedAt) : null;
        if (!achievedDate) return false;
        return (Date.now() - achievedDate.getTime()) < 7 * 24 * 60 * 60 * 1000;
      });

      for (const m of recentMilestones) {
        cards.push({
          type: 'achievement',
          priority: 'medium',
          title: m.title || 'Achievement unlocked!',
          message: m.description || 'You reached a new financial milestone. Keep it up!',
          impactValue: m.value || undefined,
          confidenceScore: 100,
          category: 'achievement',
          actionType: 'view_milestone',
          actionPayload: { milestoneId: m.id },
          metadata: { milestoneId: m.id, milestoneType: m.milestoneType },
        });
      }
    }

    return cards;
  }

  private integrateRelationship(
    coupleIntelligence?: any,
    familyIntelligence?: any,
  ): FeedCardInput[] {
    const cards: FeedCardInput[] = [];

    if (coupleIntelligence) {
      const score = coupleIntelligence.healthScore || coupleIntelligence.compatibilityScore || 0;
      const change = coupleIntelligence.monthlyChange || 0;

      if (score < 60) {
        cards.push({
          type: 'couple_update',
          priority: score < 40 ? 'high' : 'medium',
          title: 'Couple financial health needs attention',
          message: `Your couple financial health score is ${score}/100. ${coupleIntelligence.topImprovement || 'Consider discussing shared expenses and goals.'}`,
          impactValue: undefined,
          confidenceScore: 85,
          category: 'couple',
          actionType: 'view_couple_ai',
          actionPayload: {},
          metadata: { score, change },
        });
      }

      if (change < -5) {
        cards.push({
          type: 'couple_update',
          priority: 'medium',
          title: 'Couple score declining',
          message: `Your couple financial health score dropped by ${Math.abs(change)} points this month. ${coupleIntelligence.topImprovement || 'Review shared expenses together.'}`,
          impactValue: undefined,
          confidenceScore: 80,
          category: 'couple',
          actionType: 'view_couple_ai',
          actionPayload: {},
          metadata: { score, change },
        });
      }
    }

    if (familyIntelligence) {
      const score = familyIntelligence.healthScore || 0;
      if (score < 60) {
        cards.push({
          type: 'family_update',
          priority: score < 40 ? 'high' : 'medium',
          title: 'Family financial health check',
          message: `Your family financial health score is ${score}/100. ${familyIntelligence.topImprovement || 'Focus on building shared emergency funds.'}`,
          impactValue: undefined,
          confidenceScore: 85,
          category: 'family',
          actionType: 'view_family_ai',
          actionPayload: {},
          metadata: { score },
        });
      }
    }

    return cards;
  }

  private integrateGroups(
    settlements: RawSettlement[],
    groupExpenses: RawGroupExpense[],
    settlementOptimizations?: any[],
  ): FeedCardInput[] {
    const cards: FeedCardInput[] = [];

    if (settlementOptimizations) {
      for (const opt of settlementOptimizations) {
        const savings = (opt.originalTxCount || 0) - (opt.optimizedTxCount || 0);
        if (savings > 0) {
          cards.push({
            type: 'settlement_optimization',
            priority: savings > 3 ? 'medium' : 'low',
            title: `Optimize ${savings} group settlements`,
            message: `AI can reduce ${opt.originalTxCount || 0} settlements to ${opt.optimizedTxCount || 0} in your group. Save ${savings} transactions.`,
            impactValue: Math.round(opt.totalAmount || 0),
            confidenceScore: 95,
            category: 'group',
            actionType: 'view_settlements',
            actionPayload: { groupId: opt.groupId },
            metadata: { groupId: opt.groupId, original: opt.originalTxCount, optimized: opt.optimizedTxCount },
          });
        }
      }
    }

    const pendingSettlements = settlements.filter(s => s.status === 'pending');
    if (pendingSettlements.length > 3) {
      cards.push({
        type: 'settlement_optimization',
        priority: 'low',
        title: `${pendingSettlements.length} pending settlements`,
        message: `You have ${pendingSettlements.length} unsettled expenses. Settle them to keep group finances clean.`,
        impactValue: Math.round(pendingSettlements.reduce((s, x) => s + x.amount, 0)),
        confidenceScore: 90,
        category: 'group',
        actionType: 'view_settlements',
        actionPayload: {},
        metadata: { count: pendingSettlements.length },
      });
    }

    return cards;
  }

  private integrateLifeEvents(lifeEvents?: any[]): FeedCardInput[] {
    const cards: FeedCardInput[] = [];
    if (!lifeEvents || lifeEvents.length === 0) return cards;

    const recentEvents = (lifeEvents as any[]).filter(e => {
      if (!e.eventDate) return false;
      return (Date.now() - new Date(e.eventDate).getTime()) < 14 * 24 * 60 * 60 * 1000;
    });

    for (const event of recentEvents) {
      cards.push({
        type: 'spending_insight',
        priority: 'medium',
        title: `Life event detected: ${event.title || event.eventType || 'Change'}`,
        message: event.description || 'A significant financial life event was detected. Review your budget to adjust.',
        impactValue: undefined,
        confidenceScore: Math.round((event.confidence || 0.7) * 100),
        category: 'spending',
        actionType: 'view_life_event',
        actionPayload: { eventId: event.id },
        metadata: { eventId: event.id, eventType: event.eventType },
      });
    }

    return cards;
  }
}

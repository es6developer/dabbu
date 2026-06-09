interface NotifUserData {
  id: string;
  billPaymentConsistencyScore?: number;
  savingsRate?: number;
  disciplineScore?: number;
  financialDna?: {
    spendingPersonality: string;
    savingPersonality: string;
  };
}

interface NotifBillData {
  id: string;
  name: string;
  amount: number;
  dueDate: Date;
  category?: string;
}

interface NotifBudgetData {
  id: string;
  category: string;
  amount: number;
  spent: number;
}

interface NotifTransactionData {
  id: string;
  amount: number;
  category?: string;
  description?: string;
  date: Date;
}

interface SmartNotifOutput {
  userId: string;
  type: string;
  title: string;
  message: string;
  context: {
    trigger: string;
    userBehavior?: string;
    consistencyScore?: number;
    personalization: string;
  };
  priority: 'low' | 'medium' | 'high';
  actionLabel?: string;
  actionRoute?: string;
}

export class SmartNotificationEngine {
  generateBillReminder(bill: NotifBillData, userData: NotifUserData): SmartNotifOutput {
    const daysUntilDue = Math.max(0, Math.ceil((bill.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    const consistencyScore = userData.billPaymentConsistencyScore ?? 0;

    let priority: 'low' | 'medium' | 'high';
    if (daysUntilDue <= 1) priority = 'high';
    else if (daysUntilDue <= 3) priority = 'medium';
    else priority = 'low';

    const title = daysUntilDue === 0
      ? `${bill.name} Due Today`
      : `${bill.name} Due in ${daysUntilDue} Day${daysUntilDue > 1 ? 's' : ''}`;

    const message = consistencyScore >= 80
      ? `Pay ${bill.name} of ₹${bill.amount.toLocaleString()} by ${bill.dueDate.toLocaleDateString()} to maintain your ${consistencyScore}% payment consistency score.`
      : consistencyScore >= 50
        ? `Your ${bill.name} bill of ₹${bill.amount.toLocaleString()} is due ${daysUntilDue === 0 ? 'today' : `in ${daysUntilDue} days`}. Timely payments improve your ${consistencyScore}% consistency score.`
        : `${bill.name} of ₹${bill.amount.toLocaleString()} is due ${daysUntilDue === 0 ? 'today' : `in ${daysUntilDue} days`}. Setting up autopay can help build consistency.`;

    return {
      userId: userData.id,
      type: 'bill_reminder',
      title,
      message,
      context: {
        trigger: `bill_due_${daysUntilDue}_days`,
        consistencyScore,
        personalization: consistencyScore >= 80 ? 'high_consistency_praise' : consistencyScore >= 50 ? 'medium_consistency_encourage' : 'low_consistency_improve',
      },
      priority,
      actionLabel: 'Pay Now',
      actionRoute: `/bills/${bill.id}`,
    };
  }

  generateBudgetAlert(budget: NotifBudgetData, transactions: NotifTransactionData[], userData: NotifUserData): SmartNotifOutput {
    const overspendAmount = Math.max(0, budget.spent - budget.amount);
    const spentPct = budget.amount > 0 ? Math.round((budget.spent / budget.amount) * 100) : 0;

    const categorySuggestions: Record<string, { reduction: string; action: string; route: string }> = {
      food: { reduction: 'eating out 2 times less', action: 'Set Dining Budget', route: '/budgets/food' },
      shopping: { reduction: 'skipping one purchase this week', action: 'Review Cart', route: '/budgets/shopping' },
      transport: { reduction: 'using public transport for 3 trips', action: 'Check Fare Options', route: '/budgets/transport' },
      entertainment: { reduction: 'cutting one streaming subscription', action: 'Review Subscriptions', route: '/subscriptions' },
      groceries: { reduction: 'planning meals better', action: 'Set Grocery Budget', route: '/budgets/groceries' },
    };

    const suggestion = categorySuggestions[budget.category.toLowerCase()] || { reduction: 'reducing spending by 10%', action: 'Review Budget', route: '/budgets' };

    const title = overspendAmount > 0
      ? `${budget.category} Budget Exceeded by ₹${overspendAmount.toLocaleString()}`
      : `${budget.category} Budget at ${spentPct}%`;

    const message = overspendAmount > 0
      ? `You crossed your ${budget.category} budget by ₹${overspendAmount.toLocaleString()}. ${suggestion.reduction} this week will recover it.`
      : `You've used ${spentPct}% of your ${budget.category} budget (₹${budget.spent.toLocaleString()} of ₹${budget.amount.toLocaleString()}).`;

    const priority: 'low' | 'medium' | 'high' = overspendAmount > budget.amount * 0.5 ? 'high' : overspendAmount > 0 ? 'medium' : 'low';

    return {
      userId: userData.id,
      type: 'budget_alert',
      title,
      message,
      context: {
        trigger: overspendAmount > 0 ? 'budget_overspend' : 'budget_approaching_limit',
        personalization: `category_${budget.category.toLowerCase()}`,
      },
      priority,
      actionLabel: suggestion.action,
      actionRoute: suggestion.route,
    };
  }

  generateLargeTransactionAlert(transaction: NotifTransactionData, userData: NotifUserData): SmartNotifOutput {
    const spendingPersonality = userData.financialDna?.spendingPersonality || 'moderate';
    const disciplineScore = userData.disciplineScore ?? 50;

    const isLavish = spendingPersonality === 'lavish' || spendingPersonality === 'spender' || spendingPersonality === 'impulsive';
    const isFrugal = spendingPersonality === 'frugal' || spendingPersonality === 'saver' || spendingPersonality === 'minimalist';

    let title: string;
    let message: string;
    let priority: 'low' | 'medium' | 'high';

    if (isLavish) {
      title = `₹${transaction.amount.toLocaleString()} spent on ${transaction.description || transaction.category || 'expense'}`;
      message = `That's a notable expense. Given your spending style, consider if this aligns with your monthly goals.`;
      priority = 'low';
    } else if (isFrugal) {
      title = `Large expense: ₹${transaction.amount.toLocaleString()}`;
      message = `This is higher than your typical spending. Would you like to review or categorize this transaction?`;
      priority = disciplineScore < 60 ? 'high' : 'medium';
    } else {
      title = `₹${transaction.amount.toLocaleString()} ${transaction.description || 'transaction'}`;
      message = transaction.amount > 10000
        ? `This is a significant transaction. Track it to stay on top of your budget.`
        : `Transaction of ₹${transaction.amount.toLocaleString()} recorded.`;
      priority = transaction.amount > 20000 ? 'medium' : 'low';
    }

    return {
      userId: userData.id,
      type: 'large_transaction_alert',
      title,
      message,
      context: {
        trigger: 'large_transaction',
        userBehavior: spendingPersonality,
        personalization: isLavish ? 'gentle_nudge_lavish_spender' : isFrugal ? 'concerned_tone_frugal' : 'neutral',
      },
      priority,
      actionLabel: 'View Transaction',
      actionRoute: `/transactions/${transaction.id}`,
    };
  }

  generateGoalMilestone(goalName: string, progress: number, daysEarly?: number): SmartNotifOutput {
    const clampedProgress = Math.min(100, Math.max(0, progress));

    let title: string;
    let message: string;
    let priority: 'low' | 'medium' | 'high';

    if (clampedProgress >= 100) {
      title = `🎉 Goal Achieved: ${goalName}`;
      message = `Congratulations! You've reached your ${goalName} goal${daysEarly !== undefined ? `, ${daysEarly} days early!` : '!'}`;
      priority = 'high';
    } else if (clampedProgress >= 75) {
      title = `${goalName} — ${clampedProgress}% Complete`;
      message = daysEarly !== undefined && daysEarly > 0
        ? `You're ${clampedProgress}% there and ${daysEarly} days ahead of schedule. Keep it up!`
        : `Great progress on ${goalName}! You're ${clampedProgress}% of the way there.`;
      priority = 'medium';
    } else if (clampedProgress >= 50) {
      title = `${goalName} — Halfway There!`;
      message = daysEarly !== undefined && daysEarly > 0
        ? `You're ${clampedProgress}% done and ${daysEarly} days early. Stay consistent!`
        : `You've reached ${clampedProgress}% of your ${goalName} goal. Keep going!`;
      priority = 'medium';
    } else {
      title = `${goalName} — ${clampedProgress}% Progress`;
      message = `You're ${clampedProgress}% towards your ${goalName} goal. ${clampedProgress > 25 ? 'Nice start!' : 'Every journey begins with a single step.'}`;
      priority = 'low';
    }

    return {
      userId: '',
      type: 'goal_milestone',
      title,
      message,
      context: {
        trigger: clampedProgress >= 100 ? 'goal_completed' : 'goal_milestone',
        personalization: `progress_${clampedProgress}`,
      },
      priority,
      actionLabel: clampedProgress < 100 ? 'View Goal' : undefined,
      actionRoute: clampedProgress < 100 ? '/goals' : undefined,
    };
  }
}

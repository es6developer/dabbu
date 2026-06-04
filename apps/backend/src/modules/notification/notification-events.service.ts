import { Injectable, Logger } from '@nestjs/common';
import { NotificationService } from './notification.service';

@Injectable()
export class NotificationEventsService {
  private readonly logger = new Logger(NotificationEventsService.name);

  constructor(private readonly notificationService: NotificationService) {}

  // ===== EXPENSE TRACKING =====
  async expenseAdded(userId: string, data: { amount: number; description: string; category: string }) {
    const title = 'Expense Added';
    const message = `You spent ₹${data.amount.toLocaleString('en-IN')} on ${data.description || data.category}`;
    await this.notificationService.create({ userId, type: 'expense' as any, title, message, data });
  }

  async largeExpenseDetected(userId: string, data: { amount: number; description: string; category: string; threshold: number }) {
    const title = 'Large Expense Alert';
    const message = `You spent ₹${data.amount.toLocaleString('en-IN')} on ${data.description || data.category} — that's above your typical spending`;
    await this.notificationService.create({ userId, type: 'expense_alert' as any, title, message, data, priority: 'high' });
  }

  async monthlyBudgetExceeded(userId: string, data: { category: string; budget: number; spent: number; overspent: number }) {
    const title = 'Budget Exceeded';
    const message = `Your ${data.category} budget of ₹${data.budget.toLocaleString('en-IN')} was exceeded by ₹${data.overspent.toLocaleString('en-IN')}`;
    await this.notificationService.create({ userId, type: 'budget_exceeded' as any, title, message, data, priority: 'high' });
  }

  async spendingSpike(userId: string, data: { category: string; currentMonth: number; lastMonth: number; increase: number; percent: number }) {
    const title = 'Spending Spike';
    const message = `${data.category} spending increased by ${Math.round(data.percent)}% this month (₹${data.currentMonth.toLocaleString('en-IN')} vs ₹${data.lastMonth.toLocaleString('en-IN')} last month)`;
    await this.notificationService.create({ userId, type: 'spending_spike' as any, title, message, data });
  }

  // ===== SHARED FINANCE =====
  async groupInvited(userId: string, data: { groupId: string; groupName: string; invitedBy: string }) {
    const title = 'Group Invitation';
    const message = `${data.invitedBy} invited you to "${data.groupName}"`;
    await this.notificationService.create({ userId, type: 'group_invite' as any, title, message, data });
  }

  async userJoinedGroup(userId: string, data: { groupId: string; groupName: string; joinedBy: string }) {
    const title = 'Member Joined';
    const message = `${data.joinedBy} joined "${data.groupName}"`;
    await this.notificationService.create({ userId, type: 'group_join' as any, title, message, data });
  }

  async groupExpenseAdded(userId: string, data: { groupId: string; groupName: string; amount: number; description: string; addedBy: string }) {
    const title = 'Shared Expense Added';
    const message = `${data.addedBy} added ₹${data.amount.toLocaleString('en-IN')} for ${data.description || 'an expense'} in ${data.groupName}`;
    await this.notificationService.create({ userId, type: 'group_expense' as any, title, message, data });
  }

  async settlementRequested(userId: string, data: { groupId: string; groupName: string; amount: number; from: string; to: string }) {
    const title = 'Settlement Requested';
    const message = `${data.from} requested ₹${data.amount.toLocaleString('en-IN')} from you in ${data.groupName}`;
    await this.notificationService.create({ userId, type: 'settlement_request' as any, title, message, data, priority: 'high' });
  }

  async settlementCompleted(userId: string, data: { groupId: string; groupName: string; amount: number; paidBy: string; paidTo: string }) {
    const title = 'Settlement Completed';
    const message = `₹${data.amount.toLocaleString('en-IN')} settled successfully in ${data.groupName}`;
    await this.notificationService.create({ userId, type: 'settlement_complete' as any, title, message, data });
  }

  async memberRemoved(userId: string, data: { groupId: string; groupName: string; removedBy: string }) {
    const title = 'Member Removed';
    const message = `You were removed from "${data.groupName}" by ${data.removedBy}`;
    await this.notificationService.create({ userId, type: 'group_remove' as any, title, message, data });
  }

  // ===== GOALS =====
  async goalCreated(userId: string, data: { goalId: string; name: string; targetAmount: number }) {
    const title = 'New Goal Created';
    const message = `"${data.name}" goal created — save ₹${data.targetAmount.toLocaleString('en-IN')}`;
    await this.notificationService.create({ userId, type: 'goal_created' as any, title, message, data });
  }

  async goalMilestone(userId: string, data: { goalId: string; name: string; progress: number; milestone: number }) {
    const title = 'Goal Milestone!';
    const message = `"${data.name}" reached ${data.milestone}% — keep going!`;
    await this.notificationService.create({ userId, type: 'goal_milestone' as any, title, message, data });
  }

  async goalCompleted(userId: string, data: { goalId: string; name: string; savedAmount: number }) {
    const title = 'Goal Completed!';
    const message = `Congratulations! "${data.name}" goal completed — you saved ₹${data.savedAmount.toLocaleString('en-IN')}!`;
    await this.notificationService.create({ userId, type: 'goal_complete' as any, title, message, data, priority: 'high' });
  }

  async goalBehindSchedule(userId: string, data: { goalId: string; name: string; progress: number; expected: number }) {
    const title = 'Goal Behind Schedule';
    const message = `"${data.name}" is behind schedule — ${Math.round(data.progress)}% achieved vs ${Math.round(data.expected)}% expected`;
    await this.notificationService.create({ userId, type: 'goal_behind' as any, title, message, data });
  }

  // ===== EMI REMINDERS =====
  async emiDueSoon(userId: string, data: { reminderId: string; name: string; amount: number; daysUntilDue: number }) {
    const dayLabel = data.daysUntilDue === 0 ? 'today' : data.daysUntilDue === 1 ? 'tomorrow' : `in ${data.daysUntilDue} days`;
    const title = 'EMI Due Soon';
    const message = `${data.name} EMI of ₹${data.amount.toLocaleString('en-IN')} is due ${dayLabel}`;
    await this.notificationService.create({ userId, type: 'emi_reminder' as any, title, message, data, priority: 'high', scheduledFor: data.daysUntilDue > 1 ? new Date(Date.now() + (data.daysUntilDue - 1) * 86400000).toISOString() : undefined });
  }

  async emiOverdue(userId: string, data: { reminderId: string; name: string; amount: number; overdueDays: number }) {
    const title = 'EMI Overdue!';
    const message = `${data.name} EMI of ₹${data.amount.toLocaleString('en-IN')} is overdue by ${data.overdueDays} day${data.overdueDays > 1 ? 's' : ''}`;
    await this.notificationService.create({ userId, type: 'emi_overdue' as any, title, message, data, priority: 'urgent' });
  }

  // ===== SUBSCRIPTION REMINDERS =====
  async subscriptionRenewal(userId: string, data: { reminderId: string; name: string; amount: number; renewalDate: string; daysUntilRenewal: number }) {
    const dayLabel = data.daysUntilRenewal === 0 ? 'today' : data.daysUntilRenewal === 1 ? 'tomorrow' : `in ${data.daysUntilRenewal} days`;
    const title = 'Subscription Renewal';
    const message = `${data.name} (₹${data.amount.toLocaleString('en-IN')}) renews ${dayLabel}`;
    await this.notificationService.create({ userId, type: 'subscription_reminder' as any, title, message, data });
  }

  // ===== SMART INSIGHTS =====
  async monthlySavings(userId: string, data: { savedAmount: number; month: string }) {
    const title = 'Monthly Savings';
    const message = `You saved ₹${data.savedAmount.toLocaleString('en-IN')} this month!`;
    await this.notificationService.create({ userId, type: 'insight_savings' as any, title, message, data });
  }

  async spendingChange(userId: string, data: { category: string; change: number; direction: 'up' | 'down' }) {
    const title = 'Spending Insight';
    const message = data.direction === 'up'
      ? `${data.category} spending increased by ${Math.round(data.change)}%`
      : `${data.category} spending decreased by ${Math.round(data.change)}%`;
    await this.notificationService.create({ userId, type: 'insight_spending' as any, title, message, data });
  }

  // ===== DAILY DIGEST =====
  async dailyDigest(userId: string, data: { todaySpent: number; monthSpent: number; remainingBudget: number; transactions: number }) {
    const title = 'Daily Summary';
    const message = `Today: ₹${data.todaySpent.toLocaleString('en-IN')} · Month: ₹${data.monthSpent.toLocaleString('en-IN')} · Budget remaining: ₹${data.remainingBudget.toLocaleString('en-IN')}`;
    await this.notificationService.create({ userId, type: 'daily_digest' as any, title, message, data });
  }

  // ===== WEEKLY DIGEST =====
  async weeklyDigest(userId: string, data: { totalSpent: number; savings: number; goalsProgress: { name: string; progress: number }[]; upcomingReminders: number }) {
    const goalStr = data.goalsProgress.map(g => `${g.name} (${Math.round(g.progress)}%)`).join(', ');
    const title = 'Weekly Report';
    const message = `Spent: ₹${data.totalSpent.toLocaleString('en-IN')} · Saved: ₹${data.savings.toLocaleString('en-IN')} · Goals: ${goalStr} · ${data.upcomingReminders} upcoming`;
    await this.notificationService.create({ userId, type: 'weekly_digest' as any, title, message, data });
  }

  // ===== MONTHLY REPORT =====
  async monthlyReport(userId: string, data: { totalExpense: number; totalIncome: number; savings: number; topCategory: string; goalProgress: { name: string; progress: number }[]; healthScore: number }) {
    const title = 'Monthly Report';
    const message = `Spent: ₹${data.totalExpense.toLocaleString('en-IN')} · Saved: ₹${data.savings.toLocaleString('en-IN')} · Top: ${data.topCategory} · Health: ${data.healthScore}/100`;
    await this.notificationService.create({ userId, type: 'monthly_report' as any, title, message, data });
  }
}

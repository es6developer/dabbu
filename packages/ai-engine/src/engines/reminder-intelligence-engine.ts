import { SettlementData, SettlementReminder, MemberData } from '../types';

export class ReminderIntelligenceEngine {
  generateSmartReminders(
    settlements: SettlementData[],
    members: MemberData[],
    daysThreshold: number = 3
  ): SettlementReminder[] {
    const reminders: SettlementReminder[] = [];

    for (const settlement of settlements) {
      if (settlement.status === 'completed') continue;

      const daysOutstanding = Math.abs(
        (new Date().getTime() - new Date(settlement.date).getTime()) / (1000 * 60 * 60 * 24)
      );

      const fromMember = members.find(m => m.id === settlement.from);
      const toMember = members.find(m => m.id === settlement.to);

      if (!fromMember || !toMember) continue;

      let reminder: SettlementReminder;
      if (daysOutstanding > 14) {
        reminder = {
          type: 'overdue',
          from: settlement.from, fromName: fromMember.name,
          to: settlement.to, toName: toMember.name,
          amount: settlement.amount,
          daysOutstanding: Math.round(daysOutstanding),
          groupName: '',
          groupId: '',
          message: `⏰ ${fromMember.name} still owes ${toMember.name} ₹${settlement.amount.toLocaleString()} from ${Math.round(daysOutstanding)} days ago`,
        };
      } else if (daysOutstanding > 7) {
        reminder = {
          type: 'aging',
          from: settlement.from, fromName: fromMember.name,
          to: settlement.to, toName: toMember.name,
          amount: settlement.amount,
          daysOutstanding: Math.round(daysOutstanding),
          groupName: '',
          groupId: '',
          message: `📌 Reminder: ${fromMember.name} owes ${toMember.name} ₹${settlement.amount.toLocaleString()} (${Math.round(daysOutstanding)} days)`,
        };
      } else if (daysOutstanding > daysThreshold) {
        reminder = {
          type: 'gentle_nudge',
          from: settlement.from, fromName: fromMember.name,
          to: settlement.to, toName: toMember.name,
          amount: settlement.amount,
          daysOutstanding: Math.round(daysOutstanding),
          groupName: '',
          groupId: '',
          message: `Hey ${fromMember.name}, don't forget to pay ${toMember.name} ₹${settlement.amount.toLocaleString()}`,
        };
      } else {
        reminder = {
          type: 'pending',
          from: settlement.from, fromName: fromMember.name,
          to: settlement.to, toName: toMember.name,
          amount: settlement.amount,
          daysOutstanding: Math.round(daysOutstanding),
          groupName: '',
          groupId: '',
          message: `${fromMember.name} owes ${toMember.name} ₹${settlement.amount.toLocaleString()}`,
        };
      }

      reminders.push(reminder);
    }

    return reminders;
  }

  prioritizeReminders(reminders: SettlementReminder[]): SettlementReminder[] {
    const priorityOrder: Record<string, number> = {
      overdue: 0, aging: 1, pending: 2, gentle_nudge: 3,
    };

    return reminders.sort((a, b) => {
      const pa = priorityOrder[a.type] ?? 99;
      const pb = priorityOrder[b.type] ?? 99;
      if (pa !== pb) return pa - pb;
      return b.amount - a.amount;
    });
  }

  shouldSendReminder(
    lastReminderSentAt: Date | null,
    daysOutstanding: number,
    amount: number
  ): { shouldSend: boolean; reason: string } {
    if (!lastReminderSentAt) {
      return { shouldSend: true, reason: 'First reminder' };
    }

    const hoursSinceLast = (new Date().getTime() - lastReminderSentAt.getTime()) / (1000 * 60 * 60);

    if (hoursSinceLast < 24) {
      return { shouldSend: false, reason: 'Already sent within 24 hours' };
    }

    if (daysOutstanding > 14 && hoursSinceLast > 48) {
      return { shouldSend: true, reason: 'Overdue, sending follow-up' };
    }

    if (daysOutstanding > 7 && hoursSinceLast > 72) {
      return { shouldSend: true, reason: 'Aging reminder' };
    }

    if (amount > 5000 && hoursSinceLast > 48) {
      return { shouldSend: true, reason: 'Large amount pending' };
    }

    return { shouldSend: false, reason: 'Not time yet' };
  }

  generateReminderMessage(
    fromName: string,
    toName: string,
    amount: number,
    daysOutstanding: number,
    groupName?: string
  ): string {
    const messages = [
      `${fromName}, ${toName} is waiting for ₹${amount.toLocaleString()}${groupName ? ` from ${groupName}` : ''}`,
      `📋 Pending: ${fromName} owes ${toName} ₹${amount.toLocaleString()}${groupName ? ` (${groupName})` : ''}`,
      daysOutstanding > 7
        ? `⏰ Friendly reminder: ${fromName}, please settle ₹${amount.toLocaleString()} with ${toName}`
        : `${fromName} → ${toName}: ₹${amount.toLocaleString()} is due`,
    ];

    return messages[Math.floor(Math.random() * messages.length)];
  }
}

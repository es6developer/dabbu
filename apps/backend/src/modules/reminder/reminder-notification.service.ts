import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationEventsService } from '../notification/notification-events.service';

@Injectable()
export class ReminderNotificationService {
  private readonly logger = new Logger(ReminderNotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly notificationEvents: NotificationEventsService,
  ) {}

  async sendDueReminderNotification(reminderId: string, userId: string) {
    const reminder = await this.prisma.reminder.findFirst({
      where: { id: reminderId, userId, deletedAt: null },
      include: { recurring: true },
    });
    if (!reminder) {return;}

    const now = new Date();
    const dueDate = reminder.dueDate || reminder.remindAt;
    const diffDays = dueDate ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;

    let timingLabel: string;
    let isOverdue = false;

    if (diffDays > 2) {
      timingLabel = `in ${diffDays} days`;
    } else if (diffDays === 2) {
      timingLabel = 'in 2 days';
    } else if (diffDays === 1) {
      timingLabel = 'tomorrow';
    } else if (diffDays === 0) {
      timingLabel = 'today';
    } else {
      timingLabel = 'overdue';
      isOverdue = true;
    }

    const priority = reminder.priority || 'medium';
    const title = `${reminder.title}`;
    const message = isOverdue
      ? `${reminder.title} overdue${reminder.type === 'bill' || reminder.type === 'subscription' ? ' — payment required' : ''}`
      : `${reminder.title} is due ${timingLabel}`;

    if (reminder.type === 'subscription' && !isOverdue) {
      this.notificationEvents
        .subscriptionRenewal(userId, {
          reminderId,
          name: reminder.title,
          amount: 0,
          renewalDate: dueDate?.toISOString() || '',
          daysUntilRenewal: Math.max(0, diffDays),
        })
        .catch((err) => this.logger.warn(`Subscription notification failed: ${err.message}`));
    } else {
      await this.notificationService.create({
        userId,
        type: isOverdue ? 'reminder_overdue' : 'reminder_upcoming',
        title,
        message,
        actionUrl: `/reminders/${reminderId}`,
        reminderId,
        priority,
        category: reminder.type,
        overdue: isOverdue,
        data: {
          reminderId,
          dueDate: dueDate?.toISOString(),
          diffDays,
          type: reminder.type,
        },
      }).catch((err) => this.logger.warn(`Notification failed for user ${userId}: ${err.message}`));
    }

    if (isOverdue) {
      await this.prisma.reminder.update({
        where: { id: reminderId },
        data: { isSent: true, sentAt: new Date() },
      });
    }

    this.logger.log(`Notification sent for reminder "${reminder.title}" (${diffDays}d -> ${timingLabel})`);
  }

  async sendOverdueFollowUp(reminderId: string, userId: string) {
    const reminder = await this.prisma.reminder.findUnique({
      where: { id: reminderId },
      select: { title: true, type: true, dueDate: true, priority: true, isSent: true },
    });
    if (!reminder || reminder.isSent) {return;}

    const title = `${reminder.title} still overdue`;
    const message = reminder.type === 'bill' || reminder.type === 'subscription'
      ? `Reminder: ${reminder.title} is overdue — please make payment to avoid late fees`
      : `Reminder: ${reminder.title} is still pending`;

    await this.notificationService.create({
      userId,
      type: 'reminder_overdue',
      title,
      message,
      actionUrl: `/reminders/${reminderId}`,
      reminderId,
      priority: 'urgent',
      category: reminder.type,
      overdue: true,
      data: { reminderId, dueDate: reminder.dueDate?.toISOString(), followUp: true },
    }).catch(() => {});
  }

  async sendMonthlySummary(userId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [totalReminders, completedReminders, overdueReminders, upcomingReminders, totalBills, unpaidBills] =
      await Promise.all([
        this.prisma.reminder.count({ where: { userId, deletedAt: null } }),
        this.prisma.reminder.count({
          where: { userId, deletedAt: null, status: 'completed', updatedAt: { gte: startOfMonth, lte: endOfMonth } },
        }),
        this.prisma.reminder.count({
          where: { userId, deletedAt: null, status: { not: 'completed' }, dueDate: { lt: now } },
        }),
        this.prisma.reminder.count({
          where: { userId, deletedAt: null, status: 'pending', startDate: { gte: now, lte: endOfMonth } },
        }),
        this.prisma.bill.count({ where: { userId, deletedAt: null } }),
        this.prisma.bill.count({ where: { userId, deletedAt: null, isPaid: false } }),
      ]);

    const title = 'Monthly Reminder Summary';
    const message = `${completedReminders} completed · ${overdueReminders} overdue · ${upcomingReminders} upcoming · ${unpaidBills} unpaid bills`;

    await this.notificationService.create({
      userId,
      type: 'monthly_report',
      title,
      message,
      priority: 'medium',
      category: 'summary',
      data: {
        totalReminders,
        completedReminders,
        overdueReminders,
        upcomingReminders,
        totalBills,
        unpaidBills,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
      },
    }).catch(() => {});
  }

  async getNotificationsWithFilters(
    userId: string,
    filters: {
      category?: string;
      priority?: string;
      overdue?: boolean;
      isRead?: boolean;
      limit?: number;
      offset?: number;
      type?: string;
    },
  ) {
    const where: any = { userId };
    if (filters.category) {where.category = filters.category;}
    if (filters.priority) {where.priority = filters.priority;}
    if (filters.overdue !== undefined) {where.overdue = filters.overdue;}
    if (filters.isRead !== undefined) {where.isRead = filters.isRead;}
    if (filters.type) {where.type = filters.type;}

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return { data: notifications, total, limit: filters.limit || 50, offset: filters.offset || 0 };
  }

  async getGroupedNotifications(userId: string) {
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const groups: Record<string, { label: string; notifications: typeof notifications }> = {
      overdue: { label: 'Overdue', notifications: [] },
      upcoming: { label: 'Upcoming', notifications: [] },
      paid: { label: 'Completed', notifications: [] },
      other: { label: 'Other', notifications: [] },
    };

    for (const n of notifications) {
      if (n.overdue) {
        groups.overdue.notifications.push(n);
      } else if (n.type === 'reminder_upcoming' || n.type === 'reminder') {
        groups.upcoming.notifications.push(n);
      } else if (n.type === 'goal_milestone' || n.type === 'completed') {
        groups.paid.notifications.push(n);
      } else {
        groups.other.notifications.push(n);
      }
    }

    return Object.entries(groups)
      .filter(([, g]) => g.notifications.length > 0)
      .map(([key, g]) => ({ key, ...g }));
  }

  async markAsRead(userId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async deleteNotification(userId: string, notificationId: string) {
    return this.prisma.notification.deleteMany({
      where: { id: notificationId, userId },
    });
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { count };
  }
}

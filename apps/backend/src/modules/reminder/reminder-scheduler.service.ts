import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ReminderNotificationService } from './reminder-notification.service';
import { ReminderStatus } from './interfaces';

@Injectable()
export class ReminderSchedulerService {
  private readonly logger = new Logger(ReminderSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reminderNotificationService: ReminderNotificationService,
    @InjectQueue('reminder-queue') private readonly reminderQueue: Queue,
  ) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async checkDueReminders() {
    const now = new Date();

    try {
      const dueReminders = await this.prisma.reminder.findMany({
        where: {
          status: ReminderStatus.PENDING,
          deletedAt: null,
          startDate: { lte: now },
          AND: [
            { snoozedUntil: null },
          ],
        } as any,
        take: 50,
      });

      for (const reminder of dueReminders) {
        await this.reminderQueue.add('process-due-reminder', {
          reminderId: reminder.id,
          userId: reminder.userId,
        }, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
          removeOnFail: false,
        });
      }

      if (dueReminders.length > 0) {
        this.logger.debug(`Queued ${dueReminders.length} due reminders for processing`);
      }
    } catch (error) {
      this.logger.error('Error checking due reminders', error.stack);
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async rescheduleRecurringReminders() {
    const now = new Date();

    try {
      const recurringDue = await this.prisma.recurringReminder.findMany({
        where: {
          isActive: true,
          nextTriggerAt: { lte: now },
          OR: [
            { endDate: null },
            { endDate: { gte: now } },
          ],
        } as any,
        take: 50,
        include: {
          reminder: true,
        },
      });

      for (const recurring of recurringDue) {
        if (!recurring.reminder || recurring.reminder.deletedAt) continue;

        await this.reminderQueue.add('process-recurring-reminder', {
          reminderId: recurring.reminderId,
        }, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
          removeOnFail: false,
        });

        this.logger.debug(
          `Queued recurring reminder: "${recurring.reminder.title}" (${recurring.reminderId})`,
        );
      }

      if (recurringDue.length > 0) {
        this.logger.log(`Queued ${recurringDue.length} recurring reminders for rescheduling`);
      }
    } catch (error) {
      this.logger.error('Error rescheduling recurring reminders', error.stack);
    }
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async unsnoozeReminders() {
    const now = new Date();

    try {
      const result = await this.prisma.reminder.updateMany({
        where: {
          status: ReminderStatus.SNOOZED,
          snoozedUntil: { lte: now },
          deletedAt: null,
        } as any,
        data: {
          status: ReminderStatus.PENDING,
          snoozedUntil: null,
        } as any,
      });

      if (result.count > 0) {
        this.logger.debug(`Unsnoozed ${result.count} reminders`);
      }
    } catch (error) {
      this.logger.error('Error unsnoozing reminders', error.stack);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async sendOverdueFollowUps() {
    const now = new Date();
    try {
      const overdueReminders = await this.prisma.reminder.findMany({
        where: {
          status: ReminderStatus.PENDING,
          deletedAt: null,
          dueDate: { lt: now },
          isSent: true,
        } as any,
        take: 100,
      });

      for (const reminder of overdueReminders) {
        await this.reminderNotificationService.sendOverdueFollowUp(reminder.id, reminder.userId);
      }

      if (overdueReminders.length > 0) {
        this.logger.log(`Sent ${overdueReminders.length} overdue follow-up notifications`);
      }
    } catch (error) {
      this.logger.error('Error sending overdue follow-ups', error.stack);
    }
  }

  @Cron('0 8 1 * *')
  async sendMonthlySummaries() {
    try {
      const userIds = await this.prisma.user.findMany({
        where: { isActive: true },
        select: { id: true },
      });

      for (const { id } of userIds) {
        await this.reminderNotificationService.sendMonthlySummary(id);
      }

      this.logger.log(`Sent monthly summaries to ${userIds.length} users`);
    } catch (error) {
      this.logger.error('Error sending monthly summaries', error.stack);
    }
  }
}

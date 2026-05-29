import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ReminderNotificationService } from './reminder-notification.service';

@Processor('reminder-queue')
export class ReminderProcessor extends WorkerHost {
  private readonly logger = new Logger(ReminderProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reminderNotificationService: ReminderNotificationService,
  ) {
    super();
  }

  async process(job: Job): Promise<any> {
    this.logger.log(`Processing reminder job ${job.id} of type ${job.name}`);

    switch (job.name) {
      case 'process-due-reminder':
        return this._processDueReminder(job.data.reminderId, job.data.userId);
      case 'process-recurring-reminder':
        return this._processRecurringReminder(job.data.reminderId);
      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
        return { skipped: true };
    }
  }

  private async _processDueReminder(reminderId: string, userId: string): Promise<any> {
    const reminder = await this.prisma.reminder.findFirst({
      where: { id: reminderId, userId, deletedAt: null },
      include: { recurring: true },
    });

    if (!reminder) {
      this.logger.warn(`Reminder ${reminderId} not found, skipping`);
      return { skipped: true };
    }

    this.logger.log(`Firing reminder: "${reminder.title}" (${reminderId})`);

    await this.reminderNotificationService.sendDueReminderNotification(reminderId, userId);

    return {
      fired: true,
      reminderId,
      title: reminder.title,
      type: reminder.type,
      priority: reminder.priority,
      timestamp: new Date().toISOString(),
    };
  }

  private async _processRecurringReminder(reminderId: string): Promise<any> {
    const reminder = await this.prisma.reminder.findUnique({
      where: { id: reminderId },
      include: { recurring: true },
    });

    if (!reminder) {
      this.logger.warn(`Recurring parent reminder ${reminderId} not found`);
      return { skipped: true };
    }

    if (!reminder.isRecurring || !reminder.recurring) {
      this.logger.log(`Reminder ${reminderId} is no longer recurring, skipping`);
      return { skipped: true };
    }

    this.logger.log(`Processing recurring reminder: "${reminder.title}"`);

    await this.reminderNotificationService.sendDueReminderNotification(reminderId, reminder.userId);

    return {
      processed: true,
      reminderId,
      title: reminder.title,
      frequency: reminder.recurring[0]?.frequency,
      nextTriggerAt: reminder.recurring[0]?.nextTriggerAt,
    };
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} completed successfully`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed: ${error.message}`, error.stack);
  }

  @OnWorkerEvent('active')
  onActive(job: Job) {
    this.logger.debug(`Job ${job.id} is now active`);
  }
}

import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { NotificationService } from './notification.service';

interface SendNotificationJob {
  userId: string;
  notificationId: string;
}

@Processor('notification-queue')
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private readonly notificationService: NotificationService) {
    super();
  }

  async process(job: Job<SendNotificationJob>): Promise<void> {
    this.logger.debug(
      `Processing notification job ${job.id}: ${job.data.notificationId}`,
    );

    switch (job.name) {
      case 'send-notification':
        await this.handleSendNotification(job);
        break;
      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
    }
  }

  private async handleSendNotification(job: Job<SendNotificationJob>): Promise<void> {
    const { notificationId } = job.data;

    try {
      await this.notificationService.sendScheduledNotification(notificationId);
      this.logger.log(`Scheduled notification ${notificationId} sent successfully`);
    } catch (error: any) {
      this.logger.error(
        `Failed to send scheduled notification ${notificationId}: ${error.message}`,
      );
      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`Job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `Job ${job.id} failed after ${job.attemptsMade} attempts: ${error.message}`,
    );
  }

  @OnWorkerEvent('active')
  onActive(job: Job) {
    this.logger.debug(`Job ${job.id} is now active`);
  }

  @OnWorkerEvent('stalled')
  onStalled(job: Job) {
    this.logger.warn(`Job ${job.id} has stalled`);
  }
}

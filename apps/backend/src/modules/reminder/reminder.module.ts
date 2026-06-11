import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../../common/prisma/prisma.module';
import isRedisAvailable from '../../common/redis.util';
import { NotificationModule } from '../notification/notification.module';
import { ReminderController } from './reminder.controller';
import { ReminderService } from './reminder.service';
import { ReminderProcessor } from './reminder.processor';
import { ReminderSchedulerService } from './reminder-scheduler.service';
import { ReminderNotificationService } from './reminder-notification.service';

@Module({
  imports: [
    PrismaModule,
    NotificationModule,
    ...(isRedisAvailable()
      ? [
          BullModule.registerQueue({
            name: 'reminder-queue',
          }),
        ]
      : []),
  ],
  controllers: [ReminderController],
  providers: [
    ReminderService,
    ...(isRedisAvailable() ? [ReminderProcessor] : []),
    ReminderSchedulerService,
    ReminderNotificationService,
  ],
  exports: [ReminderService, ReminderNotificationService],
})
export class ReminderModule {}

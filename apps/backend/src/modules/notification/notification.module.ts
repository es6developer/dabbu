import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../../common/prisma/prisma.module';
import isRedisAvailable from '../../common/redis.util';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationEventsService } from './notification-events.service';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { NotificationProcessor } from './notification.processor';
import { FcmService } from './fcm.service';

@Module({
  imports: [
    PrismaModule,
    ScheduleModule.forRoot(),
    ...(isRedisAvailable()
      ? (() => {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { BullModule } = require('@nestjs/bullmq');
          return [
            BullModule.registerQueue({
              name: 'notification-queue',
            }),
          ];
        })()
      : []),
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationEventsService,
    NotificationSchedulerService,
    ...(isRedisAvailable() ? [NotificationProcessor] : []),
    FcmService,
  ],
  exports: [NotificationService, NotificationEventsService, FcmService],
})
export class NotificationModule {}

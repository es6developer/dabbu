import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../../common/prisma/prisma.module';
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
    BullModule.registerQueue({
      name: 'notification-queue',
    }),
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationEventsService,
    NotificationSchedulerService,
    NotificationProcessor,
    FcmService,
  ],
  exports: [NotificationService, NotificationEventsService, FcmService],
})
export class NotificationModule {}

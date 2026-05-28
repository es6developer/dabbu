import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationProcessor } from './notification.processor';
import { FcmService } from './fcm.service';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: 'notification-queue',
    }),
  ],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationProcessor, FcmService],
  exports: [NotificationService, FcmService],
})
export class NotificationModule {}

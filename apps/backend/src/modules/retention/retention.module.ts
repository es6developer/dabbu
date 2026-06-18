import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { RetentionService } from './retention.service';
import { ReEngagementService } from './re-engagement.service';
import { RetentionController } from './retention.controller';
import { RetentionScheduler } from './retention.scheduler';
import { NotificationModule } from '../notification/notification.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [PrismaModule, NotificationModule, EmailModule],
  controllers: [RetentionController],
  providers: [RetentionService, ReEngagementService, RetentionScheduler],
  exports: [RetentionService, ReEngagementService],
})
export class RetentionModule {}

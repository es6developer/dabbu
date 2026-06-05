import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';
import { ReferralController } from './referral.controller';
import { ReferralService } from './referral.service';

@Module({
  imports: [NotificationModule],
  controllers: [ReferralController],
  providers: [ReferralService],
  exports: [ReferralService],
})
export class ReferralModule {}

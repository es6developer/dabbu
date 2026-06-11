import { Module } from '@nestjs/common';
import { CoupleController } from './couple.controller';
import { CoupleService } from './couple.service';
import { SharedFinanceModule } from '../shared-finance/shared-finance.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [SharedFinanceModule, NotificationModule],
  controllers: [CoupleController],
  providers: [CoupleService],
  exports: [CoupleService],
})
export class CoupleModule {}

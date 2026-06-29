import { Module } from '@nestjs/common';
import { CoupleController } from './couple.controller';
import { CoupleService } from './couple.service';
import { CoupleDashboardController } from './couple-dashboard.controller';
import { CoupleDashboardService } from './couple-dashboard.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [NotificationModule],
  controllers: [CoupleController, CoupleDashboardController],
  providers: [CoupleService, CoupleDashboardService],
  exports: [CoupleService, CoupleDashboardService],
})
export class CoupleModule {}

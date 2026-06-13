import { Module } from '@nestjs/common';
import { CoupleController } from './couple.controller';
import { CoupleService } from './couple.service';
import { CouplePlannerService } from './couple-planner.service';
import { CoupleTimelineService } from './couple-timeline.service';
import { CoupleGamificationService } from './couple-gamification.service';
import { CoupleDashboardService } from './couple-dashboard.service';
import { SharedFinanceModule } from '../shared-finance/shared-finance.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [SharedFinanceModule, NotificationModule],
  controllers: [CoupleController],
  providers: [
    CoupleService,
    CouplePlannerService,
    CoupleTimelineService,
    CoupleGamificationService,
    CoupleDashboardService,
  ],
  exports: [CoupleService, CoupleTimelineService, CoupleGamificationService],
})
export class CoupleModule {}

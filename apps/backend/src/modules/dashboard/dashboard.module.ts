import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { CacheModule } from '../../common/cache/cache.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { PersonalDashboardService } from './personal-dashboard.service';
import { CoupleDashboardService } from './couple-dashboard.service';
import { FamilyDashboardService } from './family-dashboard.service';

@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [DashboardController],
  providers: [
    DashboardService,
    PersonalDashboardService,
    CoupleDashboardService,
    FamilyDashboardService,
  ],
  exports: [DashboardService, PersonalDashboardService, CoupleDashboardService, FamilyDashboardService],
})
export class DashboardModule {}

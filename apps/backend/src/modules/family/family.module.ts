import { Module } from '@nestjs/common';
import { FamilyController } from './family.controller';
import { FamilyService } from './family.service';
import { FamilyDashboardController } from './family-dashboard.controller';
import { FamilyDashboardService } from './family-dashboard.service';
import { FamilyWorkspaceController } from './family-workspace.controller';
import { FamilyWorkspaceService } from './family-workspace.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { CoupleModule } from '../couple/couple.module';

@Module({
  imports: [PrismaModule, NotificationModule, DashboardModule, CoupleModule],
  controllers: [FamilyController, FamilyDashboardController, FamilyWorkspaceController],
  providers: [FamilyService, FamilyDashboardService, FamilyWorkspaceService],
  exports: [FamilyService, FamilyDashboardService, FamilyWorkspaceService],
})
export class FamilyModule {}

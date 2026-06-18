import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { ComplianceController } from './compliance.controller';
import { ComplianceService } from './compliance.service';
import { NotificationModule } from '../notification/notification.module';
import { ReportsModule } from '../reports/reports.module';

@Module({
  imports: [PrismaModule, NotificationModule, ReportsModule],
  controllers: [ComplianceController],
  providers: [ComplianceService],
  exports: [ComplianceService],
})
export class ComplianceModule {}

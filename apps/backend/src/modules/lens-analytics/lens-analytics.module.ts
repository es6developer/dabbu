import { Module } from '@nestjs/common';
import { LensAnalyticsService } from './lens-analytics.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [LensAnalyticsService],
  exports: [LensAnalyticsService],
})
export class LensAnalyticsModule {}

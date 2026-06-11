import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import isRedisAvailable from '../../common/redis.util';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportsProcessor } from './reports.processor';
import { PremiumModule } from '../premium/premium.module';

@Module({
  imports: [
    PremiumModule,
    ...(isRedisAvailable()
      ? [
          BullModule.registerQueue({
            name: 'report-queue',
          }),
        ]
      : []),
  ],
  controllers: [ReportsController],
  providers: [ReportsService, ...(isRedisAvailable() ? [ReportsProcessor] : [])],
  exports: [ReportsService],
})
export class ReportsModule {}

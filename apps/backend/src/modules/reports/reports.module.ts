import { Module } from '@nestjs/common';
import isRedisAvailable from '../../common/redis.util';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportsProcessor } from './reports.processor';
import { PremiumModule } from '../premium/premium.module';

@Module({
  imports: [
    PremiumModule,
    ...(isRedisAvailable()
      ? (() => {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { BullModule } = require('@nestjs/bullmq');
          return [
            BullModule.registerQueue({
              name: 'report-queue',
            }),
          ];
        })()
      : []),
  ],
  controllers: [ReportsController],
  providers: [ReportsService, ...(isRedisAvailable() ? [ReportsProcessor] : [])],
  exports: [ReportsService],
})
export class ReportsModule {}

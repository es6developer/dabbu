import { Module } from '@nestjs/common';
import { ForecastController } from './forecast.controller';
import { ForecastService } from './forecast.service';
import { ForecastRepository } from './forecast.repository';
import { PremiumModule } from '../premium/premium.module';

@Module({
  imports: [PremiumModule],
  controllers: [ForecastController],
  providers: [ForecastService, ForecastRepository],
  exports: [ForecastService],
})
export class ForecastModule {}

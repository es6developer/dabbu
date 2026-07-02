import { Module } from '@nestjs/common';
import { LifeHubController } from './life-hub.controller';
import { LifeHubService } from './life-hub.service';
import { PremiumModule } from '../premium/premium.module';

@Module({
  imports: [PremiumModule],
  controllers: [LifeHubController],
  providers: [LifeHubService],
  exports: [LifeHubService],
})
export class LifeHubModule {}

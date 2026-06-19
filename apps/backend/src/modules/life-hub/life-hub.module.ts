import { Module } from '@nestjs/common';
import { LifeHubController } from './life-hub.controller';
import { LifeHubService } from './life-hub.service';

@Module({
  controllers: [LifeHubController],
  providers: [LifeHubService],
  exports: [LifeHubService],
})
export class LifeHubModule {}

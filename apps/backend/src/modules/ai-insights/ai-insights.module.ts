import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AiInsightsController } from './ai-insights.controller';
import { AiInsightsService } from './ai-insights.service';

@Module({
  imports: [PrismaModule],
  controllers: [AiInsightsController],
  providers: [AiInsightsService],
  exports: [AiInsightsService],
})
export class AiInsightsModule {}

import { Module } from '@nestjs/common';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { AccountInsightEngine } from './engine/account-insight.engine';
import { FinancialHealthEngine } from './engine/financial-health.engine';
import { SmartInsightsEngine } from './engine/smart-insights.engine';
import { SubscriptionIntelligenceEngine } from './engine/subscription-intelligence.engine';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [PrismaModule, AiModule],
  controllers: [AccountsController],
  providers: [
    AccountsService,
    AccountInsightEngine,
    FinancialHealthEngine,
    SmartInsightsEngine,
    SubscriptionIntelligenceEngine,
  ],
  exports: [
    AccountsService,
    AccountInsightEngine,
    FinancialHealthEngine,
    SmartInsightsEngine,
    SubscriptionIntelligenceEngine,
  ],
})
export class AccountsModule {}

import { Module } from '@nestjs/common';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { AccountInsightEngine } from './engine/account-insight.engine';
import { FinancialHealthEngine } from './engine/financial-health.engine';
import { SmartInsightsEngine } from './engine/smart-insights.engine';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AccountsController],
  providers: [AccountsService, AccountInsightEngine, FinancialHealthEngine, SmartInsightsEngine],
  exports: [AccountsService, AccountInsightEngine, FinancialHealthEngine, SmartInsightsEngine],
})
export class AccountsModule {}

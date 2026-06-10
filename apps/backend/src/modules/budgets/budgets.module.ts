import { Module } from '@nestjs/common';
import { BudgetsController } from './budgets.controller';
import { BudgetsService } from './budgets.service';
import { BudgetsRepository } from './budgets.repository';
import { BudgetSchedulerService } from './budget-scheduler.service';

@Module({
  controllers: [BudgetsController],
  providers: [BudgetsService, BudgetsRepository, BudgetSchedulerService],
  exports: [BudgetsService],
})
export class BudgetsModule {}

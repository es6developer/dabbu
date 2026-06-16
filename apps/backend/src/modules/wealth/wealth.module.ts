import { Module } from '@nestjs/common';
import { WealthController } from './wealth.controller';
import { WealthService } from './wealth.service';
import { AiModule } from '../ai/ai.module';
import { GamificationModule } from '../gamification/gamification.module';
import { NetWorthModule } from '../net-worth/net-worth.module';
import { GoalsModule } from '../goals/goals.module';
import { LoansModule } from '../loans/loans.module';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [AiModule, GamificationModule, NetWorthModule, GoalsModule, LoansModule, PrismaModule],
  controllers: [WealthController],
  providers: [WealthService],
  exports: [WealthService],
})
export class WealthModule {}

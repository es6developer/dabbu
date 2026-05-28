import { Module } from '@nestjs/common';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { AccountInsightEngine } from './engine/account-insight.engine';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AccountsController],
  providers: [AccountsService, AccountInsightEngine],
  exports: [AccountsService, AccountInsightEngine],
})
export class AccountsModule {}

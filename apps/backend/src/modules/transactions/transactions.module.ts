import { Module } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { BillScannerService } from './services/bill-scanner.service';
import { RecurringSchedulerService } from './services/recurring-scheduler.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [TransactionsController],
  providers: [TransactionsService, BillScannerService, RecurringSchedulerService],
  exports: [TransactionsService, BillScannerService],
})
export class TransactionsModule {}

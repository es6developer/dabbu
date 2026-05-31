import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { ExpenseGroupsController } from './expense-groups.controller';
import { ExpenseGroupsService } from './expense-groups.service';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [ExpenseGroupsController],
  providers: [ExpenseGroupsService],
  exports: [ExpenseGroupsService],
})
export class ExpenseGroupsModule {}

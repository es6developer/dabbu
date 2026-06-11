import { Module } from '@nestjs/common';
import { BillRemindersController } from './bill-reminders.controller';
import { BillRemindersService } from './bill-reminders.service';

@Module({
  controllers: [BillRemindersController],
  providers: [BillRemindersService],
  exports: [BillRemindersService],
})
export class BillRemindersModule {}

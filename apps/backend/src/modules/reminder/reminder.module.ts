import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { ReminderController } from './reminder.controller';
import { ReminderService } from './reminder.service';
import { ReminderProcessor } from './reminder.processor';
import { ReminderSchedulerService } from './reminder-scheduler.service';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: 'reminder-queue',
    }),
  ],
  controllers: [ReminderController],
  providers: [ReminderService, ReminderProcessor, ReminderSchedulerService],
  exports: [ReminderService],
})
export class ReminderModule {}

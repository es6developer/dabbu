import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { PremiumModule } from '../premium/premium.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiJobsService } from './ai-jobs.service';
import aiConfig from './ai.config';

@Module({
  imports: [
    ConfigModule.forFeature(aiConfig),
    PrismaModule,
    ScheduleModule.forRoot(),
    PremiumModule,
  ],
  controllers: [AiController],
  providers: [AiService, AiJobsService],
  exports: [AiService],
})
export class AiModule {}

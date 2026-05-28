import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { SmsDetectionController } from './sms-detection.controller';
import { SmsDetectionService } from './sms-detection.service';
import { NlpEngine } from './engines/nlp-engine';
import { HeuristicEngine } from './engines/heuristic-engine';

@Module({
  imports: [PrismaModule],
  controllers: [SmsDetectionController],
  providers: [SmsDetectionService, NlpEngine, HeuristicEngine],
  exports: [SmsDetectionService],
})
export class SmsDetectionModule {}

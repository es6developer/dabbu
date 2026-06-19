import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DabbuScoreController } from './dabbu-score.controller';
import { DabbuScoreService } from './dabbu-score.service';

@Module({
  controllers: [DabbuScoreController],
  providers: [DabbuScoreService, PrismaService],
  exports: [DabbuScoreService],
})
export class DabbuScoreModule {}

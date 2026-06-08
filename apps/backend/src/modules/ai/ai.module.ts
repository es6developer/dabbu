import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import aiConfig from './ai.config';

@Module({
  imports: [ConfigModule.forFeature(aiConfig), PrismaModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}

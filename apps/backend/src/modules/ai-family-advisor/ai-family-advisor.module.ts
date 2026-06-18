import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AiFamilyAdvisorController } from './ai-family-advisor.controller';
import { AiFamilyAdvisorService } from './ai-family-advisor.service';

@Module({
  imports: [PrismaModule],
  controllers: [AiFamilyAdvisorController],
  providers: [AiFamilyAdvisorService],
  exports: [AiFamilyAdvisorService],
})
export class AiFamilyAdvisorModule {}

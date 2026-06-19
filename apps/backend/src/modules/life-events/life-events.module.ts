import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { LifeEventsController } from './life-events.controller';
import { LifeEventsService } from './life-events.service';

@Module({
  imports: [PrismaModule],
  controllers: [LifeEventsController],
  providers: [LifeEventsService],
  exports: [LifeEventsService],
})
export class LifeEventsModule {}

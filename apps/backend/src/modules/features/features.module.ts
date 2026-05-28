import { Module } from '@nestjs/common';
import { FeaturesController } from './features.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FeaturesController],
})
export class FeaturesModule {}

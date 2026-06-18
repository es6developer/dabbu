import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { FamilySpaceController } from './family-space.controller';
import { FamilySpaceService } from './family-space.service';

@Module({
  imports: [PrismaModule],
  controllers: [FamilySpaceController],
  providers: [FamilySpaceService],
  exports: [FamilySpaceService],
})
export class FamilySpaceModule {}

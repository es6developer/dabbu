import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LensDataService } from './lens-data.service';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [LensDataService],
  exports: [LensDataService],
})
export class LensDataModule {}

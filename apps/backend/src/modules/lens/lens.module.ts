import { Module } from '@nestjs/common';
import { LensController } from './lens.controller';
import { LensService } from './lens.service';
import { LensGuard } from './lens.guard';
import { LensValidator } from './lens.validator';
import { LensCacheService } from './cache/lens-cache.service';
import { DashboardModule } from '../dashboard/dashboard.module';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { CacheModule } from '../../common/cache/cache.module';

@Module({
  imports: [PrismaModule, CacheModule, DashboardModule],
  controllers: [LensController],
  providers: [
    LensService,
    LensGuard,
    LensValidator,
    LensCacheService,
  ],
  exports: [
    LensService,
    LensGuard,
    LensValidator,
    LensCacheService,
  ],
})
export class LensModule {}

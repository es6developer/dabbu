import { Module } from '@nestjs/common';
import { LensPreferencesService } from './lens-preferences.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [LensPreferencesService],
  exports: [LensPreferencesService],
})
export class LensPreferencesModule {}

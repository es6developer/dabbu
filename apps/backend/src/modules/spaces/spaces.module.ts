import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { SpacesController } from './spaces.controller';
import { SpacesService } from './spaces.service';
import { SpacesMigrationService } from './spaces-migration.service';
import { SharedFinanceModule } from '../shared-finance/shared-finance.module';

@Module({
  imports: [PrismaModule, SharedFinanceModule],
  controllers: [SpacesController],
  providers: [SpacesService, SpacesMigrationService],
  exports: [SpacesService, SpacesMigrationService],
})
export class SpacesModule {}

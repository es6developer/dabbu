import { Module } from '@nestjs/common';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';
import { PrismaService } from '../../common/prisma/prisma.service';

@Module({
  controllers: [StorageController],
  providers: [StorageService, PrismaService],
  exports: [StorageService],
})
export class StorageModule {}

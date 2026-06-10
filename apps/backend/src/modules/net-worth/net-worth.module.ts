import { Module } from '@nestjs/common';
import { NetWorthController } from './net-worth.controller';
import { NetWorthService } from './net-worth.service';
import { NetWorthRepository } from './net-worth.repository';

@Module({
  controllers: [NetWorthController],
  providers: [NetWorthService, NetWorthRepository],
  exports: [NetWorthService],
})
export class NetWorthModule {}

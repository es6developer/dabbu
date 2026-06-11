import { Module } from '@nestjs/common';
import { LoansController } from './loans.controller';
import { LoansService } from './loans.service';
import { LoansRepository } from './loans.repository';

@Module({
  controllers: [LoansController],
  providers: [LoansService, LoansRepository],
  exports: [LoansService],
})
export class LoansModule {}

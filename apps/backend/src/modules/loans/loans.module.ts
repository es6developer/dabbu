import { Module } from '@nestjs/common';
import { LoansController } from './loans.controller';
import { LoansService } from './loans.service';
import { LoansRepository } from './loans.repository';
import { PremiumModule } from '../premium/premium.module';

@Module({
  imports: [PremiumModule],
  controllers: [LoansController],
  providers: [LoansService, LoansRepository],
  exports: [LoansService, LoansRepository],
})
export class LoansModule {}

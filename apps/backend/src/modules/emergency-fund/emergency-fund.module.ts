import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { EmergencyFundController } from './emergency-fund.controller';
import { EmergencyFundService } from './emergency-fund.service';

@Module({
  imports: [PrismaModule],
  controllers: [EmergencyFundController],
  providers: [EmergencyFundService],
  exports: [EmergencyFundService],
})
export class EmergencyFundModule {}

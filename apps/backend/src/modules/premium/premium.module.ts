import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { PremiumController } from './premium.controller';
import { PremiumService } from './premium.service';
import { RazorpayService } from './razorpay.service';
import { PremiumWebhookService } from './premium-webhook.service';
import { PremiumGuard } from './guards/premium.guard';

@Module({
  imports: [PrismaModule],
  controllers: [PremiumController],
  providers: [PremiumService, RazorpayService, PremiumWebhookService, PremiumGuard],
  exports: [PremiumService, PremiumGuard],
})
export class PremiumModule {}

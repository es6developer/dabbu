import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { PremiumController } from './premium.controller';
import { SubscriptionController } from './subscription.controller';
import { PremiumService } from './premium.service';
import { RazorpayService } from './razorpay.service';
import { PremiumWebhookService } from './premium-webhook.service';
import { PremiumGuard } from './guards/premium.guard';
import { FeatureGuard } from './guards/feature.guard';
import { EntitlementEngine } from './entitlement.engine';
import { UsageEngine } from './usage.engine';

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [PremiumController, SubscriptionController],
  providers: [
    PremiumService,
    RazorpayService,
    PremiumWebhookService,
    PremiumGuard,
    FeatureGuard,
    EntitlementEngine,
    UsageEngine,
  ],
  exports: [
    PremiumService,
    PremiumGuard,
    FeatureGuard,
    RazorpayService,
    EntitlementEngine,
    UsageEngine,
  ],
})
export class PremiumModule {}

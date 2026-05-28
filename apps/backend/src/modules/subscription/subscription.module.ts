import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { SubscriptionWebhookService } from './subscription-webhook.service';
import { RazorpayService } from './razorpay.service';
import { SubscriptionProcessor } from './subscription.processor';
import { SubscriptionSchedulerService } from './subscription-scheduler.service';
import { PremiumGuard } from './guards/premium.guard';
import { FeatureAccessGuard } from './guards/feature-access.guard';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: 'subscription-queue',
    }),
  ],
  controllers: [SubscriptionController],
  providers: [
    SubscriptionService,
    SubscriptionWebhookService,
    RazorpayService,
    SubscriptionProcessor,
    SubscriptionSchedulerService,
    PremiumGuard,
    FeatureAccessGuard,
  ],
  exports: [
    SubscriptionService,
    RazorpayService,
    PremiumGuard,
    FeatureAccessGuard,
  ],
})
export class SubscriptionModule {}

import { Controller, Get, Post, Body, UseGuards, Req, Headers } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PremiumService } from './premium.service';
import { RazorpayService } from './razorpay.service';
import { PremiumWebhookService } from './premium-webhook.service';
import { PrismaService } from '../../common/prisma/prisma.service';

@ApiTags('Premium')
@Controller('premium')
export class PremiumController {
  constructor(
    private premiumService: PremiumService,
    private razorpayService: RazorpayService,
    private webhookService: PremiumWebhookService,
    private prisma: PrismaService,
  ) {}

  @Get('plans')
  @ApiOperation({ summary: 'Get all active subscription plans' })
  async getPlans() {
    return this.premiumService.getPlans();
  }

  @Get('current')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user subscription' })
  async getCurrentSubscription(@Req() req: any) {
    const userId = req.user.id;
    return this.premiumService.getCurrentSubscription(userId);
  }

  @Post('subscribe')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create subscription for a plan' })
  async createSubscription(@Req() req: any, @Body('planCode') planCode: string) {
    const userId = req.user.id;

    // 1. Ensure Razorpay plan exists (creates via API if needed)
    const razorpayPlanId = await this.premiumService.ensureRazorpayPlan(planCode);

    // 2. Create local subscription with 'incomplete' status (payment pending)
    const sub = await this.premiumService.createSubscription(userId, planCode, 'incomplete');

    // 3. Get plan details for total_count calculation
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: sub.planId } });
    const intervalMonths: Record<string, number> = {
      monthly: 1,
      quarterly: 3,
      halfyearly: 6,
      yearly: 12,
    };
    const monthsPerCycle = intervalMonths[plan?.interval || 'monthly'] || 1;
    const maxSafeCycles = Math.floor(((2100 - new Date().getFullYear()) * 12) / monthsPerCycle);
    const totalCount = Math.min(maxSafeCycles, 120);

    // 4. Create Razorpay subscription with auto-pay (no addon — avoids double-charging first payment)
    const razorpaySub = await this.razorpayService.createSubscription({
      planId: razorpayPlanId,
      totalCount,
      customerEmail: req.user.email,
      customerContact: req.user.phone,
      notes: { userId, subscriptionId: sub.id, planCode },
    });

    // 6. Store Razorpay subscription ID on local subscription
    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: { razorpaySubscriptionId: razorpaySub.id },
    });
    (sub as any).razorpaySubscriptionId = razorpaySub.id;

    // 7. Return checkout URL for user to authorize auto-debit
    const checkoutUrl = `https://api.razorpay.com/v1/subscriptions/${razorpaySub.id}/checkout`;

    return { ...sub, checkoutUrl };
  }

  @Post('cancel')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel current subscription' })
  async cancelSubscription(@Req() req: any) {
    const userId = req.user.id;
    return this.premiumService.cancelSubscription(userId);
  }

  @Get('billing')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get billing history' })
  async getBillingHistory(@Req() req: any) {
    const userId = req.user.id;
    return this.premiumService.getBillingHistory(userId);
  }

  @Get('check')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if user has active premium' })
  async checkPremium(@Req() req: any) {
    const userId = req.user.id;
    const isPremium = await this.premiumService.isPremium(userId);
    return { isPremium };
  }

  @Post('webhook/razorpay')
  @ApiOperation({ summary: 'Razorpay webhook endpoint' })
  async handleWebhook(@Body() body: any, @Headers('x-razorpay-signature') signature: string) {
    const rawBody = JSON.stringify(body);
    return this.webhookService.handleRazorpayWebhook(rawBody, signature);
  }
}

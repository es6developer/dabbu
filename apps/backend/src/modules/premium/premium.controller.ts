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
    const sub = await this.premiumService.createSubscription(userId, planCode);
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: sub.planId } });
    if (plan?.razorpayPlanId) {
      try {
        const razorpaySub = await this.razorpayService.createSubscription({
          planId: plan.razorpayPlanId,
          totalCount: 1,
          customerEmail: req.user.email,
          notes: { userId, subscriptionId: sub.id },
        });
        await this.prisma.subscription.update({
          where: { id: sub.id },
          data: { razorpaySubscriptionId: razorpaySub.id, razorpayOrderId: razorpaySub.order_id },
        });
        (sub as any).razorpaySubscriptionId = razorpaySub.id;
        (sub as any).razorpayOrderId = razorpaySub.order_id;
      } catch {
        /* noop */
      }
    }
    return sub;
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

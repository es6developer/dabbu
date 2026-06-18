import { Controller, Get, Post, Body, UseGuards, Req, Headers, Param, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PremiumService } from './premium.service';
import { RazorpayService } from './razorpay.service';
import { PremiumWebhookService } from './premium-webhook.service';
import { PremiumGuard } from './guards/premium.guard';
import { RequiresPremium } from './guards/requires-premium.decorator';
import {
  CreateSubscriptionDto,
  ChangePlanDto,
  CancelSubscriptionDto,
  ReactivateSubscriptionDto,
  SubscriptionAnalyticsEventDto,
  ValidateCouponDto,
  CancellationRecoveryDto,
  PaginationDto,
} from './dto/premium.dto';

@ApiTags('Premium')
@Controller('premium')
export class PremiumController {
  constructor(
    private premiumService: PremiumService,
    private razorpayService: RazorpayService,
    private webhookService: PremiumWebhookService,
  ) {}

  @Get('plans')
  @ApiOperation({ summary: 'Get all active subscription plans' })
  async getPlans() {
    return this.premiumService.getPlans();
  }

  @Get('plans/:code')
  @ApiOperation({ summary: 'Get plan by code' })
  async getPlanByCode(@Param('code') code: string) {
    return this.premiumService.getPlanByCode(code);
  }

  @Get('features')
  @ApiOperation({ summary: 'Get feature registry' })
  async getFeatures() {
    return this.premiumService.getFeatures();
  }

  @Post('preview')
  @ApiOperation({ summary: 'Preview what features a plan would grant' })
  async previewChange(@Body('planCode') planCode: string) {
    return this.premiumService.getFeatureComparison();
  }

  @Get('current')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user subscription with usage and entitlements' })
  async getCurrentSubscription(@Req() req: any) {
    return this.premiumService.getCurrentSubscription(req.user.id);
  }

  @Post('subscribe')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create subscription for a plan with Razorpay checkout' })
  async createSubscription(@Req() req: any, @Body() dto: CreateSubscriptionDto) {
    return this.premiumService.subscribe(req.user.id, dto.planCode, dto.couponCode);
  }

  @Post('change-plan')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change current plan (upgrade or downgrade)' })
  async changePlan(@Req() req: any, @Body() dto: ChangePlanDto) {
    return this.premiumService.changePlan(req.user.id, dto.newPlanCode);
  }

  @Post('cancel')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel subscription with reason' })
  async cancelSubscription(@Req() req: any, @Body() dto: CancelSubscriptionDto) {
    return this.premiumService.cancel(req.user.id, dto.reason, dto.reasonCode);
  }

  @Post('reactivate')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reactivate cancelled subscription' })
  async reactivateSubscription(@Req() req: any, @Body() dto: ReactivateSubscriptionDto) {
    return this.premiumService.resume(req.user.id);
  }

  @Post('pause')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pause active subscription' })
  async pauseSubscription(@Req() req: any) {
    return this.premiumService.pauseSubscription(req.user.id);
  }

  @Post('restore')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Restore purchase from Razorpay or App Store' })
  async restorePurchase(@Req() req: any) {
    return this.premiumService.restorePurchase(req.user.id);
  }

  @Post('resume')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resume paused subscription' })
  async resumeSubscription(@Req() req: any) {
    return this.premiumService.resume(req.user.id);
  }

  @Post('retry-payment')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retry failed payment' })
  async retryPayment(@Req() req: any) {
    return this.premiumService.retryPayment(req.user.id);
  }

  @Get('billing')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get billing history (paginated)' })
  async getBillingHistory(@Req() req: any, @Query() query: PaginationDto) {
    return this.premiumService.getPaymentHistory(req.user.id, query.page || 1, query.limit || 10);
  }

  @Get('usage')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current usage statistics' })
  async getUsage(@Req() req: any) {
    return this.premiumService.getUsage(req.user.id);
  }

  @Get('entitlements')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user entitlements with granted features and limits' })
  async getEntitlements(@Req() req: any) {
    return this.premiumService.getUserEntitlements(req.user.id);
  }

  @Get('limits/:featureKey')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check usage limit for a specific feature' })
  async checkLimit(@Req() req: any, @Param('featureKey') featureKey: string) {
    return this.premiumService.checkLimit(req.user.id, featureKey);
  }

  @Get('check')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if user has active premium' })
  async checkPremium(@Req() req: any) {
    const isPremium = await this.premiumService.isPremium(req.user.id);
    return { isPremium };
  }

  @Post('validate-coupon')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Validate a coupon code' })
  async validateCoupon(@Req() req: any, @Body() dto: ValidateCouponDto) {
    return this.premiumService.applyCoupon(dto.code, dto.planCode);
  }

  @Post('track-event')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Track subscription analytics event' })
  async trackEvent(@Req() req: any, @Body() dto: SubscriptionAnalyticsEventDto) {
    await this.premiumService.trackEvent(req.user.id, dto.event, dto.properties);
    return { success: true };
  }

  @Get('subscription-center')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get full subscription dashboard data' })
  async getSubscriptionCenter(@Req() req: any) {
    return this.premiumService.getSubscriptionCenter(req.user.id);
  }

  @Get('invoices')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get invoice history' })
  async getInvoices(@Req() req: any, @Query() query: PaginationDto) {
    return this.premiumService.getInvoiceHistory(req.user.id, query.page || 1, query.limit || 10);
  }

  @Post('cancellation/recovery')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit cancellation recovery response' })
  async submitCancellationRecovery(@Req() req: any, @Body() dto: CancellationRecoveryDto) {
    return this.premiumService.submitCancellationRecovery(req.user.id, dto.reason, dto.reasonText);
  }

  @Get('cancellation/offer')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get cancellation recovery offer' })
  async getCancellationOffer(@Req() req: any) {
    return this.premiumService.getCancellationOffer(req.user.id);
  }

  @Post('cancellation/accept')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Accept recovery offer' })
  async acceptRecoveryOffer(@Req() req: any) {
    return this.premiumService.acceptRecoveryOffer(req.user.id);
  }

  @Post('webhook/razorpay')
  @ApiOperation({ summary: 'Razorpay webhook endpoint' })
  async handleWebhook(@Body() body: any, @Headers('x-razorpay-signature') signature: string) {
    const rawBody = JSON.stringify(body);
    return this.webhookService.handleRazorpayWebhook(rawBody, signature);
  }

  @Post('verify')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify subscription payment by checking Razorpay directly' })
  async verifyPayment(@Req() req: any) {
    const userId = req.user.id;
    const sub = await this.premiumService.getCurrentSubscription(userId);
    if (!sub || !sub.razorpaySubscriptionId) {
      return { verified: false, message: 'No pending subscription' };
    }
    if (sub.status === 'active') {
      return { verified: true, message: 'Already active' };
    }
    const rzpSub = await this.razorpayService.fetchSubscription(sub.razorpaySubscriptionId);
    if (!rzpSub) {
      return { verified: false, message: 'Could not fetch subscription from Razorpay' };
    }
    if (rzpSub.status === 'active' || rzpSub.status === 'authenticated' || rzpSub.status === 'completed') {
      await this.premiumService.handleSubscriptionActivated(sub.razorpaySubscriptionId, rzpSub);
      return { verified: true, message: 'Subscription activated' };
    }
    return { verified: false, message: `Razorpay status: ${rzpSub.status}` };
  }

  @UseGuards(AuthGuard('jwt'), PremiumGuard)
  @RequiresPremium('premium_access')
  @Get('protected')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Protected endpoint for premium users' })
  async protectedRoute() {
    return { message: 'You have premium access' };
  }
}

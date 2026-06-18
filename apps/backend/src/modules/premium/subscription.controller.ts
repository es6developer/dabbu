import { Controller, Get, Post, Body, UseGuards, Req, Param, Query, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PremiumService } from './premium.service';
import { EntitlementEngine } from './entitlement.engine';
import { UsageEngine } from './usage.engine';
import { RazorpayService } from './razorpay.service';

@ApiTags('Subscription')
@Controller('subscription')
export class SubscriptionController {
  constructor(
    private premiumService: PremiumService,
    private entitlementEngine: EntitlementEngine,
    private usageEngine: UsageEngine,
    private razorpayService: RazorpayService,
  ) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current subscription with usage and entitlements' })
  async getSubscription(@Req() req: any) {
    return this.premiumService.getCurrentSubscription(req.user.id);
  }

  @Get('usage')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get usage statistics with remaining limits' })
  async getUsage(@Req() req: any) {
    const sub = await this.premiumService.getCurrentSubscription(req.user.id);
    const planCode = sub?.plan?.code || 'FREE';
    return this.usageEngine.getRemainingUsage(this.premiumService['prisma'], req.user.id, planCode);
  }

  @Get('features')
  @ApiOperation({ summary: 'Get feature comparison across all plans' })
  async getFeatures() {
    const plans = await this.premiumService.getPlans();
    const comparison = this.entitlementEngine.getFeatureComparison();
    const planFeatures = plans.map((plan: any) => ({
      code: plan.code,
      name: plan.name,
      price: plan.price,
      interval: plan.interval,
      features: this.entitlementEngine.getGrantedFeatures(plan.code),
    }));
    return { comparison, plans: planFeatures };
  }

  @Get('paywall')
  @ApiOperation({ summary: 'Get paywall data (plans, features, comparison)' })
  async getPaywall() {
    const plans = await this.premiumService.getPlans();
    const comparison = this.entitlementEngine.getFeatureComparison();
    const planFeatures = plans.map((plan: any) => ({
      code: plan.code,
      name: plan.name,
      price: plan.price,
      interval: plan.interval,
      features: this.entitlementEngine.getGrantedFeatures(plan.code),
    }));
    const limits = plans.map((plan: any) => ({
      code: plan.code,
      limits: this.usageEngine.getLimitsForPlan(plan.code),
    }));
    return { plans: planFeatures, comparison, limits };
  }

  @Get('invoices')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get paginated invoices' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getInvoices(@Req() req: any, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.premiumService.getPaymentHistory(
      req.user.id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Post('checkout')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create checkout session for a plan' })
  async createCheckout(
    @Req() req: any,
    @Body('planCode') planCode: string,
    @Body('couponCode') couponCode?: string,
  ) {
    return this.premiumService.subscribe(req.user.id, planCode, couponCode);
  }

  @Post('upgrade')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upgrade to a higher-tier plan' })
  async upgradePlan(@Req() req: any, @Body('planCode') planCode: string) {
    return this.premiumService.changePlan(req.user.id, planCode);
  }

  @Post('downgrade')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Downgrade to a lower-tier plan' })
  async downgradePlan(@Req() req: any, @Body('planCode') planCode: string) {
    return this.premiumService.changePlan(req.user.id, planCode);
  }

  @Post('cancel')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel subscription with reason' })
  async cancelSubscription(
    @Req() req: any,
    @Body('reason') reason?: string,
    @Body('reasonCode') reasonCode?: string,
  ) {
    return this.premiumService.cancelSubscription(req.user.id, reason, reasonCode);
  }

  @Post('resume')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resume a paused/cancelled subscription' })
  async resumeSubscription(@Req() req: any) {
    return this.premiumService.resumeSubscription(req.user.id);
  }

  @Post('restore')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Restore previously purchased subscription' })
  async restorePurchase(@Req() req: any) {
    return this.premiumService.restorePurchase(req.user.id);
  }

  @Post('validate-feature')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Validate if a feature is accessible, accounting for usage limits' })
  async validateFeature(@Req() req: any, @Body('featureKey') featureKey: string) {
    return this.premiumService.validateFeature(req.user.id, featureKey);
  }

  @Get('admin/analytics')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin subscription analytics dashboard' })
  async getAdminAnalytics(@Req() req: any) {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      throw new ForbiddenException('Admin access required');
    }
    return this.premiumService.getDashboardData();
  }
}

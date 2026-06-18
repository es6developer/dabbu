import { Controller, Get, Post, Body, UseGuards, Req, Query, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PremiumService } from './premium.service';
import { EntitlementEngine } from './entitlement.engine';
import { UsageEngine } from './usage.engine';
import {
  CheckoutDto,
  UpgradePlanDto,
  DowngradePlanDto,
  CancelSubscriptionDto,
  ValidateFeatureDto,
  PaginationDto,
} from './dto/premium.dto';

@ApiTags('Subscription')
@Controller('subscription')
export class SubscriptionController {
  constructor(
    private premiumService: PremiumService,
    private entitlementEngine: EntitlementEngine,
    private usageEngine: UsageEngine,
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
    return this.premiumService.getUsage(req.user.id);
  }

  @Get('features')
  @ApiOperation({ summary: 'Get feature comparison across all plans' })
  async getFeatures() {
    return this.premiumService.getFeatureComparison();
  }

  @Get('invoices')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get paginated invoices' })
  async getInvoices(@Req() req: any, @Query() query: PaginationDto) {
    return this.premiumService.getInvoiceHistory(
      req.user.id,
      query.page || 1,
      query.limit || 10,
    );
  }

  @Get('paywall')
  @ApiOperation({ summary: 'Get paywall data (plans, features, comparison, limits)' })
  async getPaywall() {
    return this.premiumService.getPaywall();
  }

  @Post('checkout')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create checkout session for a plan' })
  async createCheckout(@Req() req: any, @Body() dto: CheckoutDto) {
    return this.premiumService.subscribe(req.user.id, dto.planCode, dto.couponCode);
  }

  @Post('upgrade')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upgrade to a higher-tier plan' })
  async upgradePlan(@Req() req: any, @Body() dto: UpgradePlanDto) {
    return this.premiumService.upgrade(req.user.id, dto.planCode);
  }

  @Post('downgrade')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Downgrade to a lower-tier plan' })
  async downgradePlan(@Req() req: any, @Body() dto: DowngradePlanDto) {
    return this.premiumService.downgrade(req.user.id, dto.planCode);
  }

  @Post('cancel')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel subscription with reason' })
  async cancelSubscription(@Req() req: any, @Body() dto: CancelSubscriptionDto) {
    return this.premiumService.cancel(req.user.id, dto.reason, dto.reasonCode);
  }

  @Post('resume')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resume a paused/cancelled subscription' })
  async resumeSubscription(@Req() req: any) {
    return this.premiumService.resume(req.user.id);
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
  async validateFeature(@Req() req: any, @Body() dto: ValidateFeatureDto) {
    return this.premiumService.validateFeature(req.user.id, dto.featureKey);
  }

  @Get('admin/analytics')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin subscription analytics dashboard' })
  async getAdminAnalytics(@Req() req: any) {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      throw new ForbiddenException('Admin access required');
    }
    return this.premiumService.getAnalytics();
  }
}

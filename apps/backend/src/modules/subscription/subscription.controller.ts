import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus, Headers, Req,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { SubscriptionService } from './subscription.service';
import { SubscriptionWebhookService } from './subscription-webhook.service';
import { RazorpayService } from './razorpay.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  CreateSubscriptionDto,
  CancelSubscriptionDto,
  ListSubscriptionsQueryDto,
  ChangePlanDto,
  AddPaymentMethodDto,
  BillingHistoryQueryDto,
} from './dto';

@ApiTags('Subscriptions')
@Controller('subscription')
export class SubscriptionController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly webhookService: SubscriptionWebhookService,
    private readonly razorpayService: RazorpayService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Get('plans')
  @ApiOperation({ summary: 'List all active subscription plans' })
  async getPlans() {
    const plans = await this.subscriptionService.getPlans();
    return { data: plans };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('current')
  @ApiOperation({ summary: 'Get current user subscription' })
  async getCurrentSubscription(@CurrentUser('id') userId: string) {
    const subscription = await this.subscriptionService.getCurrentSubscription(userId);
    return { data: subscription };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create or upgrade subscription' })
  async createSubscription(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateSubscriptionDto,
  ) {
    const subscription = await this.subscriptionService.createSubscription(userId, dto);
    return { data: subscription };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel subscription at period end' })
  async cancelSubscription(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto?: CancelSubscriptionDto,
  ) {
    const subscription = await this.subscriptionService.cancelSubscription(userId, id, dto);
    return { data: subscription };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':id/change-plan')
  @ApiOperation({ summary: 'Change subscription plan' })
  async changePlan(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: ChangePlanDto,
  ) {
    const subscription = await this.subscriptionService.changePlan(userId, id, dto);
    return { data: subscription };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('billing')
  @ApiOperation({ summary: 'Get billing history' })
  async getBillingHistory(
    @CurrentUser('id') userId: string,
    @Query() query: BillingHistoryQueryDto,
  ) {
    return this.subscriptionService.getBillingHistory(userId, query);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('invoices')
  @ApiOperation({ summary: 'Get invoices' })
  async getInvoices(
    @CurrentUser('id') userId: string,
    @Query() query: BillingHistoryQueryDto,
  ) {
    return this.subscriptionService.getInvoices(userId, query);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('payment-methods')
  @ApiOperation({ summary: 'List saved payment methods' })
  async getPaymentMethods(@CurrentUser('id') userId: string) {
    const methods = await this.subscriptionService.getPaymentMethods(userId);
    return { data: methods };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('payment-methods')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a payment method' })
  async addPaymentMethod(
    @CurrentUser('id') userId: string,
    @Body() dto: AddPaymentMethodDto,
  ) {
    const method = await this.subscriptionService.addPaymentMethod(userId, dto);
    return { data: method };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete('payment-methods/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a payment method' })
  async removePaymentMethod(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.subscriptionService.removePaymentMethod(userId, id);
  }

  @Public()
  @Post('webhook/stripe')
  @ApiExcludeEndpoint()
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(@Req() req: any) {
    const signature = req.headers['stripe-signature'];
    const rawBody = req.rawBody || req.body;
    return this.webhookService.handleStripeWebhook(rawBody);
  }

  @Public()
  @Post('webhook/razorpay')
  @ApiExcludeEndpoint()
  @HttpCode(HttpStatus.OK)
  async handleRazorpayWebhook(@Req() req: any, @Headers('x-razorpay-signature') signature?: string) {
    const rawBody = req.rawBody || req.body;
    return this.webhookService.handleRazorpayWebhook(rawBody);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('razorpay/create-order')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a Razorpay order for a plan' })
  async createRazorpayOrder(
    @CurrentUser('id') userId: string,
    @Body('planId') planId: string,
  ) {
    const plan = await this.subscriptionService.getPlanById(planId);
    if (!plan) throw new NotFoundException('Plan not found');

    const order = await this.razorpayService.createOrder(
      Number(plan.price),
      plan.currency || 'INR',
      `sub_${userId.slice(0, 8)}_${Date.now()}`,
    );

    const razorpayKeyId = this.configService.get<string>('RAZORPAY_KEY_ID') || 'rzp_test_placeholder';
    return { data: { order, key: this.razorpayService.isReady() ? razorpayKeyId : 'rzp_test_placeholder' } };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('razorpay/verify-payment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify Razorpay payment signature' })
  async verifyRazorpayPayment(
    @CurrentUser('id') userId: string,
    @Body('orderId') orderId: string,
    @Body('paymentId') paymentId: string,
    @Body('signature') signature: string,
    @Body('planId') planId: string,
  ) {
    const isValid = this.razorpayService.verifyPaymentSignature(orderId, paymentId, signature);
    if (!isValid) {
      throw new BadRequestException('Payment verification failed');
    }

    const subscription = await this.subscriptionService.createSubscription(userId, { planId } as any);
    return { data: { verified: true, subscription } };
  }
}

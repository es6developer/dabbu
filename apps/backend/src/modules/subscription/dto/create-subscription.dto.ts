import {
  IsString, IsOptional, IsEnum, IsUUID, IsInt, Min, Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSubscriptionDto {
  @ApiProperty({ description: 'Plan ID to subscribe to' })
  @IsString()
  planId: string;

  @ApiPropertyOptional({ description: 'Stripe price ID if using Stripe' })
  @IsOptional()
  @IsString()
  stripePriceId?: string;

  @ApiPropertyOptional({ description: 'Razorpay plan ID if using Razorpay' })
  @IsOptional()
  @IsString()
  razorpayPlanId?: string;
}

export class UpdateSubscriptionDto {
  @ApiPropertyOptional({ description: 'New plan ID' })
  @IsOptional()
  @IsString()
  planId?: string;

  @ApiPropertyOptional({ description: 'Stripe price ID' })
  @IsOptional()
  @IsString()
  stripePriceId?: string;

  @ApiPropertyOptional({ description: 'Razorpay plan ID' })
  @IsOptional()
  @IsString()
  razorpayPlanId?: string;
}

export class CancelSubscriptionDto {
  @ApiPropertyOptional({ description: 'Reason for cancellation' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ListSubscriptionsQueryDto {
  @ApiPropertyOptional({ description: 'Filter by status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}

export class ChangePlanDto {
  @ApiProperty({ description: 'New plan ID' })
  @IsString()
  planId: string;

  @ApiPropertyOptional({ description: 'Stripe price ID' })
  @IsOptional()
  @IsString()
  stripePriceId?: string;

  @ApiPropertyOptional({ description: 'Razorpay plan ID' })
  @IsOptional()
  @IsString()
  razorpayPlanId?: string;
}

export class AddPaymentMethodDto {
  @ApiProperty({ description: 'Payment gateway (stripe/razorpay)' })
  @IsString()
  gateway: string;

  @ApiProperty({ description: 'Payment method type (card/upi/netbanking/wallet)' })
  @IsString()
  type: string;

  @ApiPropertyOptional({ description: 'Stripe payment method ID' })
  @IsOptional()
  @IsString()
  stripePaymentMethodId?: string;

  @ApiPropertyOptional({ description: 'Razorpay instrument ID' })
  @IsOptional()
  @IsString()
  razorpayInstrumentId?: string;

  @ApiPropertyOptional({ description: 'Razorpay token ID' })
  @IsOptional()
  @IsString()
  razorpayTokenId?: string;

  @ApiPropertyOptional({ description: 'Last 4 digits of card' })
  @IsOptional()
  @IsString()
  lastFourDigits?: string;

  @ApiPropertyOptional({ description: 'Card brand (visa, mastercard, etc.)' })
  @IsOptional()
  @IsString()
  cardBrand?: string;

  @ApiPropertyOptional({ description: 'Card expiry month' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  expMonth?: number;

  @ApiPropertyOptional({ description: 'Card expiry year' })
  @IsOptional()
  @IsInt()
  @Min(2024)
  expYear?: number;

  @ApiPropertyOptional({ description: 'Card holder name' })
  @IsOptional()
  @IsString()
  cardHolderName?: string;

  @ApiPropertyOptional({ description: 'UPI handle' })
  @IsOptional()
  @IsString()
  upiHandle?: string;

  @ApiPropertyOptional({ description: 'Set as default payment method' })
  @IsOptional()
  isDefault?: boolean;
}

export class BillingHistoryQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}

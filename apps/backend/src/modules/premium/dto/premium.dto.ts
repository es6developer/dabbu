import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsObject,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSubscriptionDto {
  @ApiProperty({ example: 'PREMIUM_MONTHLY' })
  @IsString()
  planCode: string;

  @ApiPropertyOptional({ example: 'SAVE20' })
  @IsString()
  @IsOptional()
  couponCode?: string;
}

export class ChangePlanDto {
  @ApiProperty({ example: 'PREMIUM_YEARLY' })
  @IsString()
  newPlanCode: string;
}

export class CancelSubscriptionDto {
  @ApiPropertyOptional({ example: 'Too expensive' })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({ example: 'PRICE' })
  @IsString()
  @IsOptional()
  reasonCode?: string;
}

export class ReactivateSubscriptionDto {}

export class UpdatePaymentMethodDto {}

export class SubscriptionAnalyticsEventDto {
  @ApiProperty({ example: 'page_viewed' })
  @IsString()
  event: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  properties?: Record<string, any>;
}

export class ValidateCouponDto {
  @ApiProperty({ example: 'SAVE20' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'PREMIUM_MONTHLY' })
  @IsString()
  planCode: string;
}

export class PaginationDto {
  @ApiPropertyOptional({ default: 1 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 10 })
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;
}

export class PlanPreviewResponse {
  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  price: number;

  @ApiProperty()
  interval: string;

  @ApiProperty()
  features: string[];

  @ApiProperty()
  totalFeatures: number;

  @ApiProperty()
  grantedFeatures: string[];
}

export class SubscriptionResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  currentPeriodStart: Date;

  @ApiProperty()
  currentPeriodEnd: Date;

  @ApiProperty()
  nextBillingDate: Date;

  @ApiPropertyOptional()
  cancelledAt?: Date;

  @ApiProperty()
  cancelAtPeriodEnd: boolean;

  @ApiProperty()
  plan: any;

  @ApiProperty()
  usage: Record<string, number>;

  @ApiProperty()
  entitlements: string[];

  @ApiProperty()
  paymentMethod: any;

  @ApiPropertyOptional()
  razorpaySubscriptionId?: string;
}

export class UsageCheckResponse {
  @ApiProperty()
  allowed: boolean;

  @ApiProperty()
  current: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  remaining: number;
}

export class CouponValidationResponse {
  @ApiProperty()
  valid: boolean;

  @ApiPropertyOptional()
  code?: string;

  @ApiPropertyOptional()
  discountPct?: number;

  @ApiPropertyOptional()
  discountAmt?: number;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  message?: string;
}

export class CancellationOfferResponse {
  @ApiProperty()
  offerType: string;

  @ApiProperty()
  offerData: any;

  @ApiProperty()
  expiresAt: Date;

  @ApiProperty()
  description: string;
}

export class CancelSubscriptionResponse {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  status: string;

  @ApiProperty()
  cancelAtPeriodEnd: boolean;

  @ApiProperty()
  currentPeriodEnd: Date;

  @ApiPropertyOptional()
  recoveryOffer?: CancellationOfferResponse;

  @ApiPropertyOptional()
  message?: string;
}

export class CancellationRecoveryDto {
  @ApiProperty({ example: 'PRICE' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ example: 'Too expensive for me' })
  @IsString()
  @IsOptional()
  reasonText?: string;
}

export class AcceptRecoveryOfferDto {
  @ApiProperty()
  @IsString()
  userId: string;
}

export class SubscriptionCenterResponse {
  @ApiProperty()
  subscription: SubscriptionResponse;

  @ApiProperty()
  usage: Record<string, any>;

  @ApiProperty()
  entitlements: string[];

  @ApiProperty()
  availablePlans: any[];

  @ApiProperty()
  recentPayments: any[];

  @ApiProperty()
  isPremium: boolean;

  @ApiProperty()
  daysRemaining: number;
}

export class BillingHistoryResponse {
  @ApiProperty()
  data: any[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

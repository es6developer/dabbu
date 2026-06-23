import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsObject,
  IsEnum,
  IsBoolean,
} from 'class-validator';

export class CreateSubscriptionDto {
  @IsString()
  planCode: string;

  @IsOptional()
  @IsString()
  couponCode?: string;
}

export class ChangePlanDto {
  @IsString()
  newPlanCode: string;
}

export class CancelSubscriptionDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  reasonCode?: string;
}

export class ReactivateSubscriptionDto {
  @IsOptional()
  @IsString()
  planCode?: string;
}

export class ValidateCouponDto {
  @IsString()
  code: string;

  @IsString()
  planCode: string;
}

export class CancellationRecoveryDto {
  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  reasonText?: string;
}

export class SubscriptionAnalyticsEventDto {
  @IsString()
  event: string;

  @IsOptional()
  @IsObject()
  properties?: Record<string, any>;
}

export class ValidateFeatureDto {
  @IsString()
  featureKey: string;
}

export class CheckoutDto {
  @IsString()
  planCode: string;

  @IsOptional()
  @IsString()
  couponCode?: string;
}

export class PaginationDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class UpgradePlanDto {
  @IsString()
  planCode: string;
}

export class DowngradePlanDto {
  @IsString()
  planCode: string;
}

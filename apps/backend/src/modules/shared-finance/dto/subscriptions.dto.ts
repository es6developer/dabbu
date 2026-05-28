import {
  IsString, IsNumber, IsOptional, IsEnum, IsUUID, IsArray, ValidateNested,
  IsDateString, Min, Max, IsBoolean, ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum BillingCycle {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  QUARTERLY = 'quarterly',
}

export class SubscriptionMemberDto {
  @ApiProperty()
  @IsUUID()
  memberId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  share: number;
}

export class CreateSubscriptionDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  service: string;

  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ default: 'INR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ enum: BillingCycle, default: BillingCycle.MONTHLY })
  @IsOptional()
  @IsEnum(BillingCycle)
  billingCycle?: BillingCycle;

  @ApiProperty()
  @IsDateString()
  nextBillingDate: string;

  @ApiProperty()
  @IsUUID()
  paidByMemberId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ default: 7 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(90)
  renewalReminderDays?: number;

  @ApiProperty({ type: [SubscriptionMemberDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubscriptionMemberDto)
  @ArrayMinSize(1)
  members: SubscriptionMemberDto[];
}

export class UpdateSubscriptionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  service?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ enum: BillingCycle })
  @IsOptional()
  @IsEnum(BillingCycle)
  billingCycle?: BillingCycle;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  nextBillingDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  paidByMemberId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(90)
  renewalReminderDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: [SubscriptionMemberDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubscriptionMemberDto)
  members?: SubscriptionMemberDto[];
}

export class SubscriptionReminderQueryDto {
  @IsOptional()
  @IsNumber()
  days?: number;
}

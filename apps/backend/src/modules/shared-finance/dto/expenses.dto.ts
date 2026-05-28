import {
  IsString, IsNumber, IsOptional, IsEnum, IsUUID, IsArray, ValidateNested,
  IsDateString, IsObject, Min, Max, IsBoolean, ArrayMinSize, IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum SplitType {
  EQUAL = 'equal',
  PERCENTAGE = 'percentage',
  EXACT = 'exact',
  WEIGHTED = 'weighted',
}

export enum SettlementStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export class ExpenseSplitDto {
  @IsUUID()
  memberId: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  percentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;
}

export class ReceiptDataDto {
  @IsOptional()
  @IsString()
  merchant?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsNumber()
  total?: number;

  @IsOptional()
  @IsString()
  tax?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  items?: string[];

  @IsOptional()
  @IsString()
  receiptUrl?: string;
}

export class CreateExpenseDto {
  @IsString()
  @IsOptional()
  description: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  category: string;

  @IsEnum(SplitType)
  splitType: SplitType;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExpenseSplitDto)
  @ArrayMinSize(1)
  splits?: ExpenseSplitDto[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ReceiptDataDto)
  receiptData?: ReceiptDataDto;

  @IsOptional()
  @IsUUID()
  tripDayId?: string;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @IsString()
  recurringFrequency?: string;

  @IsOptional()
  @IsDateString()
  recurringEndDate?: string;
}

export class UpdateExpenseDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(SplitType)
  splitType?: SplitType;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExpenseSplitDto)
  @ArrayMinSize(1)
  splits?: ExpenseSplitDto[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ReceiptDataDto)
  receiptData?: ReceiptDataDto;

  @IsOptional()
  @IsUUID()
  tripDayId?: string;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @IsString()
  recurringFrequency?: string;

  @IsOptional()
  @IsDateString()
  recurringEndDate?: string;
}

export class CreateSettlementDto {
  @IsUUID()
  fromMemberId: string;

  @IsUUID()
  toMemberId: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  method?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateSettlementDto {
  @IsEnum(SettlementStatus)
  status: SettlementStatus;
}

export class CreateTripDto {
  @IsString()
  destination: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateTripDto {
  @IsOptional()
  @IsString()
  destination?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateTripDayDto {
  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CoupleProfileDto {
  @IsUUID()
  partner2Id: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salary1?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salary2?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sharedSavingsGoal?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyBudget?: number;
}

export class UpdateSalariesDto {
  @IsNumber()
  @Min(0)
  salary1: number;

  @IsNumber()
  @Min(0)
  salary2: number;
}

export class CreateCommentDto {
  @IsString()
  content: string;
}

export class CreateAttachmentDto {
  @IsString()
  type: string;

  @IsUrl()
  url: string;
}

import { IsString, IsNumber, IsOptional, IsUUID, Min, IsIn, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PayNowDto {
  @ApiProperty({ example: 'uuid-of-settlement' })
  @IsUUID()
  settlementId: string;
}

export class ConfirmPaymentDto {
  @ApiProperty({ example: 'uuid-of-settlement' })
  @IsUUID()
  settlementId: string;

  @ApiPropertyOptional({ example: 'GPay' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({ example: 'UPI123456789' })
  @IsOptional()
  @IsString()
  upiTransactionId?: string;

  @ApiPropertyOptional({ example: 'Paid via GPay' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class ConfirmReceiptDto {
  @ApiProperty({ example: 'uuid-of-settlement' })
  @IsUUID()
  settlementId: string;

  @ApiPropertyOptional({ example: 'Received, thanks!' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class RejectReceiptDto {
  @ApiProperty({ example: 'uuid-of-settlement' })
  @IsUUID()
  settlementId: string;

  @ApiProperty({ example: 'I did not receive this payment' })
  @IsString()
  @MaxLength(500)
  reason: string;
}

export class GeneratePayNowLinkDto {
  @ApiProperty()
  @IsUUID()
  settlementId: string;

  @ApiPropertyOptional({ example: 7 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  expiresInDays?: number;
}

export class CreateGuestMemberDto {
  @ApiProperty({ example: 'Ravi' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'ravi@example.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'ravi@paytm' })
  @IsOptional()
  @IsString()
  upiId?: string;

  @ApiProperty()
  @IsUUID()
  groupId: string;

  @ApiPropertyOptional({ example: 'Ravi invited you to Goa Trip' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}

export class GuestExpenseSubmissionDto {
  @ApiProperty({ example: 'uuid-of-group' })
  @IsUUID()
  groupId: string;

  @ApiProperty({ example: 'Dinner at Beach Shack' })
  @IsString()
  description: string;

  @ApiProperty({ example: 2500 })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ example: 'Food' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty()
  @IsUUID()
  paidBy: string; // userId of guest who paid
}

export class ApproveGuestExpenseDto {
  @ApiProperty({ example: 'uuid-of-approval-queue' })
  @IsUUID()
  queueId: string;

  @ApiProperty({ example: 'approved', enum: ['approved', 'rejected'] })
  @IsIn(['approved', 'rejected'])
  decision: string;

  @ApiPropertyOptional({ example: 'Amount seems correct' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class AddUpiIdDto {
  @ApiProperty({ example: 'karthik@okaxis' })
  @IsString()
  upiId: string;
}

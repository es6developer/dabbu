import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  IsEnum,
  MinLength,
  MaxLength,
  IsUUID,
  IsEmail,
  IsBoolean,
  IsDateString,
  Min,
  Max,
  IsObject,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ─── Group DTOs ─────────────────────────────────────────────

export class CreateGroupDto {
  @ApiProperty({ example: 'Ski Trip 2026' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'Our annual ski trip' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: 'trip', default: 'friends' })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ example: 'skiing', default: 'people' })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional({ example: '#f7892c' })
  @IsString()
  @IsOptional()
  coverColor?: string;

  @ApiPropertyOptional({ example: 'INR' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Transform(({ value }) => (value ? parseFloat(value) : undefined))
  monthlyBudget?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Transform(({ value }) => (value ? parseFloat(value) : undefined))
  monthlyIncome?: number;

  @ApiPropertyOptional({ example: 'user@paytm' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  upiId?: string;
}

export class UpdateGroupDto {
  @ApiPropertyOptional({ example: 'Ski Trip 2026 - Updated' })
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  coverColor?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Transform(({ value }) => (value ? parseFloat(value) : undefined))
  monthlyBudget?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Transform(({ value }) => (value ? parseFloat(value) : undefined))
  monthlyIncome?: number;
}

export class AddMemberByEmailDto {
  @ApiProperty({ example: 'friend@email.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ example: 'member', default: 'member' })
  @IsString()
  @IsOptional()
  role?: string;
}

export class AddMemberByPhoneDto {
  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({ example: 'member', default: 'member' })
  @IsString()
  @IsOptional()
  role?: string;
}

export class AddMemberDto {
  @ApiProperty({ example: 'uuid-of-user' })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiPropertyOptional({ example: 'member', default: 'member' })
  @IsString()
  @IsOptional()
  role?: string;

  @ApiPropertyOptional({ example: 'Johnny' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  nickname?: string;
}

export class InviteMemberDto {
  @ApiProperty({ example: 'friend@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

// ─── Expense DTOs ───────────────────────────────────────────

export class ExpenseSplitDto {
  @ApiProperty({ example: 'uuid-of-user' })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  amount: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  percentage?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  shares?: number;
}

export class CreateExpenseDto {
  @ApiProperty({ example: 'Dinner at Olive Garden' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  amount: number;

  @ApiProperty({ example: 'uuid-of-payer' })
  @IsUUID()
  @IsNotEmpty()
  paidBy: string;

  @ApiPropertyOptional({ example: 'Food & Dining', default: 'Other' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({ example: 'equal', default: 'equal' })
  @IsString()
  @IsOptional()
  splitType?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ type: [ExpenseSplitDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ExpenseSplitDto)
  @IsOptional()
  splits?: ExpenseSplitDto[];
}

export class UpdateExpenseDto {
  @ApiPropertyOptional({ example: 'Dinner updated' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Transform(({ value }) => (value ? parseFloat(value) : undefined))
  amount?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}

// ─── Settlement DTOs ────────────────────────────────────────

export class CreateSettlementDto {
  @ApiProperty({ example: 'uuid-of-debtor' })
  @IsUUID()
  @IsNotEmpty()
  fromUserId: string;

  @ApiProperty({ example: 'uuid-of-creditor' })
  @IsUUID()
  @IsNotEmpty()
  toUserId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  amount: number;

  @ApiPropertyOptional({ example: 'upi', default: 'cash' })
  @IsString()
  @IsOptional()
  method?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  note?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  proofUrl?: string;
}

export class CompleteSettlementDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  proofUrl?: string;

  @ApiPropertyOptional({ enum: ['cash', 'upi', 'other'] })
  @IsString()
  @IsOptional()
  method?: string;
}

// ─── Couple Finance DTOs ────────────────────────────────────

export class CreateCoupleProfileDto {
  @ApiProperty({ example: 'uuid-partner2' })
  @IsUUID()
  @IsNotEmpty()
  partner2Id: string;

  @ApiPropertyOptional({ example: '60:40' })
  @IsString()
  @IsOptional()
  splitRatio?: string;

  @ApiPropertyOptional({ example: 'salary_ratio' })
  @IsString()
  @IsOptional()
  contributionType?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Transform(({ value }) => (value ? parseFloat(value) : undefined))
  sharedBudget?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Transform(({ value }) => (value ? parseFloat(value) : undefined))
  savingsGoal?: number;
}

export class SendCoupleInviteDto {
  @ApiProperty({ example: 'partner@example.com' })
  @IsEmail()
  @IsNotEmpty()
  receiverEmail: string;
}

// ─── Trip DTOs ──────────────────────────────────────────────

export class CreateTripDto {
  @ApiPropertyOptional({ example: 'Goa Beach Trip' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  destination?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Transform(({ value }) => (value ? parseFloat(value) : undefined))
  totalBudget?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  distanceKm?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  transportMode?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}

export class AddTripExpenseDto {
  @ApiProperty({ example: 'hotel' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  amount: number;

  @ApiProperty({ example: 'uuid-of-payer' })
  @IsUUID()
  @IsNotEmpty()
  paidBy: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  note?: string;
}

// ─── Household Bill DTOs ────────────────────────────────────

export class HouseShareDto {
  @ApiProperty({ example: 'uuid-of-member' })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  amount: number;
}

export class CreateHouseholdBillDto {
  @ApiProperty({ example: 'rent' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  type: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  amount: number;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiProperty({ example: 'uuid-of-payer' })
  @IsUUID()
  @IsNotEmpty()
  paidBy: string;

  @ApiPropertyOptional({ example: '2026-06' })
  @IsString()
  @IsOptional()
  period?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ type: [HouseShareDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => HouseShareDto)
  shares: HouseShareDto[];
}

// ─── Contribution Rule DTOs ─────────────────────────────────

export class CreateContributionRuleDto {
  @ApiProperty({ example: 'Monthly Rent Split' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'equal', default: 'equal' })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiProperty({ description: '{ "userId": percentage/fixed amount }' })
  @IsObject()
  @IsNotEmpty()
  values: Record<string, number>;

  @ApiPropertyOptional({ default: 'monthly' })
  @IsString()
  @IsOptional()
  frequency?: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  autoApply?: boolean;
}

// ─── Shared Goal DTOs ───────────────────────────────────────

export class CreateSharedGoalDto {
  @ApiProperty({ example: 'Europe Trip Fund' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  targetAmount: number;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  deadline?: string;

  @ApiPropertyOptional({ example: 'savings' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}

export class ContributeToGoalDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  amount: number;
}

// ─── Chat DTOs ──────────────────────────────────────────────

export class SendMessageDto {
  @ApiPropertyOptional({ description: 'Message text' })
  @IsString()
  @IsOptional()
  message?: string;

  @ApiPropertyOptional({ example: 'text', default: 'text' })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  expenseId?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

// ─── Salary Profile DTO ─────────────────────────────────────

export class UpdateSalaryProfileDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  salary: number;

  @ApiPropertyOptional({ example: 'INR' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ example: 'monthly' })
  @IsString()
  @IsOptional()
  frequency?: string;
}

// ─── Group Lifecycle DTOs ──────────────────────────────────

export class TransitionStatusDto {
  @ApiProperty({
    enum: ['ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED', 'CLOSED'],
    example: 'COMPLETED',
  })
  @IsString()
  @IsNotEmpty()
  status: string;
}

export class RemoveMemberDto {
  @ApiPropertyOptional({ example: 'Inappropriate behavior' })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class RevokeInviteDto {
  @ApiProperty({ example: 'invite-token-string' })
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class GroupStatusResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ['ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED', 'CLOSED'] })
  status: string;

  @ApiProperty()
  statusChangedAt: string;

  @ApiProperty({ nullable: true })
  statusChangedBy?: string;

  @ApiProperty({ nullable: true })
  completedAt?: string;

  @ApiProperty({ nullable: true })
  archivedAt?: string;

  @ApiProperty({ nullable: true })
  closedAt?: string;

  @ApiProperty({ nullable: true })
  pausedAt?: string;

  @ApiProperty({ nullable: true })
  settlementsFinalized: boolean;

  @ApiProperty({ nullable: true })
  finalizedAt?: string;
}

// ─── Group Wallet DTOs ───────────────────────────────────

export class CreateWalletDto {
  @ApiProperty({ example: 'Goa Trip Fund' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ default: 'INR' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  requiresApproval?: boolean;
}

export class ContributeToWalletDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  amount: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;
}

export class SpendFromWalletDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  amount: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  referenceId?: string;
}

export class ApproveWalletTransactionDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  comment?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  action: string; // approve, reject
}

export class TransferWalletDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  targetWalletId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  amount: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;
}

// ─── Advance Contribution DTOs ───────────────────────────

export class CreateAdvanceContributionDto {
  @ApiProperty({ example: 'Hotel booking advance' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  amount: number;

  @ApiPropertyOptional({ default: 'general' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  dueDate?: string;
}

export class ContributeToAdvanceDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  amount: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  note?: string;
}

export class AdjustAdvanceDto {
  @ApiProperty()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  amount: number;

  @ApiProperty({ example: 'reimbursement' })
  @IsString()
  @IsNotEmpty()
  adjustmentType: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;
}

// ─── Expense Approval DTOs ───────────────────────────────

export class RequestApprovalDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  expenseId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  comment?: string;
}

export class ApproveExpenseDto {
  @ApiProperty({ example: 'approved' })
  @IsString()
  @IsNotEmpty()
  action: string; // approved, rejected

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  comment?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  rejectReason?: string;
}

// ─── Group Document DTOs ─────────────────────────────────

export class UploadDocumentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'ticket' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiPropertyOptional({ default: 'other' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fileUrl: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @ApiProperty()
  @IsNumber()
  fileSize: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}

export class UpdateDocumentPermissionDto {
  @ApiProperty({ default: true })
  @IsBoolean()
  @IsOptional()
  canView?: boolean;

  @ApiProperty({ default: false })
  @IsBoolean()
  @IsOptional()
  canDownload?: boolean;

  @ApiProperty({ default: false })
  @IsBoolean()
  @IsOptional()
  canShare?: boolean;

  @ApiProperty({ default: false })
  @IsBoolean()
  @IsOptional()
  canDelete?: boolean;
}

// ─── Calendar DTOs ───────────────────────────────────────

export class CreateCalendarEventDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ default: 'custom' })
  @IsString()
  @IsOptional()
  eventType?: string;

  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  allDay?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  recurrence?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  referenceId?: string;
}

// ─── Split Template DTOs ─────────────────────────────────

export class CreateSplitTemplateDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ default: 'friends' })
  @IsString()
  @IsOptional()
  groupType?: string;

  @ApiPropertyOptional({ default: 'documents' })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional({ default: '#f7892c' })
  @IsString()
  @IsOptional()
  coverColor?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Transform(({ value }) => (value ? parseFloat(value) : undefined))
  defaultBudget?: number;
}

export class TemplateCategoryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ default: 'card' })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Transform(({ value }) => (value ? parseFloat(value) : undefined))
  defaultAmount?: number;
}

export class CreateFromTemplateDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  templateId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Transform(({ value }) => (value ? parseFloat(value) : undefined))
  monthlyBudget?: number;
}

// ─── Credit Card Bill DTOs ───────────────────────────────

export class UploadCreditCardBillDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  cardHolder: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  cardType?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  lastFour?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  statementDate?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  totalAmount: number;

  @ApiPropertyOptional({ default: 'INR' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  fileUrl?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  ocrText?: string;
}

export class SplitTransactionDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  transactionId: string;

  @ApiProperty({ type: [Object], example: [{ userId: 'uuid', amount: 2500 }] })
  @IsArray()
  @ArrayMinSize(1)
  splits: { userId: string; amount: number }[];
}

// ─── Cash Pool DTOs ──────────────────────────────────────

export class CreateCashPoolDto {
  @ApiPropertyOptional({ default: 'Cash Pool' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  totalCash: number;

  @ApiPropertyOptional({ default: 'INR' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  custodian: string;
}

export class CashPoolTransactionDto {
  @ApiProperty({ example: 'deposit' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  amount: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  category?: string;
}

// ─── Emergency Fund DTOs ─────────────────────────────────

export class CreateEmergencyFundDto {
  @ApiPropertyOptional({ default: 'Emergency Fund' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  targetAmount: number;

  @ApiPropertyOptional({ default: 'INR' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  monthlyContribution: number;
}

export class ContributeToEmergencyFundDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  amount: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  note?: string;
}

export class WithdrawFromEmergencyFundDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  amount: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class ApproveWithdrawalDto {
  @ApiProperty({ example: 'approved' })
  @IsString()
  @IsNotEmpty()
  action: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  comment?: string;
}

// ─── Family Net Worth DTOs ───────────────────────────────

export class CreateNetWorthSnapshotDto {
  @ApiProperty({ type: [Object] })
  @IsArray()
  @ArrayMinSize(1)
  items: {
    type: string;
    name: string;
    amount: number;
    category: 'asset' | 'liability';
  }[];
}

// ─── Export DTOs ─────────────────────────────────────────

export class ExportDataDto {
  @ApiProperty({ example: 'pdf' })
  @IsString()
  @IsNotEmpty()
  exportType: string;

  @ApiProperty({ example: 'full' })
  @IsString()
  @IsNotEmpty()
  reportType: string;
}

// ─── Referral DTOs ───────────────────────────────────────

export class CreateReferralDto {
  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  refereeEmail: string;
}

// ─── Gamification DTOs ───────────────────────────────────

export class CheckBadgeProgressResponseDto {
  userId: string;
  badges: {
    code: string;
    name: string;
    progress: number;
    isEarned: boolean;
    earnedAt?: string;
  }[];
}

// ─── Forecast DTOs ───────────────────────────────────────

export class TripForecastDto {
  @ApiProperty({ example: 'Goa' })
  @IsString()
  @IsNotEmpty()
  destination: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  people: number;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  days: number;

  @ApiPropertyOptional({ default: 'INR' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ example: 'car' })
  @IsString()
  @IsOptional()
  transportMode?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  distanceKm?: number;
}

export class TripForecastResponseDto {
  destination: string;
  people: number;
  days: number;
  totalEstimatedCost: number;
  breakdown: { category: string; estimatedCost: number; percentage: number }[];
}

// ─── Couple Finance DTOs ──────────────────────────────────────────

export class CreateCoupleIncomeDto {
  @ApiProperty({ example: 50000 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ example: 'Monthly Salary' })
  @IsString()
  @IsNotEmpty()
  source: string;

  @ApiPropertyOptional({ example: 'salary', default: 'salary' })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ example: 'uuid-of-category' })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ example: '2026-06-01' })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  assignedTo?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CoupleSavingsContributeDto {
  @ApiProperty({ example: 5000 })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateGroupSettingsDto {
  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  monthlyBudget?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  splitRatio?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  savingsGoal?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  savingsContribution?: number;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  notificationPreferences?: Record<string, boolean>;
}

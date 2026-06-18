import { IsString, IsNumber, IsOptional, IsDateString, Min, MaxLength } from 'class-validator';

export class CreateFamilyBillDto {
  @IsString() @MaxLength(255) name: string;
  @IsNumber() @Min(0) amount: number;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() frequency?: string;
  @IsOptional() @IsString() assignedTo?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateFamilyBillDto {
  @IsOptional() @IsString() @MaxLength(255) name?: string;
  @IsOptional() @IsNumber() @Min(0) amount?: number;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() frequency?: string;
  @IsOptional() @IsString() assignedTo?: string;
  @IsOptional() @IsString() notes?: string;
}

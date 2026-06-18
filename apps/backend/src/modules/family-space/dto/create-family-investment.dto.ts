import { IsString, IsNumber, IsOptional, IsDateString, Min, MaxLength } from 'class-validator';

export class CreateFamilyInvestmentDto {
  @IsString() @MaxLength(255) name: string;
  @IsString() type: string;
  @IsNumber() @Min(0) amount: number;
  @IsOptional() @IsNumber() @Min(0) currentValue?: number;
  @IsOptional() @IsNumber() returns?: number;
  @IsOptional() @IsDateString() purchaseDate?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateFamilyInvestmentDto {
  @IsOptional() @IsString() @MaxLength(255) name?: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsNumber() @Min(0) amount?: number;
  @IsOptional() @IsNumber() @Min(0) currentValue?: number;
  @IsOptional() @IsNumber() returns?: number;
  @IsOptional() @IsDateString() purchaseDate?: string;
  @IsOptional() @IsString() notes?: string;
}

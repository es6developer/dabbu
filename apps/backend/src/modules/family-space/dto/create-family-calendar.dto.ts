import { IsString, IsOptional, IsBoolean, IsDateString, MaxLength } from 'class-validator';

export class CreateFamilyCalendarEventDto {
  @IsString() @MaxLength(255) title: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() eventType?: string;
  @IsDateString() startDate: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsBoolean() allDay?: boolean;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsString() recurrence?: string;
}

export class UpdateFamilyCalendarEventDto {
  @IsOptional() @IsString() @MaxLength(255) title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() eventType?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsBoolean() allDay?: boolean;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsString() recurrence?: string;
}

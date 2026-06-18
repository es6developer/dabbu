import { IsString, IsNumber, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class CreateFamilyDocumentDto {
  @IsString() @MaxLength(255) name: string;
  @IsString() type: string;
  @IsOptional() @IsString() category?: string;
  @IsString() fileUrl: string;
  @IsString() mimeType: string;
  @IsOptional() @IsNumber() fileSize?: number;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() isEncrypted?: boolean;
}

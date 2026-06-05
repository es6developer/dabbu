import { IsEmail, IsOptional, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SearchUsersDto {
  @ApiProperty({ description: 'Search query (email, name, or phone)' })
  @IsString()
  @MinLength(2)
  query: string;
}

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ description: 'Phone number (secondary identity)' })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class SyncContactsDto {
  @ApiProperty({ description: 'Array of SHA-256 hashed phone numbers' })
  @IsString({ each: true })
  hashes: string[];
}

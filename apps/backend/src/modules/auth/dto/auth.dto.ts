import {
  IsString,
  IsEmail,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'StrongPass123!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/, {
    message:
      'Password must contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character',
  })
  password: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50)
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50)
  lastName: string;

  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{9,14}$/, { message: 'Invalid phone number format' })
  phone: string;

  @ApiPropertyOptional({ example: 'DABBU-A1B2C3D4' })
  @IsString()
  @IsOptional()
  referralCode?: string;

  @ApiPropertyOptional({ description: 'Device name (e.g. iPhone 15 Pro)' })
  @IsString()
  @IsOptional()
  deviceName?: string;

  @ApiPropertyOptional({ description: 'Platform (ios, android, web)' })
  @IsString()
  @IsOptional()
  platform?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'StrongPass123!' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiPropertyOptional({ description: 'Device name (e.g. iPhone 15 Pro)' })
  @IsString()
  @IsOptional()
  deviceName?: string;

  @ApiPropertyOptional({ description: 'Platform (ios, android, web)' })
  @IsString()
  @IsOptional()
  platform?: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: 'NewStrongPass123!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least 1 uppercase, 1 lowercase, and 1 number',
  })
  password: string;
}

export class ResetWithOtpDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'OTP must be 6 digits' })
  otp: string;

  @ApiProperty({ example: 'NewStrongPass123!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least 1 uppercase, 1 lowercase, and 1 number',
  })
  password: string;

  @ApiProperty({ enum: ['email_verification', 'password_reset', 'login'] })
  @IsString()
  @IsNotEmpty()
  purpose: string;
}

export class SendOtpDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ enum: ['email_verification', 'login', 'password_reset'] })
  @IsString()
  @IsNotEmpty()
  purpose: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'OTP must be 6 digits' })
  otp: string;

  @ApiProperty({ enum: ['email_verification', 'password_reset', 'login'] })
  @IsString()
  @IsNotEmpty()
  purpose: string;
}

export class GoogleAuthDto {
  @ApiProperty({ description: 'Google ID token from Google Sign-In' })
  @IsString()
  @IsNotEmpty()
  idToken: string;

  @ApiPropertyOptional({ description: 'Referral code if user came via referral link' })
  @IsString()
  @IsOptional()
  referralCode?: string;

  @ApiPropertyOptional({ description: 'Device name (e.g. iPhone 15 Pro)' })
  @IsString()
  @IsOptional()
  deviceName?: string;

  @ApiPropertyOptional({ description: 'Platform (ios, android, web)' })
  @IsString()
  @IsOptional()
  platform?: string;
}

export class DemoLoginDto {
  @ApiPropertyOptional({ description: 'Device name (e.g. iPhone 15 Pro)' })
  @IsString()
  @IsOptional()
  deviceName?: string;

  @ApiPropertyOptional({ description: 'Platform (ios, android, web)' })
  @IsString()
  @IsOptional()
  platform?: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({ example: 'NewStrongPass123!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least 1 uppercase, 1 lowercase, and 1 number',
  })
  newPassword: string;
}

export class SelectPresetAvatarDto {
  @ApiProperty({ description: 'Preset seed identifier (e.g. "dabbu-sunny")' })
  @IsString()
  @IsNotEmpty()
  seed: string;
}

export class SetupLockDto {
  @ApiPropertyOptional({ description: '4-digit app PIN (null/omit to remove)' })
  @IsString()
  @IsOptional()
  @Matches(/^\d{4}$/, { message: 'PIN must be exactly 4 digits' })
  pin?: string;

  @ApiPropertyOptional({ description: 'Current PIN (required when changing PIN)' })
  @IsString()
  @IsOptional()
  oldPin?: string;

  @ApiPropertyOptional({ description: 'Enable biometric unlock' })
  @IsOptional()
  biometricEnabled?: boolean;
}

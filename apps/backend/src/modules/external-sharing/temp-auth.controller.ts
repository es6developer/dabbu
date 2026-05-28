import { Controller, Post, Get, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TempAuthService } from './temp-auth.service';
import { AnonymousLoginDto } from './dto/anonymous-login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { OtpRequestDto } from './dto/otp-request.dto';
import { OtpVerifyDto } from './dto/otp-verify.dto';

@ApiTags('External Sharing - Temp Auth')
@Controller('external-sharing/auth')
export class TempAuthController {
  constructor(private readonly tempAuthService: TempAuthService) {}

  @Post('anonymous')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create anonymous temp session' })
  async anonymousLogin(@Body() dto: AnonymousLoginDto) {
    const result = await this.tempAuthService.createAnonymousSession(dto);
    return { data: result };
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Google login for temp user' })
  async googleLogin(@Body() dto: GoogleLoginDto) {
    const result = await this.tempAuthService.googleLogin(dto);
    return { data: result };
  }

  @Post('email-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request email OTP' })
  async requestEmailOtp(@Body() dto: OtpRequestDto) {
    if (!dto.email) {
      return { data: { message: 'Email is required' }, statusCode: 400 };
    }
    const result = await this.tempAuthService.requestEmailOtp(dto.email);
    return { data: result };
  }

  @Post('email-verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email OTP' })
  async verifyEmailOtp(@Body() dto: OtpVerifyDto) {
    if (!dto.email) {
      return { data: { message: 'Email is required' }, statusCode: 400 };
    }
    const result = await this.tempAuthService.verifyEmailOtp(dto.email, dto.otp, dto.deviceId);
    return { data: result };
  }

  @Post('phone-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request phone OTP' })
  async requestPhoneOtp(@Body() dto: OtpRequestDto) {
    if (!dto.phone) {
      return { data: { message: 'Phone is required' }, statusCode: 400 };
    }
    const result = await this.tempAuthService.requestPhoneOtp(dto.phone);
    return { data: result };
  }

  @Post('phone-verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify phone OTP' })
  async verifyPhoneOtp(@Body() dto: OtpVerifyDto) {
    if (!dto.phone) {
      return { data: { message: 'Phone is required' }, statusCode: 400 };
    }
    const result = await this.tempAuthService.verifyPhoneOtp(dto.phone, dto.otp, dto.deviceId);
    return { data: result };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh temp session' })
  async refreshSession(@Body('refreshToken') refreshToken: string) {
    const result = await this.tempAuthService.refreshSession(refreshToken);
    return { data: result };
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current temp user profile' })
  async getProfile(@Body('tempUserId') tempUserId: string) {
    const result = await this.tempAuthService.getProfile(tempUserId);
    return { data: result };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'End temp session' })
  async logout(@Body('tempUserId') tempUserId: string) {
    const result = await this.tempAuthService.logout(tempUserId);
    return { data: result };
  }
}

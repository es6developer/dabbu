import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  Param,
  Headers,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  GoogleAuthDto,
  SendOtpDto,
  VerifyOtpDto,
  SetupLockDto,
  DemoLoginDto,
} from './dto/auth.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user account' })
  async register(
    @Body() dto: RegisterDto,
    @Req() req: any,
    @Headers('user-agent') userAgent?: string,
  ) {
    const ip = req.ip || req.headers['x-forwarded-for']?.split(',')[0] || '';
    const result = await this.authService.register(dto, ip, userAgent);
    return { data: result };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: any,
    @Headers('user-agent') userAgent?: string,
  ) {
    const ip = req.ip || req.headers['x-forwarded-for']?.split(',')[0] || '';
    const result = await this.authService.login(dto, ip, userAgent);
    return { data: result };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    const tokens = await this.authService.refreshTokens(dto);
    return { data: tokens };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset email' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const result = await this.authService.forgotPassword(dto.email);
    return { data: result };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    const result = await this.authService.resetPassword(dto.token, dto.password);
    return { data: result };
  }

  @Post('guest')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Continue as guest (temporary user)' })
  async guestLogin() {
    const result = await this.authService.guestLogin();
    return { data: result };
  }

  @Post('demo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Demo login with pre-created demo account' })
  async demoLogin(
    @Body() dto: DemoLoginDto,
    @Req() req: any,
    @Headers('user-agent') userAgent?: string,
  ) {
    const ip = req.ip || req.headers['x-forwarded-for']?.split(',')[0] || '';
    const result = await this.authService.demoLogin(ip, userAgent, dto.deviceName, dto.platform);
    return { data: result };
  }

  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP code to email for verification or login' })
  async sendOtp(@Body() dto: SendOtpDto) {
    const result = await this.authService.sendOtp(dto);
    return { data: result };
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP code' })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    const result = await this.authService.verifyOtp(dto);
    return { data: result };
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login or register with Google Sign-In' })
  async googleAuth(
    @Body() dto: GoogleAuthDto,
    @Req() req: any,
    @Headers('user-agent') userAgent?: string,
  ) {
    const ip = req.ip || req.headers['x-forwarded-for']?.split(',')[0] || '';
    const result = await this.authService.googleAuth(
      dto,
      ip,
      userAgent,
      dto.deviceName,
      dto.platform,
    );
    return { data: result };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser('id') userId: string) {
    const profile = await this.authService.getProfile(userId);
    return { data: profile };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  async logout(@CurrentUser('id') userId: string, @Body('refreshToken') refreshToken: string) {
    await this.authService.logout(userId, refreshToken);
    return { data: { message: 'Logged out successfully' } };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout from all devices' })
  async logoutAll(@CurrentUser('id') userId: string) {
    await this.authService.logoutAll(userId);
    return { data: { message: 'Logged out from all devices' } };
  }

  // ─── App Lock ─────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('lock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set, change, or remove app lock PIN and biometric settings' })
  async setupLock(@CurrentUser('id') userId: string, @Body() dto: SetupLockDto) {
    const result = await this.authService.setupLock(userId, dto);
    return { data: result };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('lock')
  @ApiOperation({ summary: 'Get current app lock settings' })
  async getLockSettings(@CurrentUser('id') userId: string) {
    const result = await this.authService.getLockSettings(userId);
    return { data: result };
  }

  // ─── Sessions ─────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('sessions')
  @ApiOperation({ summary: 'List active sessions' })
  async getSessions(
    @CurrentUser('id') userId: string,
    @Query('currentSessionId') currentSessionId?: string,
  ) {
    const sessions = await this.authService.getSessions(userId, currentSessionId);
    return { data: sessions };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete('sessions/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a specific session' })
  async revokeSession(@CurrentUser('id') userId: string, @Param('id') sessionId: string) {
    await this.authService.revokeSession(userId, sessionId);
    return { data: { message: 'Session revoked' } };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('sessions/logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout all other sessions except current' })
  async revokeOtherSessions(
    @CurrentUser('id') userId: string,
    @Body('currentSessionId') currentSessionId: string,
  ) {
    const count = await this.authService.revokeOtherSessions(userId, currentSessionId);
    return { data: { message: `Logged out from ${count} other device(s)` } };
  }

  // ─── Login Activity ───────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('activity')
  @ApiOperation({ summary: 'Get recent login activity' })
  async getActivity(@CurrentUser('id') userId: string) {
    const activity = await this.authService.getLoginActivity(userId);
    return { data: activity };
  }
}

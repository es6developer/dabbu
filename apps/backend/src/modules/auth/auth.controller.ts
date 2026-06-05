import { Controller, Post, Get, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RegisterDto, LoginDto, RefreshTokenDto, ForgotPasswordDto, ResetPasswordDto, GoogleAuthDto } from './dto/auth.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user account' })
  async register(@Body() dto: RegisterDto) {
    const result = await this.authService.register(dto);
    return { data: result };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  async login(@Body() dto: LoginDto) {
    const result = await this.authService.login(dto);
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

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login or register with Google Sign-In' })
  async googleAuth(@Body() dto: GoogleAuthDto) {
    const result = await this.authService.googleAuth(dto);
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
  async logout(
    @CurrentUser('id') userId: string,
    @Body('refreshToken') refreshToken: string,
  ) {
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
}

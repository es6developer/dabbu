import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { ReferralService } from '../referral/referral.service';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  GoogleAuthDto,
  SendOtpDto,
  VerifyOtpDto,
} from './dto/auth.dto';
import { JwtPayload, TokenPair } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MINUTES = 15;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly referralService: ReferralService,
  ) {}

  async register(dto: RegisterDto): Promise<{ user: any; tokens: TokenPair }> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone || null,
        role: 'user',
        referralCode: crypto.randomBytes(4).toString('hex').toUpperCase(),
        isEmailVerified: false,
        settings: {
          create: {
            emailNotifications: true,
            pushNotifications: true,
            smsNotifications: false,
            weeklyReport: true,
            monthlyReport: true,
            theme: 'dark',
            autoDetectTransactions: true,
            budgetAlertThreshold: 80,
            defaultCurrency: 'INR',
            dateFormat: 'DD/MM/yyyy',
            firstDayOfWeek: 1,
            language: 'en',
          },
        },
        subscription: {
          create: {
            planId:
              (
                await this.prisma.subscriptionPlan.findFirst({
                  where: { isActive: true },
                  orderBy: { sortOrder: 'asc' },
                })
              )?.id || '',
            status: 'active',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 365 * 86400000),
          },
        },
      },
      include: {
        settings: true,
        subscription: { include: { plan: true } },
      },
    });

    const tokens = await this.generateTokens(user.id, user.email);
    await this.createSession(user.id, tokens.refreshToken);

    const { password, ...userWithoutPassword } = user;

    if (dto.referralCode) {
      this.referralService.processReferralSignup(user.id, dto.referralCode).catch((err) => {
        this.logger.warn(`Failed to process referral for ${user.id}: ${err.message}`);
      });
    }

    await this.emailService.sendWelcomeEmail(user.email, user.firstName);

    return { user: userWithoutPassword, tokens };
  }

  async login(dto: LoginDto): Promise<{ user: any; tokens: TokenPair }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { settings: true, subscription: { include: { plan: true } } },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      throw new UnauthorizedException('Account is temporarily locked. Try again later.');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      await this.handleFailedLogin(user.id, user.loginAttempts);
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.loginAttempts > 0) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { loginAttempts: 0, lockoutUntil: null },
      });
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.generateTokens(user.id, user.email);
    await this.createSession(user.id, tokens.refreshToken);

    const { password, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, tokens };
  }

  async refreshTokens(dto: RefreshTokenDto): Promise<TokenPair> {
    const session = await this.prisma.session.findFirst({
      where: { refreshToken: dto.refreshToken, isRevoked: false },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.prisma.session.update({
      where: { id: session.id },
      data: { isRevoked: true, revokedAt: new Date() },
    });

    const tokens = await this.generateTokens(session.userId, session.user.email);
    await this.createSession(session.userId, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId, refreshToken },
      data: { isRevoked: true, revokedAt: new Date() },
    });
  }

  async logoutAll(userId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true, revokedAt: new Date() },
    });
  }

  async guestLogin(): Promise<{ user: any; tokens: TokenPair }> {
    const DEMO_EMAIL = 'demo@dabbu.app';
    let user = await this.prisma.user.findUnique({
      where: { email: DEMO_EMAIL },
      include: {
        settings: true,
        subscription: { include: { plan: true } },
      },
    });

    if (!user) {
      let freePlan = await this.prisma.subscriptionPlan.findFirst({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      });
      if (!freePlan) {
        freePlan = await this.prisma.subscriptionPlan.create({
          data: {
            name: 'Free',
            code: 'free',
            description: 'Free plan for guest users',
            price: 0,
            currency: 'INR',
            interval: 'year',
            intervalCount: 1,
            popular: false,
            bestValue: false,
            features: [],
            isActive: true,
            sortOrder: 0,
          },
        });
      }

      user = await this.prisma.user.create({
        data: {
          email: DEMO_EMAIL,
          password: '',
          firstName: 'Demo',
          lastName: 'User',
          role: 'user',
          status: 'active',
          authProvider: 'guest',
          referralCode: crypto.randomBytes(4).toString('hex').toUpperCase(),
          isEmailVerified: false,
          settings: {
            create: {
              emailNotifications: false,
              pushNotifications: true,
              smsNotifications: false,
              weeklyReport: false,
              monthlyReport: false,
              theme: 'dark',
              autoDetectTransactions: false,
              budgetAlertThreshold: 80,
              defaultCurrency: 'INR',
              dateFormat: 'DD/MM/yyyy',
              firstDayOfWeek: 1,
              language: 'en',
            },
          },
          subscription: {
            create: {
              planId: freePlan.id,
              status: 'active',
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(Date.now() + 365 * 86400000),
            },
          },
        },
        include: {
          settings: true,
          subscription: { include: { plan: true } },
        },
      });
    }

    const tokens = await this.generateTokens(user.id, user.email);
    await this.createSession(user.id, tokens.refreshToken);

    const { password, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, tokens };
  }

  async googleAuth(
    dto: GoogleAuthDto,
  ): Promise<{ user: any; tokens: TokenPair; isNewUser: boolean }> {
    const client = new OAuth2Client();
    let ticket;
    try {
      ticket = await client.verifyIdToken({ idToken: dto.idToken });
    } catch {
      throw new UnauthorizedException('Invalid Google token');
    }
    const payload = ticket.getPayload()!;
    const googleEmail = payload.email;
    const googleName = payload.name || '';
    const googleAvatar = payload.picture;
    const googleSub = payload.sub;

    if (!googleEmail) {
      throw new UnauthorizedException('Google account has no email');
    }

    let user = await this.prisma.user.findUnique({ where: { email: googleEmail } });

    let isNewUser = false;

    if (user) {
      if (user.authProvider === 'email' && !user.password) {
        throw new UnauthorizedException(
          'Account exists with email/password. Please login with email.',
        );
      }
      if (user.status !== 'active') {
        throw new UnauthorizedException('Account is not active');
      }
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          authProvider: 'google',
          avatarUrl: googleAvatar || user.avatarUrl,
          isEmailVerified: true,
          lastLoginAt: new Date(),
        },
      });
    } else {
      const nameParts = googleName.split(' ').filter(Boolean);
      const firstName = nameParts[0] || 'User';
      const lastName = nameParts.slice(1).join(' ') || '';

      user = await this.prisma.user.create({
        data: {
          email: googleEmail,
          password: crypto.randomBytes(32).toString('hex'),
          firstName,
          lastName,
          avatarUrl: googleAvatar,
          authProvider: 'google',
          referralCode: crypto.randomBytes(4).toString('hex').toUpperCase(),
          isEmailVerified: true,
          role: 'user',
          settings: {
            create: {
              emailNotifications: true,
              pushNotifications: true,
              smsNotifications: false,
              weeklyReport: true,
              monthlyReport: true,
              theme: 'dark',
              autoDetectTransactions: true,
              budgetAlertThreshold: 80,
              defaultCurrency: 'INR',
              dateFormat: 'DD/MM/yyyy',
              firstDayOfWeek: 1,
              language: 'en',
            },
          },
          subscription: {
            create: {
              planId:
                (
                  await this.prisma.subscriptionPlan.findFirst({
                    where: { isActive: true },
                    orderBy: { sortOrder: 'asc' },
                  })
                )?.id || '00000000-0000-0000-0000-000000000000',
              status: 'active',
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(Date.now() + 365 * 86400000),
            },
          },
        },
        include: {
          settings: true,
          subscription: { include: { plan: true } },
        },
      });
      isNewUser = true;
    }

    const tokens = await this.generateTokens(user.id, user.email);
    await this.createSession(user.id, tokens.refreshToken);

    if (isNewUser && dto.referralCode) {
      this.referralService.processReferralSignup(user.id, dto.referralCode).catch((err) => {
        this.logger.warn(`Failed to process referral for ${user.id}: ${err.message}`);
      });
    }

    const { password, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, tokens, isNewUser };
  }

  async getProfile(userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        settings: true,
        subscription: { include: { plan: true } },
        _count: {
          select: {
            sessions: true,
            devices: true,
            reminders: true,
            transactions: true,
          },
        },
      },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { message: 'If the email exists, a reset link has been sent.' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000);

    const hashedToken = await bcrypt.hash(resetToken, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        otpCode: hashedToken,
        otpExpiresAt: resetExpires,
        otpPurpose: 'password_reset',
      },
    });

    await this.emailService.sendForgotPasswordEmail(user.email, user.firstName, resetToken);

    return { message: 'If the email exists, a reset link has been sent.' };
  }

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    const users = await this.prisma.user.findMany({
      where: {
        otpExpiresAt: { gte: new Date() },
        otpPurpose: 'password_reset',
        isActive: true,
      },
      select: { id: true, otpCode: true, email: true },
    });

    let matchedUser: { id: string; email: string } | null = null;
    for (const user of users) {
      if (user.otpCode && (await bcrypt.compare(token, user.otpCode))) {
        matchedUser = user;
        break;
      }
    }

    if (!matchedUser) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    await this.prisma.user.update({
      where: { id: matchedUser.id },
      data: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
        otpCode: null,
        otpExpiresAt: null,
        otpPurpose: null,
      },
    });

    await this.prisma.session.updateMany({
      where: { userId: matchedUser.id, isRevoked: false },
      data: { isRevoked: true, revokedAt: new Date() },
    });

    await this.emailService.sendPasswordChangedEmail(
      matchedUser.email,
      matchedUser.email.split('@')[0] || 'User',
    );

    return { message: 'Password reset successfully' };
  }

  private readonly OTP_EXPIRY_MINUTES = 5;
  private readonly MAX_OTP_ATTEMPTS = 5;

  async sendOtp(dto: SendOtpDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      return { message: 'If the email exists, a verification code has been sent.' };
    }

    const otpCode = crypto.randomInt(100000, 999999).toString();
    const otpExpires = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60000);
    const hashedOtp = await bcrypt.hash(otpCode, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        otpCode: hashedOtp,
        otpExpiresAt: otpExpires,
        otpPurpose: dto.purpose,
        otpAttempts: 0,
      },
    });

    await this.emailService.sendOtpEmail(user.email, user.firstName, otpCode, dto.purpose);

    return { message: 'If the email exists, a verification code has been sent.' };
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<{ verified: boolean; message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      return { verified: false, message: 'Invalid or expired OTP' };
    }

    if (!user.otpCode || !user.otpExpiresAt || user.otpPurpose !== dto.purpose) {
      return { verified: false, message: 'Invalid or expired OTP' };
    }

    if (user.otpExpiresAt < new Date()) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { otpCode: null, otpExpiresAt: null, otpPurpose: null, otpAttempts: 0 },
      });
      return { verified: false, message: 'OTP has expired. Please request a new one.' };
    }

    if (user.otpAttempts >= this.MAX_OTP_ATTEMPTS) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { otpCode: null, otpExpiresAt: null, otpPurpose: null, otpAttempts: 0 },
      });
      return {
        verified: false,
        message: 'Too many failed attempts. Please request a new OTP.',
      };
    }

    const isValid = await bcrypt.compare(dto.otp, user.otpCode);
    if (!isValid) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { otpAttempts: user.otpAttempts + 1 },
      });
      return { verified: false, message: 'Invalid OTP. Please try again.' };
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        otpCode: null,
        otpExpiresAt: null,
        otpPurpose: null,
        otpAttempts: 0,
        ...(dto.purpose === 'email_verification' ? { isEmailVerified: true } : {}),
      },
    });

    return { verified: true, message: 'OTP verified successfully' };
  }

  private async generateTokens(userId: string, email: string): Promise<TokenPair> {
    const payload: JwtPayload = { id: userId, sub: userId, email };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.secret')!,
      expiresIn: this.configService.get<string>('jwt.expiresIn') || '15m',
      issuer: this.configService.get<string>('jwt.issuer') || 'dabbu',
      audience: this.configService.get<string>('jwt.audience') || 'dabbu-users',
    });

    const decoded = this.jwtService.verify(accessToken, {
      secret: this.configService.get<string>('jwt.secret')!,
    }) as any;

    const refreshToken = crypto.randomBytes(64).toString('hex');

    return {
      accessToken,
      refreshToken,
      expiresAt: new Date(decoded.exp * 1000),
    };
  }

  private async createSession(userId: string, refreshToken: string): Promise<void> {
    await this.prisma.session.create({
      data: {
        userId,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 86400000),
      },
    });
  }

  private async handleFailedLogin(userId: string, currentAttempts: number): Promise<void> {
    const newAttempts = currentAttempts + 1;

    if (newAttempts >= this.MAX_LOGIN_ATTEMPTS) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          loginAttempts: newAttempts,
          lockoutUntil: new Date(Date.now() + this.LOCKOUT_DURATION_MINUTES * 60000),
          lastFailedLoginAt: new Date(),
        },
      });
      throw new UnauthorizedException(
        `Account locked due to ${this.MAX_LOGIN_ATTEMPTS} failed attempts. Try again in ${this.LOCKOUT_DURATION_MINUTES} minutes.`,
      );
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { loginAttempts: newAttempts, lastFailedLoginAt: new Date() },
    });
  }
}

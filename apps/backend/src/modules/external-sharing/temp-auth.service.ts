import {
  Injectable, Logger, BadRequestException, UnauthorizedException, ConflictException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AnonymousLoginDto } from './dto/anonymous-login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';

interface OtpEntry {
  otp: string;
  expiresAt: Date;
  attempts: number;
}

@Injectable()
export class TempAuthService {
  private readonly logger = new Logger(TempAuthService.name);
  private readonly otpStore = new Map<string, OtpEntry>();
  private readonly SESSION_TOKEN_LENGTH = 64;
  private readonly SESSION_EXPIRY_DAYS = 30;
  private readonly OTP_EXPIRY_MINUTES = 10;
  private readonly MAX_OTP_ATTEMPTS = 5;

  constructor(private readonly prisma: PrismaService) {}

  async createAnonymousSession(dto: AnonymousLoginDto) {
    const deviceId = dto.deviceId || `auto_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    const existing = dto.deviceId
      ? await this.prisma.tempUser.findFirst({
          where: { deviceId, isActive: true, convertedToUserId: null },
        })
      : null;

    if (existing) {
      const sessionToken = this.generateSessionToken();
      const refreshToken = this.generateSessionToken();
      const sessionExpiresAt = new Date(Date.now() + this.SESSION_EXPIRY_DAYS * 86400000);

      await this.prisma.tempUser.update({
        where: { id: existing.id },
        data: {
          sessionToken,
          refreshToken,
          sessionExpiresAt,
          devicePlatform: dto.devicePlatform ?? existing.devicePlatform,
          fcmToken: dto.fcmToken ?? existing.fcmToken,
          name: dto.name ?? existing.name,
          sessionCount: { increment: 1 },
          lastActiveAt: new Date(),
        },
      });

      return {
        token: sessionToken,
        refreshToken,
        user: {
          id: existing.id,
          name: dto.name || existing.name,
          isExisting: true,
        },
      };
    }

    const sessionToken = this.generateSessionToken();
    const refreshToken = this.generateSessionToken();
    const sessionExpiresAt = new Date(Date.now() + this.SESSION_EXPIRY_DAYS * 86400000);

    const tempUser = await this.prisma.tempUser.create({
      data: {
        deviceId,
        devicePlatform: dto.devicePlatform ?? null,
        fcmToken: dto.fcmToken ?? null,
        name: dto.name ?? null,
        loginMethod: 'anonymous',
        sessionToken,
        refreshToken,
        sessionExpiresAt,
        sessionCount: 1,
        lastActiveAt: new Date(),
      },
    });

    return {
      token: sessionToken,
      refreshToken,
      user: {
        id: tempUser.id,
        name: tempUser.name,
        isExisting: false,
      },
    };
  }

  async googleLogin(dto: GoogleLoginDto) {
    let tempUser = await this.prisma.tempUser.findFirst({
      where: { googleId: dto.email, isActive: true, convertedToUserId: null },
    });

    const sessionToken = this.generateSessionToken();
    const refreshToken = this.generateSessionToken();
    const sessionExpiresAt = new Date(Date.now() + this.SESSION_EXPIRY_DAYS * 86400000);

    if (tempUser) {
      tempUser = await this.prisma.tempUser.update({
        where: { id: tempUser.id },
        data: {
          displayName: dto.displayName ?? tempUser.displayName,
          avatarUrl: dto.avatarUrl ?? tempUser.avatarUrl,
          deviceId: dto.deviceId ?? tempUser.deviceId,
          sessionToken,
          refreshToken,
          sessionExpiresAt,
          loginMethod: 'google',
          sessionCount: { increment: 1 },
          lastActiveAt: new Date(),
        },
      });
    } else {
      tempUser = await this.prisma.tempUser.create({
        data: {
          email: dto.email ?? null,
          googleId: dto.email,
          displayName: dto.displayName ?? null,
          avatarUrl: dto.avatarUrl ?? null,
          deviceId: dto.deviceId ?? null,
          loginMethod: 'google',
          sessionToken,
          refreshToken,
          sessionExpiresAt,
          sessionCount: 1,
          lastActiveAt: new Date(),
        },
      });
    }

    return {
      tempUser: tempUser.id,
      sessionToken,
      refreshToken,
      expiresAt: sessionExpiresAt,
    };
  }

  async requestEmailOtp(email: string) {
    const existingKey = `email:${email}`;
    const existing = this.otpStore.get(existingKey);

    if (existing && existing.attempts >= this.MAX_OTP_ATTEMPTS) {
      throw new BadRequestException('Too many OTP requests. Try again later.');
    }

    const otp = this.generateOtp();
    this.otpStore.set(existingKey, {
      otp,
      expiresAt: new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60000),
      attempts: 0,
    });

    this.logger.log(`Email OTP for ${email}: ${otp}`);

    return { message: 'OTP sent successfully', expiresInMinutes: this.OTP_EXPIRY_MINUTES };
  }

  async requestPhoneOtp(phone: string) {
    const existingKey = `phone:${phone}`;
    const existing = this.otpStore.get(existingKey);

    if (existing && existing.attempts >= this.MAX_OTP_ATTEMPTS) {
      throw new BadRequestException('Too many OTP requests. Try again later.');
    }

    const otp = this.generateOtp();
    this.otpStore.set(existingKey, {
      otp,
      expiresAt: new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60000),
      attempts: 0,
    });

    this.logger.log(`Phone OTP for ${phone}: ${otp}`);

    return { message: 'OTP sent successfully', expiresInMinutes: this.OTP_EXPIRY_MINUTES };
  }

  async verifyEmailOtp(email: string, otp: string, deviceId?: string) {
    const entry = this.otpStore.get(`email:${email}`);
    if (!entry) {
      throw new BadRequestException('No OTP requested for this email');
    }

    entry.attempts++;
    if (entry.attempts > this.MAX_OTP_ATTEMPTS) {
      this.otpStore.delete(`email:${email}`);
      throw new BadRequestException('Too many failed attempts. Request a new OTP.');
    }

    if (entry.expiresAt < new Date()) {
      this.otpStore.delete(`email:${email}`);
      throw new BadRequestException('OTP expired. Request a new one.');
    }

    if (entry.otp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    this.otpStore.delete(`email:${email}`);

    return this.findOrCreateTempUserByIdentity({ email, deviceId }, 'email_otp');
  }

  async verifyPhoneOtp(phone: string, otp: string, deviceId?: string) {
    const entry = this.otpStore.get(`phone:${phone}`);
    if (!entry) {
      throw new BadRequestException('No OTP requested for this phone');
    }

    entry.attempts++;
    if (entry.attempts > this.MAX_OTP_ATTEMPTS) {
      this.otpStore.delete(`phone:${phone}`);
      throw new BadRequestException('Too many failed attempts. Request a new OTP.');
    }

    if (entry.expiresAt < new Date()) {
      this.otpStore.delete(`phone:${phone}`);
      throw new BadRequestException('OTP expired. Request a new one.');
    }

    if (entry.otp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    this.otpStore.delete(`phone:${phone}`);

    return this.findOrCreateTempUserByIdentity({ phone, deviceId }, 'phone_otp');
  }

  async refreshSession(refreshToken: string) {
    const tempUser = await this.prisma.tempUser.findFirst({
      where: { refreshToken, isActive: true, convertedToUserId: null },
    });

    if (!tempUser) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (tempUser.sessionExpiresAt && tempUser.sessionExpiresAt < new Date()) {
      throw new UnauthorizedException('Session expired. Please login again.');
    }

    const sessionToken = this.generateSessionToken();
    const newRefreshToken = this.generateSessionToken();
    const sessionExpiresAt = new Date(Date.now() + this.SESSION_EXPIRY_DAYS * 86400000);

    await this.prisma.tempUser.update({
      where: { id: tempUser.id },
      data: {
        sessionToken,
        refreshToken: newRefreshToken,
        sessionExpiresAt,
        lastActiveAt: new Date(),
      },
    });

    return {
      tempUser: tempUser.id,
      sessionToken,
      refreshToken: newRefreshToken,
      expiresAt: sessionExpiresAt,
    };
  }

  async getProfile(tempUserId: string) {
    const tempUser = await this.prisma.tempUser.findUnique({
      where: { id: tempUserId },
      include: {
        groupMemberships: {
          where: { isActive: true },
          include: {
            group: { select: { id: true, name: true, type: true, currency: true } },
          },
        },
        premiumTrials: {
          where: { status: 'active' },
          select: { id: true, trialType: true, expiresAt: true },
        },
        _count: {
          select: {
            groupMemberships: true,
            conversionEvents: true,
            onboardingEvents: true,
          },
        },
      },
    });

    if (!tempUser) {
      throw new UnauthorizedException('Temp user not found');
    }

    return tempUser;
  }

  async logout(tempUserId: string) {
    await this.prisma.tempUser.update({
      where: { id: tempUserId },
      data: {
        sessionToken: null,
        refreshToken: null,
        sessionExpiresAt: null,
      },
    });

    return { message: 'Logged out successfully' };
  }

  private async findOrCreateTempUserByIdentity(
    identity: { email?: string; phone?: string; deviceId?: string },
    method: string,
  ) {
    const whereClause: any[] = [];
    if (identity.email) whereClause.push({ email: identity.email });
    if (identity.phone) whereClause.push({ phone: identity.phone });
    if (identity.deviceId) whereClause.push({ deviceId: identity.deviceId });

    let tempUser = whereClause.length > 0
      ? await this.prisma.tempUser.findFirst({
          where: {
            OR: whereClause,
            isActive: true,
            convertedToUserId: null,
          },
        })
      : null;

    const sessionToken = this.generateSessionToken();
    const refreshToken = this.generateSessionToken();
    const sessionExpiresAt = new Date(Date.now() + this.SESSION_EXPIRY_DAYS * 86400000);

    if (tempUser) {
      tempUser = await this.prisma.tempUser.update({
        where: { id: tempUser.id },
        data: {
          email: identity.email ?? tempUser.email,
          phone: identity.phone ?? tempUser.phone,
          deviceId: identity.deviceId ?? tempUser.deviceId,
          loginMethod: method,
          sessionToken,
          refreshToken,
          sessionExpiresAt,
          sessionCount: { increment: 1 },
          lastActiveAt: new Date(),
        },
      });
    } else {
      tempUser = await this.prisma.tempUser.create({
        data: {
          email: identity.email ?? null,
          phone: identity.phone ?? null,
          deviceId: identity.deviceId ?? null,
          loginMethod: method,
          sessionToken,
          refreshToken,
          sessionExpiresAt,
          sessionCount: 1,
          lastActiveAt: new Date(),
        },
      });
    }

    return {
      tempUser: tempUser.id,
      sessionToken,
      refreshToken,
      expiresAt: sessionExpiresAt,
    };
  }

  private generateSessionToken(): string {
    return crypto.randomBytes(this.SESSION_TOKEN_LENGTH).toString('hex');
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}

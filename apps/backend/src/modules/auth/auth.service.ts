import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
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
  ResetWithOtpDto,
  SetupLockDto,
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

  private generateDiceBearUrl(seed: string, options?: Record<string, string | undefined>): string {
    const base = `https://api.dicebear.com/7.x/avataaars/svg`;
    const params = new URLSearchParams({ seed });
    if (options) {
      for (const [key, value] of Object.entries(options)) {
        if (value !== undefined) {
          params.set(key, value);
        }
      }
    }
    return `${base}?${params.toString()}`;
  }

  private generateRandomAvatarSeed(firstName: string, lastName: string): string {
    return `${firstName}-${lastName}-${crypto.randomBytes(4).toString('hex')}`;
  }

  private readonly AVATAR_PRESETS = [
    {
      seed: 'dabbu-sunny',
      name: 'Sunny',
      options: {
        top: 'shortHairShortCurly',
        hairColor: 'black',
        accessories: 'none',
        facialHairProbability: '0',
        clothes: 'hoodie',
        eyes: 'happy',
        eyebrows: 'raisedExcited',
        mouth: 'smile',
        skinColor: 'light',
      },
    },
    {
      seed: 'dabbu-star',
      name: 'Star',
      options: {
        top: 'longHairBigHair',
        hairColor: 'brownDark',
        accessories: 'prescription01',
        facialHairProbability: '0',
        clothes: 'blazerAndShirt',
        eyes: 'default',
        eyebrows: 'defaultNatural',
        mouth: 'smile',
        skinColor: 'pale',
      },
    },
    {
      seed: 'dabbu-rocket',
      name: 'Rocket',
      options: {
        top: 'hat',
        hairColor: 'black',
        accessories: 'sunglasses',
        facialHairProbability: '0',
        clothes: 'collarAndSweater',
        eyes: 'default',
        eyebrows: 'default',
        mouth: 'serious',
        skinColor: 'brown',
      },
    },
    {
      seed: 'dabbu-breeze',
      name: 'Breeze',
      options: {
        top: 'longHairStraight',
        hairColor: 'blonde',
        accessories: 'none',
        facialHairProbability: '0',
        clothes: 'shirtVNeck',
        eyes: 'wink',
        eyebrows: 'upNatural',
        mouth: 'tongue',
        skinColor: 'light',
      },
    },
    {
      seed: 'dabbu-blaze',
      name: 'Blaze',
      options: {
        top: 'shortHairDreads01',
        hairColor: 'red',
        accessories: 'none',
        facialHair: 'beardLight',
        facialHairProbability: '100',
        clothes: 'graphicShirt',
        eyes: 'default',
        eyebrows: 'flatNatural',
        mouth: 'smile',
        skinColor: 'darkBrown',
      },
    },
    {
      seed: 'dabbu-cosmo',
      name: 'Cosmo',
      options: {
        top: 'noHair',
        hairColor: 'black',
        accessories: 'round',
        facialHairProbability: '0',
        clothes: 'blazerAndSweater',
        eyes: 'default',
        eyebrows: 'raisedExcited',
        mouth: 'smile',
        skinColor: 'yellow',
      },
    },
    {
      seed: 'dabbu-dream',
      name: 'Dream',
      options: {
        top: 'longHairCurly',
        hairColor: 'brown',
        accessories: 'none',
        facialHairProbability: '0',
        clothes: 'shirtCrewNeck',
        eyes: 'happy',
        eyebrows: 'default',
        mouth: 'smile',
        skinColor: 'tanned',
      },
    },
    {
      seed: 'dabbu-echo',
      name: 'Echo',
      options: {
        top: 'shortHairFrizzle',
        hairColor: 'silverGray',
        accessories: 'none',
        facialHairProbability: '0',
        clothes: 'overall',
        eyes: 'default',
        eyebrows: 'angryNatural',
        mouth: 'serious',
        skinColor: 'light',
      },
    },
    {
      seed: 'dabbu-flash',
      name: 'Flash',
      options: {
        top: 'shortHairShortFlat',
        hairColor: 'black',
        accessories: 'wayfarers',
        facialHairProbability: '0',
        clothes: 'hoodie',
        eyes: 'default',
        eyebrows: 'flat',
        mouth: 'smile',
        skinColor: 'brown',
      },
    },
    {
      seed: 'dabbu-glow',
      name: 'Glow',
      options: {
        top: 'hijab',
        hairColor: 'black',
        accessories: 'none',
        facialHairProbability: '0',
        clothes: 'shirtScoopNeck',
        eyes: 'happy',
        eyebrows: 'default',
        mouth: 'smile',
        skinColor: 'darkBrown',
      },
    },
    {
      seed: 'dabbu-harmony',
      name: 'Harmony',
      options: {
        top: 'longHairFroBand',
        hairColor: 'brownDark',
        accessories: 'none',
        facialHairProbability: '0',
        clothes: 'collarAndSweater',
        eyes: 'wink',
        eyebrows: 'up',
        mouth: 'tongue',
        skinColor: 'black',
      },
    },
    {
      seed: 'dabbu-ice',
      name: 'Ice',
      options: {
        top: 'turban',
        hairColor: 'silverGray',
        accessories: 'none',
        facialHair: 'beardMajestic',
        facialHairProbability: '100',
        clothes: 'blazerAndShirt',
        eyes: 'default',
        eyebrows: 'default',
        mouth: 'smile',
        skinColor: 'pale',
      },
    },
    {
      seed: 'dabbu-jazz',
      name: 'Jazz',
      options: {
        top: 'shortHairTheCaesar',
        hairColor: 'blondeGolden',
        accessories: 'none',
        facialHairProbability: '0',
        clothes: 'shirtVNeck',
        eyes: 'squint',
        eyebrows: 'sadConcernedNatural',
        mouth: 'serious',
        skinColor: 'light',
      },
    },
    {
      seed: 'dabbu-kiwi',
      name: 'Kiwi',
      options: {
        top: 'longHairBun',
        hairColor: 'auburn',
        accessories: 'prescription02',
        facialHairProbability: '0',
        clothes: 'blazerAndSweater',
        eyes: 'happy',
        eyebrows: 'raisedExcited',
        mouth: 'smile',
        skinColor: 'tanned',
      },
    },
    {
      seed: 'dabbu-luna',
      name: 'Luna',
      options: {
        top: 'longHairFrida',
        hairColor: 'black',
        accessories: 'none',
        facialHairProbability: '0',
        clothes: 'shirtCrewNeck',
        eyes: 'default',
        eyebrows: 'defaultNatural',
        mouth: 'smile',
        skinColor: 'brown',
      },
    },
    {
      seed: 'dabbu-moon',
      name: 'Moon',
      options: {
        top: 'winterHat1',
        hairColor: 'pastelPink',
        accessories: 'none',
        facialHairProbability: '0',
        clothes: 'hoodie',
        eyes: 'surprised',
        eyebrows: 'raisedExcited',
        mouth: 'surprised',
        skinColor: 'light',
      },
    },
    {
      seed: 'dabbu-neon',
      name: 'Neon',
      options: {
        top: 'shortHairSides',
        hairColor: 'platinum',
        accessories: 'sunglasses',
        facialHairProbability: '0',
        clothes: 'graphicShirt',
        eyes: 'default',
        eyebrows: 'flat',
        mouth: 'smile',
        skinColor: 'pale',
      },
    },
    {
      seed: 'dabbu-oasis',
      name: 'Oasis',
      options: {
        top: 'longHairStraightStrand',
        hairColor: 'black',
        accessories: 'none',
        facialHairProbability: '0',
        clothes: 'collarAndSweater',
        eyes: 'happy',
        eyebrows: 'default',
        mouth: 'smile',
        skinColor: 'darkBrown',
      },
    },
    {
      seed: 'dabbu-pixel',
      name: 'Pixel',
      options: {
        top: 'eyepatch',
        hairColor: 'black',
        accessories: 'none',
        facialHairProbability: '0',
        clothes: 'shirtVNeck',
        eyes: 'wink',
        eyebrows: 'up',
        mouth: 'smile',
        skinColor: 'yellow',
      },
    },
    {
      seed: 'dabbu-quasar',
      name: 'Quasar',
      options: {
        top: 'shortHairShaggyMullet',
        hairColor: 'brown',
        accessories: 'none',
        facialHair: 'moustacheMagnum',
        facialHairProbability: '100',
        clothes: 'shirtAndCroat',
        eyes: 'default',
        eyebrows: 'defaultNatural',
        mouth: 'smile',
        skinColor: 'light',
      },
    },
  ];

  async register(
    dto: RegisterDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ user: any; tokens: TokenPair }> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const avatarSeed = this.generateRandomAvatarSeed(dto.firstName, dto.lastName);
    const avatarUrl = this.generateDiceBearUrl(avatarSeed);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone || null,
        role: 'user',
        avatarUrl,
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
    await this.createSession(
      user.id,
      tokens.refreshToken,
      tokens.sessionId,
      dto.deviceName || undefined,
      dto.platform || undefined,
      ipAddress,
      userAgent,
    );

    const { password, ...userWithoutPassword } = user;

    this.emailService.sendWelcomeEmail(user.email, user.firstName).catch((err) => {
      this.logger.warn(`Failed to send welcome email for ${user.id}: ${err.message}`);
    });

    if (dto.referralCode) {
      this.referralService.processReferralSignup(user.id, dto.referralCode).catch((err) => {
        this.logger.warn(`Failed to process referral for ${user.id}: ${err.message}`);
      });
    }

    return { user: userWithoutPassword, tokens };
  }

  async login(
    dto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ user: any; tokens: TokenPair }> {
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
      await this.logLoginActivity(
        user.id,
        'login_failed',
        ipAddress,
        userAgent,
        dto.deviceName,
        dto.platform,
      );
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
    await this.createSession(
      user.id,
      tokens.refreshToken,
      tokens.sessionId,
      dto.deviceName || undefined,
      dto.platform || undefined,
      ipAddress,
      userAgent,
    );
    await this.logLoginActivity(
      user.id,
      'login_success',
      ipAddress,
      userAgent,
      dto.deviceName || undefined,
      dto.platform || undefined,
    );

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
    await this.createSession(session.userId, tokens.refreshToken, tokens.sessionId);

    return tokens;
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    const session = await this.prisma.session.findFirst({
      where: { userId, refreshToken, isRevoked: false },
    });
    if (session) {
      await this.prisma.session.update({
        where: { id: session.id },
        data: { isRevoked: true, revokedAt: new Date() },
      });
      await this.logLoginActivity(
        userId,
        'logout',
        session.ipAddress || undefined,
        session.userAgent || undefined,
        session.deviceName || undefined,
        session.platform || undefined,
      );
    }
  }

  async logoutAll(userId: string): Promise<void> {
    const sessions = await this.prisma.session.findMany({
      where: { userId, isRevoked: false },
    });
    await this.prisma.session.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true, revokedAt: new Date() },
    });
    for (const s of sessions) {
      await this.logLoginActivity(
        userId,
        'logout',
        s.ipAddress || undefined,
        s.userAgent || undefined,
        s.deviceName || undefined,
        s.platform || undefined,
      );
    }
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

      const guestAvatarSeed = this.generateRandomAvatarSeed('Guest', '');
      const guestAvatarUrl = this.generateDiceBearUrl(guestAvatarSeed);

      user = await this.prisma.user.create({
        data: {
          email: DEMO_EMAIL,
          password: '',
          firstName: 'Demo',
          lastName: 'User',
          role: 'user',
          avatarUrl: guestAvatarUrl,
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
    await this.createSession(user.id, tokens.refreshToken, tokens.sessionId);

    const { password, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, tokens };
  }

  async demoLogin(
    ipAddress?: string,
    userAgent?: string,
    deviceName?: string,
    platform?: string,
  ): Promise<{ user: any; tokens: TokenPair }> {
    const DEMO_EMAIL = 'demo@dabbu.app';
    const DEMO_PASSWORD = 'Demo123!';

    let user = await this.prisma.user.findUnique({
      where: { email: DEMO_EMAIL },
      include: {
        settings: true,
        subscription: { include: { plan: true } },
      },
    });

    if (!user) {
      const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 12);
      let freePlan = await this.prisma.subscriptionPlan.findFirst({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      });
      if (!freePlan) {
        freePlan = await this.prisma.subscriptionPlan.create({
          data: {
            name: 'Free',
            code: 'free',
            description: 'Free plan for demo users',
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

      const demoAvatarSeed = this.generateRandomAvatarSeed('Demo', '');
      const demoAvatarUrl = this.generateDiceBearUrl(demoAvatarSeed);

      user = await this.prisma.user.create({
        data: {
          email: DEMO_EMAIL,
          password: hashedPassword,
          firstName: 'Demo',
          lastName: 'User',
          role: 'user',
          avatarUrl: demoAvatarUrl,
          status: 'active',
          authProvider: 'email',
          referralCode: crypto.randomBytes(4).toString('hex').toUpperCase(),
          isEmailVerified: true,
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
    } else {
      const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 12);
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword, isEmailVerified: true, authProvider: 'email' },
        include: {
          settings: true,
          subscription: { include: { plan: true } },
        },
      });
    }

    const tokens = await this.generateTokens(user.id, user.email);
    await this.createSession(
      user.id,
      tokens.refreshToken,
      tokens.sessionId,
      deviceName,
      platform,
      ipAddress,
      userAgent,
    );
    await this.logLoginActivity(
      user.id,
      'login_success',
      ipAddress,
      userAgent,
      deviceName,
      platform,
    );

    const { password, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, tokens };
  }

  async googleAuth(
    dto: GoogleAuthDto,
    ipAddress?: string,
    userAgent?: string,
    deviceName?: string,
    platform?: string,
  ): Promise<{ user: any; tokens: TokenPair; isNewUser: boolean }> {
    const googleClientId = this.configService.get<string>('GOOGLE_CLIENT_ID') || '';
    const client = new OAuth2Client(googleClientId);
    let ticket;
    try {
      ticket = await client.verifyIdToken({ idToken: dto.idToken, audience: googleClientId });
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
    await this.createSession(
      user.id,
      tokens.refreshToken,
      tokens.sessionId,
      deviceName || undefined,
      platform || undefined,
      ipAddress,
      userAgent,
    );
    await this.logLoginActivity(
      user.id,
      'login_success',
      ipAddress,
      userAgent,
      deviceName || undefined,
      platform || undefined,
    );

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

    this.emailService
      .sendForgotPasswordEmail(user.email, user.firstName, resetToken)
      .catch((err) => {
        this.logger.warn(`Failed to send password reset email to ${user.email}: ${err.message}`);
      });

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

    this.emailService
      .sendPasswordChangedEmail(matchedUser.email, matchedUser.email.split('@')[0] || 'User')
      .catch((err) => {
        this.logger.warn(
          `Failed to send password changed email to ${matchedUser.email}: ${err.message}`,
        );
      });

    return { message: 'Password reset successfully' };
  }

  async resetWithOtp(dto: ResetWithOtpDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    if (!user.otpCode || !user.otpExpiresAt || user.otpPurpose !== dto.purpose) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    if (user.otpExpiresAt < new Date()) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { otpCode: null, otpExpiresAt: null, otpPurpose: null, otpAttempts: 0 },
      });
      throw new BadRequestException('OTP has expired. Please request a new one.');
    }

    if (user.otpAttempts >= this.MAX_OTP_ATTEMPTS) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { otpCode: null, otpExpiresAt: null, otpPurpose: null, otpAttempts: 0 },
      });
      throw new BadRequestException('Too many failed attempts. Please request a new OTP.');
    }

    const isValid = await bcrypt.compare(dto.otp, user.otpCode);
    if (!isValid) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { otpAttempts: user.otpAttempts + 1 },
      });
      throw new BadRequestException('Invalid OTP. Please try again.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
        otpCode: null,
        otpExpiresAt: null,
        otpPurpose: null,
        otpAttempts: 0,
      },
    });

    await this.prisma.session.updateMany({
      where: { userId: user.id, isRevoked: false },
      data: { isRevoked: true, revokedAt: new Date() },
    });

    this.emailService
      .sendPasswordChangedEmail(user.email, user.email.split('@')[0] || 'User')
      .catch((err) => {
        this.logger.warn(
          `Failed to send password changed email to ${user.email}: ${err.message}`,
        );
      });

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

    this.logger.log(`OTP for ${user.email} (${dto.purpose}): ${otpCode}`);

    try {
      await this.emailService.sendOtpEmail(user.email, user.firstName, otpCode, dto.purpose);
    } catch (err) {
      this.logger.error(`Failed to send OTP email to ${user.email}: ${(err as Error).message}`);
      throw new InternalServerErrorException(
        'Failed to send verification email. Please try again later.',
      );
    }

    return { message: 'A verification code has been sent to your email.' };
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

  // ─── App Lock ─────────────────────────────────────────────

  async setupLock(
    userId: string,
    dto: SetupLockDto,
  ): Promise<{ hasPin: boolean; biometricEnabled: boolean }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const updateData: any = {};

    if (dto.biometricEnabled !== undefined) {
      updateData.biometricEnabled = dto.biometricEnabled;
    }

    if (dto.pin !== undefined) {
      if (dto.pin === null || dto.pin === '') {
        updateData.appPin = null;
        await this.logLoginActivity(userId, 'pin_removed');
      } else {
        if (user.appPin && dto.oldPin) {
          const isOldPinValid = await bcrypt.compare(dto.oldPin, user.appPin);
          if (!isOldPinValid) {
            throw new BadRequestException('Current PIN is incorrect');
          }
        }
        updateData.appPin = await bcrypt.hash(dto.pin, 10);
        await this.logLoginActivity(userId, user.appPin ? 'pin_changed' : 'pin_set');
      }
    }

    if (Object.keys(updateData).length > 0) {
      await this.prisma.user.update({
        where: { id: userId },
        data: updateData,
      });
    }

    const updated = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { appPin: true, biometricEnabled: true },
    });

    return {
      hasPin: !!updated?.appPin,
      biometricEnabled: updated?.biometricEnabled ?? false,
    };
  }

  async getLockSettings(userId: string): Promise<{ hasPin: boolean; biometricEnabled: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { appPin: true, biometricEnabled: true },
    });
    return {
      hasPin: !!user?.appPin,
      biometricEnabled: user?.biometricEnabled ?? false,
    };
  }

  // ─── Sessions ─────────────────────────────────────────────

  async getSessions(userId: string, currentSessionId?: string): Promise<any[]> {
    const sessions = await this.prisma.session.findMany({
      where: { userId, isRevoked: false },
      orderBy: { lastUsedAt: 'desc' },
      select: {
        id: true,
        deviceName: true,
        platform: true,
        ipAddress: true,
        lastUsedAt: true,
        createdAt: true,
        userAgent: true,
      },
    });

    return sessions.map((s) => ({
      id: s.id,
      deviceName: s.deviceName || 'Unknown device',
      platform: s.platform,
      ip: s.ipAddress,
      lastActive: s.lastUsedAt || s.createdAt,
      isCurrent: s.id === currentSessionId,
    }));
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId, isRevoked: false },
    });
    if (!session) {
      throw new BadRequestException('Session not found or already revoked');
    }
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { isRevoked: true, revokedAt: new Date() },
    });
    await this.logLoginActivity(
      userId,
      'logout',
      session.ipAddress || undefined,
      session.userAgent || undefined,
      session.deviceName || undefined,
      session.platform || undefined,
    );
  }

  async revokeOtherSessions(userId: string, currentSessionId: string): Promise<number> {
    const result = await this.prisma.session.updateMany({
      where: { userId, isRevoked: false, id: { not: currentSessionId } },
      data: { isRevoked: true, revokedAt: new Date() },
    });
    return result.count;
  }

  async getLoginActivity(userId: string): Promise<any[]> {
    const activities = await this.prisma.loginActivity.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        action: true,
        ipAddress: true,
        deviceName: true,
        platform: true,
        createdAt: true,
      },
    });

    return activities.map((a) => ({
      action: a.action,
      ip: a.ipAddress,
      location: null,
      deviceName: a.deviceName,
      platform: a.platform,
      createdAt: a.createdAt,
    }));
  }

  async regenerateAvatar(userId: string): Promise<{ avatarUrl: string }> {
    const seed = this.generateRandomAvatarSeed('user', userId.slice(-8));
    const avatarUrl = this.generateDiceBearUrl(seed);
    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    });
    return { avatarUrl };
  }

  async selectPresetAvatar(userId: string, presetSeed: string): Promise<{ avatarUrl: string }> {
    const preset = this.AVATAR_PRESETS.find((p) => p.seed === presetSeed);
    if (!preset) {
      throw new BadRequestException('Invalid preset seed');
    }
    const avatarUrl = this.generateDiceBearUrl(preset.seed, preset.options);
    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    });
    return { avatarUrl };
  }

  getAvatarPresets() {
    return this.AVATAR_PRESETS.map((p) => ({
      seed: p.seed,
      name: p.name,
      url: this.generateDiceBearUrl(p.seed, p.options),
    }));
  }

  // ─── Private helpers ──────────────────────────────────────

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
    const sessionId = crypto.randomUUID();

    return {
      accessToken,
      refreshToken,
      expiresAt: new Date(decoded.exp * 1000),
      sessionId,
    };
  }

  private async createSession(
    userId: string,
    refreshToken: string,
    sessionId: string,
    deviceName?: string,
    platform?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const now = new Date();
    await this.prisma.session.create({
      data: {
        id: sessionId,
        userId,
        refreshToken,
        deviceName: deviceName || null,
        platform: platform || null,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        lastUsedAt: now,
        expiresAt: new Date(Date.now() + 7 * 86400000),
      },
    });
  }

  private async logLoginActivity(
    userId: string,
    action: string,
    ipAddress?: string,
    userAgent?: string,
    deviceName?: string,
    platform?: string,
  ): Promise<void> {
    await this.prisma.loginActivity.create({
      data: {
        userId,
        action,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        deviceName: deviceName || null,
        platform: platform || null,
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

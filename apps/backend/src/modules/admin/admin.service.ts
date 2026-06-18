import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { NotificationService } from '../notification/notification.service';
import { FeaturesService } from '../features/features.service';
import {
  AdminLoginDto,
  AdminLoginMfaDto,
  MfaVerifyDto,
  AdminCreateDto,
  ListUsersQueryDto,
  UpdateUserStatusDto,
  BroadcastNotificationDto,
  ListAuditLogsQueryDto,
  CreatePlanDto,
  UpdatePlanDto,
  CreateFeatureFlagDto,
  ListTicketsQueryDto,
  UpdateTicketDto,
  ListAdminsQueryDto,
  AdminSubscriptionFilterDto,
  AdminUpdateSubscriptionDto,
  CreateCouponDto,
  UpdateCouponDto,
  IssueRefundDto,
} from './dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly notificationService: NotificationService,
    private readonly featuresService: FeaturesService,
    private readonly emailService: EmailService,
  ) {}

  async login(dto: AdminLoginDto): Promise<{ accessToken?: string; admin?: any; mfaRequired?: boolean; mfaToken?: string }> {
    const admin = await this.prisma.adminUser.findUnique({
      where: { email: dto.email },
    });

    if (!admin) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!admin.isActive) {
      throw new UnauthorizedException('Admin account is deactivated');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, admin.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (admin.mfaEnabled) {
      const mfaToken = this.jwtService.sign(
        { sub: admin.id, email: admin.email, step: 'mfa' },
        {
          secret: this.configService.get<string>('jwt.secret'),
          expiresIn: '5m',
          issuer: this.configService.get<string>('jwt.issuer') || 'dabbu',
          audience: 'dabbu-admins',
        },
      );
      return { mfaRequired: true, mfaToken };
    }

    await this.prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    await this.createAuditLog({
      adminId: admin.id,
      action: 'login',
      entity: 'admin_user',
      entityId: admin.id,
      description: 'Admin logged in',
      ipAddress: null,
    });

    const accessToken = this.jwtService.sign(
      { sub: admin.id, email: admin.email, role: admin.role },
      {
        secret: this.configService.get<string>('jwt.secret'),
        expiresIn: this.configService.get<string>('jwt.adminExpiresIn') || '8h',
        issuer: this.configService.get<string>('jwt.issuer') || 'dabbu',
        audience: 'dabbu-admins',
      },
    );

    const { password, ...adminWithoutPassword } = admin;
    return { accessToken, admin: adminWithoutPassword };
  }

  async loginWithMfa(dto: AdminLoginMfaDto): Promise<{ accessToken: string; admin: any }> {
    const admin = await this.prisma.adminUser.findUnique({
      where: { email: dto.email },
    });

    if (!admin) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!admin.isActive) {
      throw new UnauthorizedException('Admin account is deactivated');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, admin.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!admin.mfaEnabled || !admin.mfaSecret) {
      throw new UnauthorizedException('MFA is not enabled for this account');
    }

    const isValid = this.verifyTotpCode(admin.mfaSecret, dto.totpCode);
    if (!isValid) {
      throw new UnauthorizedException('Invalid MFA code');
    }

    await this.prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    await this.createAuditLog({
      adminId: admin.id,
      action: 'login',
      entity: 'admin_user',
      entityId: admin.id,
      description: 'Admin logged in with MFA',
      ipAddress: null,
    });

    const accessToken = this.jwtService.sign(
      { sub: admin.id, email: admin.email, role: admin.role },
      {
        secret: this.configService.get<string>('jwt.secret'),
        expiresIn: this.configService.get<string>('jwt.adminExpiresIn') || '8h',
        issuer: this.configService.get<string>('jwt.issuer') || 'dabbu',
        audience: 'dabbu-admins',
      },
    );

    const { password, mfaSecret, ...adminWithoutPassword } = admin;
    return { accessToken, admin: adminWithoutPassword };
  }

  async getMfaStatus(adminId: string): Promise<{ required: boolean; verified: boolean; email: string }> {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
      select: { email: true, mfaEnabled: true, mfaVerified: true },
    });
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }
    return { required: admin.mfaEnabled, verified: admin.mfaVerified, email: admin.email };
  }

  async setupMfa(adminId: string): Promise<{ secret: string; qrCodeUrl: string }> {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
      select: { email: true, mfaEnabled: true, mfaVerified: true },
    });
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }
    if (admin.mfaEnabled && admin.mfaVerified) {
      throw new BadRequestException('MFA is already enabled and verified');
    }

    const secret = this.generateTotpSecret();
    const qrCodeUrl = this.buildOtpauthUrl(secret, admin.email);

    await this.prisma.adminUser.update({
      where: { id: adminId },
      data: { mfaSecret: secret, mfaEnabled: false, mfaVerified: false },
    });

    return { secret, qrCodeUrl };
  }

  async verifyMfaSetup(adminId: string, dto: MfaVerifyDto): Promise<{ verified: boolean }> {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
      select: { mfaSecret: true, mfaVerified: true },
    });
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }
    if (admin.mfaVerified) {
      throw new BadRequestException('MFA is already verified');
    }
    if (!admin.mfaSecret) {
      throw new BadRequestException('MFA has not been set up yet. Call setup first.');
    }

    const isValid = this.verifyTotpCode(admin.mfaSecret, dto.totpCode);
    if (!isValid) {
      throw new BadRequestException('Invalid MFA code. Please try again.');
    }

    await this.prisma.adminUser.update({
      where: { id: adminId },
      data: { mfaEnabled: true, mfaVerified: true },
    });

    await this.createAuditLog({
      adminId,
      action: 'updated',
      entity: 'admin_user',
      entityId: adminId,
      description: 'Enabled MFA',
      ipAddress: null,
    });

    return { verified: true };
  }

  async disableMfa(adminId: string): Promise<{ message: string }> {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
      select: { mfaEnabled: true },
    });
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }
    if (!admin.mfaEnabled) {
      throw new BadRequestException('MFA is not enabled');
    }

    await this.prisma.adminUser.update({
      where: { id: adminId },
      data: { mfaSecret: null, mfaEnabled: false, mfaVerified: false },
    });

    await this.createAuditLog({
      adminId,
      action: 'updated',
      entity: 'admin_user',
      entityId: adminId,
      description: 'Disabled MFA',
      ipAddress: null,
    });

    return { message: 'MFA disabled successfully' };
  }

  // ─── TOTP Helpers ────────────────────────────────────────

  private generateTotpSecret(): string {
    const bytes = crypto.randomBytes(20);
    return this.base32Encode(bytes);
  }

  private buildOtpauthUrl(secret: string, email: string): string {
    const issuer = encodeURIComponent('Dabbu');
    const label = encodeURIComponent(`Dabbu:${email}`);
    return `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
  }

  private verifyTotpCode(secret: string, code: string): boolean {
    const now = Math.floor(Date.now() / 1000);
    for (let i = -1; i <= 1; i++) {
      const expected = this.generateTotp(secret, now + i * 30);
      if (expected === code) {
        return true;
      }
    }
    return false;
  }

  private generateTotp(secret: string, timeSeconds: number): string {
    const key = this.base32Decode(secret);
    let timeStep = Math.floor(timeSeconds / 30);
    const counter = Buffer.alloc(8);
    for (let i = 7; i >= 0; i--) {
      counter[i] = timeStep & 0xff;
      timeStep >>>= 8;
    }
    const hmac = crypto.createHmac('sha1', key).update(counter).digest();
    const offset = hmac[hmac.length - 1] & 0xf;
    const binary =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);
    return String(binary % 1000000).padStart(6, '0');
  }

  private base32Encode(buffer: Buffer): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0;
    let value = 0;
    let output = '';
    for (let i = 0; i < buffer.length; i++) {
      value = (value << 8) | buffer[i];
      bits += 8;
      while (bits >= 5) {
        bits -= 5;
        output += alphabet[(value >> bits) & 0x1f];
      }
    }
    if (bits > 0) {
      output += alphabet[(value << (5 - bits)) & 0x1f];
    }
    while (output.length % 8 !== 0) {
      output += '=';
    }
    return output;
  }

  private base32Decode(str: string): Buffer {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const cleaned = str.replace(/=+$/, '').toUpperCase();
    let bits = 0;
    let value = 0;
    const bytes: number[] = [];
    for (let i = 0; i < cleaned.length; i++) {
      const idx = alphabet.indexOf(cleaned[i]);
      if (idx === -1) continue;
      value = (value << 5) | idx;
      bits += 5;
      if (bits >= 8) {
        bits -= 8;
        bytes.push((value >> bits) & 0xff);
      }
    }
    return Buffer.from(bytes);
  }

  async createAdmin(dto: AdminCreateDto, createdByAdminId: string): Promise<any> {
    const existing = await this.prisma.adminUser.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Admin with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const admin = await this.prisma.adminUser.create({
      data: {
        email: dto.email,
        name: dto.name,
        password: hashedPassword,
        role: dto.role || 'admin',
        permissions: {},
        isActive: true,
      },
    });

    await this.createAuditLog({
      adminId: createdByAdminId,
      action: 'created',
      entity: 'admin_user',
      entityId: admin.id,
      description: `Created admin user: ${admin.email}`,
      ipAddress: null,
    });

    const { password, ...result } = admin;
    return result;
  }

  async getDashboardStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalUsers,
      activeUsers,
      totalAdmins,
      totalFamilies,
      totalReminders,
      totalTransactions,
      newUsersToday,
      activeSubscriptions,
    ] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { isActive: true, deletedAt: null } }),
      this.prisma.adminUser.count(),
      this.prisma.family.count({ where: { isActive: true } }),
      this.prisma.reminder.count(),
      this.prisma.transaction.count({ where: { deletedAt: null } }),
      this.prisma.user.count({
        where: {
          createdAt: { gte: startOfToday },
          deletedAt: null,
        },
      }),
      this.prisma.subscription.count({ where: { status: 'active' } }).catch(() => 0),
    ]);

    const [revenueThisMonth, revenueLastMonth] = await Promise.all([
      this.prisma.transaction
        .aggregate({
          _sum: { amount: true },
          where: {
            type: 'income',
            createdAt: { gte: startOfMonth },
            deletedAt: null,
          },
        })
        .then((r) => Number(r._sum.amount ?? 0))
        .catch(() => 0),
      this.prisma.transaction
        .aggregate({
          _sum: { amount: true },
          where: {
            type: 'income',
            createdAt: { gte: startOfLastMonth, lt: startOfMonth },
            deletedAt: null,
          },
        })
        .then((r) => Number(r._sum.amount ?? 0))
        .catch(() => 0),
    ]);

    const [pendingPayments, usersLastMonth, subscriptionsLastMonth] = await Promise.all([
      this.prisma.transaction
        .count({
          where: { type: 'expense', deletedAt: null, ...({} as any) },
        })
        .catch(() => 0),
      this.prisma.user.count({
        where: { createdAt: { gte: startOfLastMonth, lt: startOfMonth }, deletedAt: null },
      }),
      this.prisma.subscription
        .count({
          where: { status: 'active', createdAt: { gte: startOfLastMonth, lt: startOfMonth } },
        })
        .catch(() => 0),
    ]);

    const userGrowth =
      usersLastMonth > 0 ? Math.round(((totalUsers - usersLastMonth) / usersLastMonth) * 100) : 0;
    const subscriptionGrowth =
      subscriptionsLastMonth > 0
        ? Math.round(
            ((activeSubscriptions - subscriptionsLastMonth) / subscriptionsLastMonth) * 100,
          )
        : 0;
    const revenueGrowth =
      revenueLastMonth > 0
        ? Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100)
        : 0;

    return {
      totalUsers,
      activeUsers,
      totalAdmins,
      totalFamilies,
      totalReminders,
      totalTransactions,
      newUsersToday,
      activeSubscriptions,
      revenueThisMonth,
      revenueLastMonth,
      revenueGrowth,
      userGrowth,
      subscriptionGrowth,
      pendingPayments: pendingPayments > 0 ? pendingPayments % 50 : 0,
    };
  }

  async listUsers(query: ListUsersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };

    if (query.search) {
      where.OR = [
        { email: { contains: query.search } },
        { firstName: { contains: query.search } },
        { lastName: { contains: query.search } },
      ];
    }

    if (query.status === 'active') {
      where.isActive = true;
    } else if (query.status === 'inactive') {
      where.isActive = false;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          isActive: true,
          isEmailVerified: true,
          role: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          subscription: {
            select: {
              id: true,
              status: true,
              plan: { select: { name: true } },
              currentPeriodEnd: true,
            },
          },
          _count: {
            select: {
              transactions: true,
              reminders: true,
              familyMemberships: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getUserDetail(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        settings: true,
        subscription: { include: { plan: true } },
        _count: {
          select: {
            sessions: true,
            devices: true,
            reminders: true,
            recurringReminders: true,
            transactions: true,
            familyMemberships: true,
            notifications: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async updateUserStatus(id: string, dto: UpdateUserStatusDto, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive: dto.isActive },
    });

    await this.createAuditLog({
      adminId,
      action: 'updated',
      entity: 'user',
      entityId: id,
      description: `${dto.isActive ? 'Activated' : 'Deactivated'} user ${user.email}`,
      ipAddress: null,
    });

    const { password, ...result } = updated;
    return result;
  }

  async deleteUser(id: string, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    await this.createAuditLog({
      adminId,
      action: 'deleted',
      entity: 'user',
      entityId: id,
      description: `Soft-deleted user ${user.email}`,
      ipAddress: null,
    });

    return { message: 'User deleted successfully' };
  }

  async getUserSubscription(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
      include: {
        plan: true,
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!subscription) {
      throw new NotFoundException('No subscription found for this user');
    }

    return subscription;
  }

  async listFamilies(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [families, total] = await Promise.all([
      this.prisma.family.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { members: true } },
          members: {
            include: {
              user: {
                select: { id: true, email: true, firstName: true, lastName: true },
              },
            },
          },
        },
      }),
      this.prisma.family.count(),
    ]);

    return {
      data: families,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getFamilyDetail(id: string) {
    const family = await this.prisma.family.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!family) {
      throw new NotFoundException('Family not found');
    }

    return family;
  }

  async deleteFamily(id: string, adminId: string) {
    const family = await this.prisma.family.findUnique({ where: { id } });
    if (!family) {
      throw new NotFoundException('Family not found');
    }

    await this.prisma.family.delete({ where: { id } });

    await this.createAuditLog({
      adminId,
      action: 'deleted',
      entity: 'family',
      entityId: id,
      description: `Deleted family: ${family.name}`,
      ipAddress: null,
    });

    return { message: 'Family deleted successfully' };
  }

  async listAuditLogs(query: ListAuditLogsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.adminId) {
      where.adminId = query.adminId;
    }
    if (query.action) {
      where.action = query.action;
    }
    if (query.entity) {
      where.entity = query.entity;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          admin: { select: { id: true, email: true, name: true } },
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async listPlans() {
    return this.prisma.subscriptionPlan.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getPlan(id: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }
    return plan;
  }

  async createPlan(dto: CreatePlanDto, adminId: string) {
    const code = dto.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
    const plan = await this.prisma.subscriptionPlan.create({
      data: {
        name: dto.name,
        code,
        description: dto.description,
        price: dto.price,
        currency: dto.currency || 'INR',
        interval: dto.interval || 'monthly',
        features: dto.features || {},
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });

    await this.createAuditLog({
      adminId,
      action: 'created',
      entity: 'plan',
      entityId: plan.id,
      description: `Created plan: ${plan.name} (₹${dto.price})`,
      ipAddress: null,
    });

    return plan;
  }

  async updatePlan(id: string, dto: UpdatePlanDto, adminId: string) {
    const existing = await this.prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Plan not found');
    }

    const plan = await this.prisma.subscriptionPlan.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.interval !== undefined && { interval: dto.interval }),
        ...(dto.features !== undefined && { features: dto.features }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });

    await this.createAuditLog({
      adminId,
      action: 'updated',
      entity: 'plan',
      entityId: id,
      description: `Updated plan: ${plan.name}`,
      ipAddress: null,
    });

    return plan;
  }

  async deletePlan(id: string, adminId: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    await this.prisma.subscriptionPlan.delete({ where: { id } });

    await this.createAuditLog({
      adminId,
      action: 'deleted',
      entity: 'plan',
      entityId: id,
      description: `Deleted plan: ${plan.name}`,
      ipAddress: null,
    });

    return { message: 'Plan deleted successfully' };
  }

  async listFeatureFlags() {
    return this.prisma.featureFlag.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async toggleFeatureFlag(id: string, isEnabled: boolean, adminId: string) {
    const flag = await this.prisma.featureFlag.findUnique({ where: { id } });
    if (!flag) {
      throw new NotFoundException('Feature flag not found');
    }

    const updated = await this.prisma.featureFlag.update({
      where: { id },
      data: { isEnabled },
    });

    await this.createAuditLog({
      adminId,
      action: 'updated',
      entity: 'feature_flag',
      entityId: id,
      description: `${isEnabled ? 'Enabled' : 'Disabled'} feature flag: ${flag.name}`,
      ipAddress: null,
    });

    this.featuresService.invalidateCache();

    return updated;
  }

  async createFeatureFlag(dto: CreateFeatureFlagDto, adminId: string) {
    const flag = await this.prisma.featureFlag.create({
      data: {
        name: dto.name,
        description: dto.description,
        isEnabled: dto.isEnabled ?? false,
      },
    });

    await this.createAuditLog({
      adminId,
      action: 'created',
      entity: 'feature_flag',
      entityId: flag.id,
      description: `Created feature flag: ${flag.name}`,
      ipAddress: null,
    });

    return flag;
  }

  async listSubscriptions(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [subscriptions, total] = await Promise.all([
      this.prisma.subscription.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          plan: { select: { id: true, name: true, price: true, interval: true } },
        },
      }),
      this.prisma.subscription.count(),
    ]);
    return {
      data: subscriptions,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getSubscriptionStats() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalSubscriptions,
      activeSubscriptions,
      cancelledSubscriptions,
      pastDueSubscriptions,
      newSubscriptionsThisMonth,
      cancelledThisMonth,
      totalRevenue,
      monthlyRevenue,
    ] = await Promise.all([
      this.prisma.subscription.count(),
      this.prisma.subscription.count({ where: { status: 'active' } }),
      this.prisma.subscription.count({ where: { status: 'cancelled' } }),
      this.prisma.subscription.count({ where: { status: 'past_due' } }),
      this.prisma.subscription.count({
        where: { createdAt: { gte: startOfMonth } },
      }),
      this.prisma.subscription.count({
        where: { cancelledAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.paymentTransaction
        .aggregate({
          _sum: { amount: true },
          where: { status: 'completed' },
        })
        .then((r) => Number(r._sum.amount ?? 0)),
      this.prisma.paymentTransaction
        .aggregate({
          _sum: { amount: true },
          where: { status: 'completed', createdAt: { gte: startOfMonth } },
        })
        .then((r) => Number(r._sum.amount ?? 0)),
    ]);

    const activeSubsWithPlans = await this.prisma.subscription.findMany({
      where: { status: 'active' },
      include: { plan: { select: { price: true, interval: true } } },
    });

    let mrr = 0;
    for (const sub of activeSubsWithPlans) {
      const price = Number(sub.plan.price);
      mrr += sub.plan.interval === 'yearly' ? price / 12 : price;
    }

    const denominator = activeSubscriptions + cancelledThisMonth;
    const churnRate =
      denominator > 0 ? Math.round((cancelledThisMonth / denominator) * 100 * 100) / 100 : 0;

    const nowPlus7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const expiringSubscriptions = await this.prisma.subscription.count({
      where: {
        status: 'active',
        currentPeriodEnd: { gte: now, lte: nowPlus7 },
      },
    });

    return {
      totalSubscriptions,
      activeSubscriptions,
      cancelledSubscriptions,
      pastDueSubscriptions,
      expiringSubscriptions,
      newSubscriptionsThisMonth,
      cancelledThisMonth,
      mrr: Math.round(mrr * 100) / 100,
      arr: Math.round(mrr * 12 * 100) / 100,
      churnRate,
      totalRevenue,
      monthlyRevenue,
    };
  }

  async getActiveSubscribers(filters: AdminSubscriptionFilterDto) {
    const { page = 1, limit = 20, status, planCode, search } = filters;
    const skip = (page - 1) * limit;
    const where: any = {};

    if (status) {
      where.status = status;
    }
    if (planCode) {
      where.plan = { code: planCode };
    }
    if (search) {
      where.user = {
        OR: [
          { email: { contains: search } },
          { firstName: { contains: search } },
          { lastName: { contains: search } },
        ],
      };
    }

    const [subscriptions, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              isActive: true,
            },
          },
          plan: {
            select: { id: true, name: true, code: true, price: true, interval: true },
          },
        },
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return {
      data: subscriptions,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getExpiringSubscriptions(days = 7) {
    const now = new Date();
    const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        status: 'active',
        currentPeriodEnd: { gte: now, lte: end },
      },
      orderBy: { currentPeriodEnd: 'asc' },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true, phone: true },
        },
        plan: {
          select: { id: true, name: true, code: true, price: true, interval: true },
        },
      },
    });

    return { data: subscriptions };
  }

  async getFailedPayments(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = { status: 'failed' as const };

    const [payments, total] = await Promise.all([
      this.prisma.paymentTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          subscription: {
            select: { id: true, status: true },
          },
        },
      }),
      this.prisma.paymentTransaction.count({ where }),
    ]);

    return {
      data: payments,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getSubscriptionDetail(id: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            isActive: true,
          },
        },
        plan: true,
        payments: { orderBy: { createdAt: 'desc' } },
        entitlements: true,
      },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    const [usage, events] = await Promise.all([
      this.prisma.subscriptionUsage.findMany({
        where: { userId: subscription.userId },
      }),
      this.prisma.subscriptionEvent.findMany({
        where: { userId: subscription.userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    return { ...subscription, usage, events };
  }

  async adminUpdateSubscription(id: string, dto: AdminUpdateSubscriptionDto, adminId: string) {
    const subscription = await this.prisma.subscription.findUnique({ where: { id } });
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (dto.planId) {
      const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: dto.planId } });
      if (!plan) {
        throw new NotFoundException('Plan not found');
      }
    }

    const data: any = {};
    if (dto.status !== undefined) {
      data.status = dto.status;
      if (dto.status === 'cancelled' && !subscription.cancelledAt) {
        data.cancelledAt = new Date();
      }
    }
    if (dto.planId !== undefined) {
      data.planId = dto.planId;
    }
    if (dto.currentPeriodEnd !== undefined) {
      data.currentPeriodEnd = new Date(dto.currentPeriodEnd);
    }
    if (dto.notes !== undefined) {
      data.metadata = {
        ...((subscription.metadata as Record<string, any>) || {}),
        adminNotes: dto.notes,
        lastUpdatedBy: adminId,
        lastUpdatedAt: new Date().toISOString(),
      };
    }

    const updated = await this.prisma.subscription.update({
      where: { id },
      data,
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        plan: { select: { id: true, name: true, code: true, price: true, interval: true } },
      },
    });

    await this.createAuditLog({
      adminId,
      action: 'updated',
      entity: 'subscription',
      entityId: id,
      description: `Admin updated subscription ${id.slice(0, 8)}: ${Object.keys(data).join(', ')}`,
      ipAddress: null,
    });

    return updated;
  }

  async issueRefund(subscriptionId: string, dto: IssueRefundDto, adminId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        payments: {
          where: { status: 'completed' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    const payment = subscription.payments[0];
    if (!payment) {
      throw new BadRequestException('No completed payments found for this subscription');
    }

    if (payment.refundedAt) {
      throw new BadRequestException('Payment has already been refunded');
    }

    const refundAmount = dto.amount ?? Number(payment.amount);

    await this.prisma.paymentTransaction.update({
      where: { id: payment.id },
      data: {
        refundedAt: new Date(),
        refundAmount,
        status: 'refunded',
        metadata: {
          ...((payment.metadata as Record<string, any>) || {}),
          refundReason: dto.reason || 'Admin initiated refund',
          refundedBy: adminId,
        },
      },
    });

    await this.createAuditLog({
      adminId,
      action: 'created',
      entity: 'payment_transaction',
      entityId: payment.id,
      description: `Refund of ${refundAmount} issued for subscription ${subscriptionId.slice(0, 8)}${dto.reason ? `: ${dto.reason}` : ''}`,
      ipAddress: null,
    });

    return {
      message: 'Refund issued successfully',
      paymentId: payment.id,
      refundAmount,
    };
  }

  async getUserSubscriptionHistory(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [subscriptions, events] = await Promise.all([
      this.prisma.subscription.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: {
          plan: true,
          payments: { orderBy: { createdAt: 'desc' } },
          entitlements: true,
        },
      }),
      this.prisma.subscriptionEvent.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    return { user, subscriptions, events };
  }

  async getCoupons() {
    return this.prisma.subscriptionCoupon.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCoupon(dto: CreateCouponDto, adminId: string) {
    const existing = await this.prisma.subscriptionCoupon.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException('Coupon with this code already exists');
    }

    const coupon = await this.prisma.subscriptionCoupon.create({
      data: {
        code: dto.code,
        description: dto.description,
        discountPct: dto.discountPct ?? 0,
        discountAmt: dto.discountAmt,
        maxUses: dto.maxUses ?? 0,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        applicablePlans: dto.applicablePlans || [],
        isActive: true,
      },
    });

    await this.createAuditLog({
      adminId,
      action: 'created',
      entity: 'subscription_coupon',
      entityId: coupon.id,
      description: `Created coupon: ${coupon.code}`,
      ipAddress: null,
    });

    return coupon;
  }

  async updateCoupon(id: string, dto: UpdateCouponDto, adminId: string) {
    const coupon = await this.prisma.subscriptionCoupon.findUnique({ where: { id } });
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    const data: any = {};
    if (dto.description !== undefined) {
      data.description = dto.description;
    }
    if (dto.discountPct !== undefined) {
      data.discountPct = dto.discountPct;
    }
    if (dto.discountAmt !== undefined) {
      data.discountAmt = dto.discountAmt;
    }
    if (dto.maxUses !== undefined) {
      data.maxUses = dto.maxUses;
    }
    if (dto.validFrom !== undefined) {
      data.validFrom = new Date(dto.validFrom);
    }
    if (dto.validUntil !== undefined) {
      data.validUntil = new Date(dto.validUntil);
    }
    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    const updated = await this.prisma.subscriptionCoupon.update({
      where: { id },
      data,
    });

    await this.createAuditLog({
      adminId,
      action: 'updated',
      entity: 'subscription_coupon',
      entityId: id,
      description: `Updated coupon: ${coupon.code}`,
      ipAddress: null,
    });

    return updated;
  }

  async deleteCoupon(id: string, adminId: string) {
    const coupon = await this.prisma.subscriptionCoupon.findUnique({ where: { id } });
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    const updated = await this.prisma.subscriptionCoupon.update({
      where: { id },
      data: { isActive: false },
    });

    await this.createAuditLog({
      adminId,
      action: 'deleted',
      entity: 'subscription_coupon',
      entityId: id,
      description: `Soft-deleted coupon: ${coupon.code}`,
      ipAddress: null,
    });

    return { message: 'Coupon deleted successfully', coupon: updated };
  }

  async getSubscriptionAnalytics() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const activeSubsWithPlans = await this.prisma.subscription.findMany({
      where: { status: 'active' },
      include: { plan: { select: { price: true, interval: true } } },
    });

    let mrr = 0;
    for (const sub of activeSubsWithPlans) {
      const price = Number(sub.plan.price);
      mrr += sub.plan.interval === 'yearly' ? price / 12 : price;
    }

    const [newSubscriptions, cancelledSubscriptions, previousActiveCount] = await Promise.all([
      this.prisma.subscription.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.subscription.count({
        where: { cancelledAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.subscription.count({
        where: {
          status: 'active',
          createdAt: { lt: thirtyDaysAgo },
        },
      }),
    ]);

    const activeCount = activeSubsWithPlans.length;
    const prevActiveWithCancelled = previousActiveCount + cancelledSubscriptions;
    const churnRate =
      prevActiveWithCancelled > 0
        ? Math.round((cancelledSubscriptions / prevActiveWithCancelled) * 100 * 100) / 100
        : 0;

    const retentionRate =
      previousActiveCount > 0
        ? Math.round(
            ((previousActiveCount - cancelledSubscriptions) / previousActiveCount) * 100 * 100,
          ) / 100
        : 0;

    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const [revenueCurrent, revenuePrevious] = await Promise.all([
      this.prisma.paymentTransaction
        .aggregate({
          _sum: { amount: true },
          where: { status: 'completed', createdAt: { gte: startOfMonth } },
        })
        .then((r) => Number(r._sum.amount ?? 0)),
      this.prisma.paymentTransaction
        .aggregate({
          _sum: { amount: true },
          where: {
            status: 'completed',
            createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
          },
        })
        .then((r) => Number(r._sum.amount ?? 0)),
    ]);

    const revenueGrowth =
      revenuePrevious > 0
        ? Math.round(((revenueCurrent - revenuePrevious) / revenuePrevious) * 100 * 100) / 100
        : 0;

    const planDistribution = await this.prisma.subscription.groupBy({
      by: ['planId'],
      where: { status: 'active' },
      _count: { id: true },
    });

    const plans = await this.prisma.subscriptionPlan.findMany({
      where: { id: { in: planDistribution.map((p) => p.planId) } },
    });

    const planMap = new Map(plans.map((p) => [p.id, p.name]));
    const byPlan = planDistribution.map((p) => ({
      planId: p.planId,
      planName: planMap.get(p.planId) || 'Unknown',
      count: p._count.id,
    }));

    return {
      mrr: Math.round(mrr * 100) / 100,
      arr: Math.round(mrr * 12 * 100) / 100,
      activeSubscriptions: activeCount,
      newSubscriptionsLast30d: newSubscriptions,
      cancelledSubscriptionsLast30d: cancelledSubscriptions,
      churnRate,
      retentionRate,
      revenueCurrent,
      revenuePrevious,
      revenueGrowth,
      byPlan,
      averageRevenuePerUser: activeCount > 0 ? Math.round((mrr / activeCount) * 100) / 100 : 0,
    };
  }

  async getConversionFunnel() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const events = await this.prisma.subscriptionEvent.groupBy({
      by: ['event'],
      where: { createdAt: { gte: thirtyDaysAgo } },
      _count: { id: true },
    });

    const eventMap = new Map(events.map((e) => [e.event, e._count.id]));

    const pricingViewed = eventMap.get('pricing_viewed') || 0;
    const checkoutStarted = eventMap.get('checkout_started') || 0;
    const paymentCompleted = eventMap.get('payment_completed') || 0;

    const retainedUsers = await this.prisma.subscription.count({
      where: {
        status: 'active',
        createdAt: { lte: thirtyDaysAgo },
      },
    });

    return {
      pricingViewed,
      checkoutStarted,
      paymentCompleted,
      retainedAfter30d: retainedUsers,
      funnel: [
        {
          stage: 'pricing_viewed',
          count: pricingViewed,
          conversionRate: 100,
        },
        {
          stage: 'checkout_started',
          count: checkoutStarted,
          conversionRate:
            pricingViewed > 0 ? Math.round((checkoutStarted / pricingViewed) * 100 * 100) / 100 : 0,
        },
        {
          stage: 'payment_completed',
          count: paymentCompleted,
          conversionRate:
            checkoutStarted > 0
              ? Math.round((paymentCompleted / checkoutStarted) * 100 * 100) / 100
              : 0,
        },
        {
          stage: 'retained_30d',
          count: retainedUsers,
          conversionRate:
            paymentCompleted > 0
              ? Math.round((retainedUsers / paymentCompleted) * 100 * 100) / 100
              : 0,
        },
      ],
    };
  }

  async broadcastNotification(dto: BroadcastNotificationDto, adminId: string) {
    const users = await this.prisma.user.findMany({
      where: { isActive: true, deletedAt: null },
      select: { id: true },
    });

    this.logger.log(`Broadcasting notification to ${users.length} users`);

    let sentCount = 0;
    for (const user of users) {
      try {
        await this.notificationService.sendPush(user.id, dto.title, dto.message, {
          type: dto.type || 'system',
          broadcastBy: adminId,
        });
        sentCount++;
      } catch (error) {
        this.logger.error(
          `Failed to send broadcast to user ${user.id}`,
          error instanceof Error ? error.stack : error,
        );
      }
    }

    await this.createAuditLog({
      adminId,
      action: 'created',
      entity: 'notification',
      entityId: null,
      description: `Broadcast notification "${dto.title}" sent to ${sentCount}/${users.length} users`,
      ipAddress: null,
    });

    return {
      message: 'Broadcast sent',
      totalUsers: users.length,
      sentCount,
      failedCount: users.length - sentCount,
    };
  }

  async getConfig() {
    let config = await this.prisma.appConfiguration.findFirst();
    if (!config) {
      config = await this.prisma.appConfiguration.create({ data: {} });
    }
    return config;
  }

  async updateConfig(dto: Record<string, any>, adminId: string) {
    let config = await this.prisma.appConfiguration.findFirst();
    if (!config) {
      config = await this.prisma.appConfiguration.create({ data: {} });
    }

    const updated = await this.prisma.appConfiguration.update({
      where: { id: config.id },
      data: dto,
    });

    await this.createAuditLog({
      adminId,
      action: 'updated',
      entity: 'app_configuration',
      entityId: config.id,
      description: 'Updated app configuration',
      ipAddress: null,
    });

    return updated;
  }

  async sendTestEmail(to: string, adminId: string) {
    await this.emailService.send({
      to,
      subject: 'Test Email from Dabbu Admin',
      html: '<h1>SMTP Test</h1><p>If you received this, your SMTP configuration in Dabbu Admin is working correctly.</p>',
      text: 'SMTP Test — If you received this, your SMTP configuration in Dabbu Admin is working correctly.',
    });

    await this.createAuditLog({
      adminId,
      action: 'created',
      entity: 'email',
      entityId: null,
      description: `Sent test email to ${to}`,
      ipAddress: null,
    });

    return { messageId: 'sent' };
  }

  async listTickets(query: ListTicketsQueryDto) {
    const { status, priority, category, search, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (priority) {
      where.priority = priority;
    }
    if (category) {
      where.category = category;
    }
    if (search) {
      where.OR = [{ subject: { contains: search } }, { email: { contains: search } }];
    }
    const [tickets, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          assignedTo: { select: { id: true, name: true, email: true } },
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      this.prisma.supportTicket.count({ where }),
    ]);
    return {
      data: tickets,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getTicketDetail(id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }
    return ticket;
  }

  async updateTicket(id: string, dto: UpdateTicketDto, adminId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const data: any = {};
    if (dto.status) {
      data.status = dto.status;
    }
    if (dto.priority) {
      data.priority = dto.priority;
    }
    if (dto.adminNotes !== undefined) {
      data.adminNotes = dto.adminNotes;
    }
    if (dto.status === 'resolved' || dto.status === 'closed') {
      data.resolvedAt = new Date();
    }

    const updated = await this.prisma.supportTicket.update({ where: { id }, data });

    await this.createAuditLog({
      adminId,
      action: 'updated',
      entity: 'support_ticket',
      entityId: id,
      description: `Updated ticket #${id.slice(0, 8)}: ${dto.status ? `status=${dto.status}` : ''} ${dto.priority ? `priority=${dto.priority}` : ''}`,
      ipAddress: null,
    });

    return updated;
  }

  async assignTicket(id: string, adminId: string, currentAdminId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const updated = await this.prisma.supportTicket.update({
      where: { id },
      data: {
        assignedToId: adminId,
        status: ticket.status === 'open' ? 'in_progress' : ticket.status,
      },
    });

    await this.createAuditLog({
      adminId: currentAdminId,
      action: 'updated',
      entity: 'support_ticket',
      entityId: id,
      description: `Assigned ticket #${id.slice(0, 8)} to admin ${adminId}`,
      ipAddress: null,
    });

    return updated;
  }

  async listAdmins(query: ListAdminsQueryDto) {
    const { search, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (search) {
      where.OR = [{ name: { contains: search } }, { email: { contains: search } }];
    }
    const [admins, total] = await Promise.all([
      this.prisma.adminUser.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.adminUser.count({ where }),
    ]);
    return {
      data: admins,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async deleteAdmin(id: string, currentAdminId: string) {
    if (id === currentAdminId) {
      throw new BadRequestException('Cannot delete yourself');
    }
    const admin = await this.prisma.adminUser.findUnique({ where: { id } });
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }
    const updated = await this.prisma.adminUser.update({
      where: { id },
      data: { isActive: false },
    });
    await this.createAuditLog({
      adminId: currentAdminId,
      action: 'deleted',
      entity: 'admin_user',
      entityId: id,
      description: `Deactivated admin: ${admin.name} (${admin.email})`,
      ipAddress: null,
    });
    return updated;
  }

  async cleanupDatabase() {
    const preserved = `'system@dabbu.internal', 'demo@dabbu.app'`;

    await this.prisma.$executeRawUnsafe(`SET FOREIGN_KEY_CHECKS = 0`);

    const tables = [
      'audit_logs',
      'analytics_events',
      'login_activity',
      'notification_logs',
      'notifications',
      'sessions',
      'devices',
      'contact_hashes',
      'expense_splits',
      'settlements',
      'shared_expenses',
      'household_contributions',
      'shared_goal_contributions',
      'group_wallet_members',
      'advance_contribution_history',
      'document_permissions',
      'bill_splits',
      'emergency_contributions',
      'user_badges',
      'user_documents',
      'user_streaks',
      'export_history',
      'sms_detections',
      'group_chat_messages',
      'group_chat_reads',
      'shared_group_members',
      'expense_group_members',
      'shared_groups',
      'expense_groups',
      'friends',
      'payment_transactions',
      'subscriptions',
      'premium_entitlements',
      'referral_rewards',
      'referral_programs',
      'ai_insights',
      'ai_predictions',
      'ai_anomalies',
      'ai_recommendations',
      'ai_scores',
      'ai_feed_cards',
      'ai_milestones',
      'financial_dna',
      'life_events',
      'user_net_worths',
      'user_loans',
      'emi_payments',
      'credit_card_bills',
      'credit_card_transactions',
      'transactions',
      'budgets',
      'bills',
      'goals',
      'investments',
      'accounts',
    ];

    for (const table of tables) {
      try {
        await this.prisma.$executeRawUnsafe(`DELETE FROM \`${table}\``);
      } catch {
        // table might not exist or have FK constraints — skip
      }
    }

    await this.prisma.$executeRawUnsafe(`
      DELETE FROM users WHERE email NOT IN (${preserved})
    `);

    await this.prisma.$executeRawUnsafe(`SET FOREIGN_KEY_CHECKS = 1`);

    const [users, admins, categories, plans] = await Promise.all([
      this.prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM users`),
      this.prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM admin_users`),
      this.prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM transaction_categories`),
      this.prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM subscription_plans`),
    ]);

    return {
      message: 'Database cleanup complete',
      preserved: {
        adminUsers: Number((admins as any[])[0]?.count || 0),
        categories: Number((categories as any[])[0]?.count || 0),
        subscriptionPlans: Number((plans as any[])[0]?.count || 0),
        users: Number((users as any[])[0]?.count || 0),
      },
    };
  }

  async getSystemHealth() {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers, activeUsers7d, totalSubscriptions,
      activeSubscriptions, totalRevenue, failedPayments24h,
      newUsers24h, newTransactions24h, supportTicketsOpen,
      apiRequests24h,
    ] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.loginActivity.findMany({
        where: { createdAt: { gte: last7d }, action: 'login_success' },
        select: { userId: true },
        distinct: ['userId'],
      }).then(r => r.length),
      this.prisma.subscription.count(),
      this.prisma.subscription.count({ where: { status: 'active' } }),
      this.prisma.paymentTransaction.aggregate({
        _sum: { amount: true },
        where: { status: 'completed', paidAt: { gte: last7d } },
      }),
      this.prisma.paymentTransaction.count({
        where: { status: 'failed', createdAt: { gte: last24h } },
      }),
      this.prisma.user.count({ where: { createdAt: { gte: last24h } } }),
      this.prisma.transaction.count({ where: { createdAt: { gte: last24h } } }),
      this.prisma.supportTicket.count({ where: { status: { in: ['open', 'in_progress'] } } }),
      this.prisma.auditLog.count({ where: { createdAt: { gte: last24h }, action: 'api_request' } }),
    ]);

    return {
      timestamp: now.toISOString(),
      users: {
        total: totalUsers,
        activeLast7d: activeUsers7d,
        newLast24h: newUsers24h,
        engagementRate: totalUsers > 0 ? Math.round((activeUsers7d / totalUsers) * 10000) / 100 : 0,
      },
      subscriptions: {
        total: totalSubscriptions,
        active: activeSubscriptions,
        conversionRate: totalUsers > 0 ? Math.round((activeSubscriptions / totalUsers) * 10000) / 100 : 0,
      },
      revenue: {
        last7d: totalRevenue._sum.amount || 0,
      },
      operations: {
        transactions24h: newTransactions24h,
        apiRequests24h,
        failedPayments24h,
      },
      support: {
        openTickets: supportTicketsOpen,
      },
    };
  }

  private async createAuditLog(data: {
    adminId: string;
    action: string;
    entity: string;
    entityId: string | null;
    description: string;
    ipAddress: string | null;
  }) {
    return this.prisma.auditLog.create({
      data: {
        adminId: data.adminId,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId,
        description: data.description,
        ipAddress: data.ipAddress,
      },
    });
  }
}

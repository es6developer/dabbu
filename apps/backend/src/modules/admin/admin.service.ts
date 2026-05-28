import {
  Injectable, UnauthorizedException, ConflictException, NotFoundException, Logger,
      } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import {
  AdminLoginDto,
  AdminCreateDto,
  ListUsersQueryDto,
  UpdateUserStatusDto,
  CreateFeatureFlagDto,
  BroadcastNotificationDto,
  ListAuditLogsQueryDto,
  ListPaymentsQueryDto,
  CreatePlanDto,
  UpdatePlanDto,
  SystemStatsResponse,
} from './dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly notificationService: NotificationService,
  ) {}

  async login(dto: AdminLoginDto): Promise<{ accessToken: string; admin: any }> {
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

  async getDashboardStats(): Promise<SystemStatsResponse> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalUsers,
      activeUsers,
      totalAdmins,
      activeSubscriptions,
      totalFamilies,
      totalReminders,
      totalTransactions,
      revenueThisMonth,
      pendingPayments,
      totalFeatureFlags,
      newUsersToday,
    ] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { isActive: true, deletedAt: null } }),
      this.prisma.adminUser.count(),
      this.prisma.subscription.count({ where: { status: 'active' } }),
      this.prisma.family.count({ where: { isActive: true } }),
      this.prisma.reminder.count(),
      this.prisma.transaction.count({ where: { deletedAt: null } }),
      this.prisma.payment.aggregate({
        where: {
          status: 'completed',
          paidAt: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
      this.prisma.payment.count({ where: { status: 'pending' } }),
      this.prisma.featureFlag.count(),
      this.prisma.user.count({
        where: {
          createdAt: { gte: startOfToday },
          deletedAt: null,
        },
      }),
    ]);

    return {
      totalUsers,
      activeUsers,
      totalAdmins,
      activeSubscriptions,
      totalFamilies,
      totalReminders,
      totalTransactions,
      revenueThisMonth: revenueThisMonth._sum.amount?.toNumber() ?? 0,
      pendingPayments,
      totalFeatureFlags,
      newUsersToday,
    };
  }

  async listUsers(query: ListUsersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };

    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.status === 'active') where.isActive = true;
    else if (query.status === 'inactive') where.isActive = false;

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
            payments: true,
            invoices: true,
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
        invoices: {
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

  async listSubscriptions(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [subscriptions, total] = await Promise.all([
      this.prisma.subscription.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          plan: { select: { id: true, name: true, price: true, currency: true, interval: true } },
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
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
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalSubscriptions,
      activeSubscriptions,
      cancelledSubscriptions,
      expiredSubscriptions,
      trialSubscriptions,
      pastDueSubscriptions,
      planDistribution,
      totalRevenue,
      revenueThisMonth,
    ] = await Promise.all([
      this.prisma.subscription.count(),
      this.prisma.subscription.count({ where: { status: 'active' } }),
      this.prisma.subscription.count({ where: { status: 'cancelled' } }),
      this.prisma.subscription.count({ where: { status: 'expired' } }),
      this.prisma.subscription.count({ where: { status: { in: ['trial', 'active'] }, trialEndsAt: { not: null } } }),
      this.prisma.subscription.count({ where: { status: 'past_due' } }),
      this.prisma.subscriptionPlan.findMany({
        select: {
          id: true,
          name: true,
          price: true,
          _count: { select: { subscriptions: true } },
        },
      }),
      this.prisma.payment.aggregate({
        where: { status: 'completed' },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: { status: 'completed', paidAt: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
    ]);

    const activeSubsWithPlans = await this.prisma.subscription.findMany({
      where: { status: 'active' },
      include: { plan: { select: { price: true, interval: true, currency: true } } },
    });

    const mrr = activeSubsWithPlans.reduce((sum, sub) => {
      const price = sub.plan.price.toNumber();
      const monthly = sub.plan.interval === 'yearly' ? price / 12 : price;
      return sum + monthly;
    }, 0);

    const totalPaid = await this.prisma.payment.count({ where: { status: 'completed' } });
    const churnRate = totalPaid > 0 ? (cancelledSubscriptions / totalPaid) * 100 : 0;

    return {
      totalSubscriptions,
      activeSubscriptions,
      cancelledSubscriptions,
      expiredSubscriptions,
      trialSubscriptions,
      pastDueSubscriptions,
      planDistribution: planDistribution.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price.toNumber(),
        subscriberCount: p._count.subscriptions,
      })),
      mrr: Math.round(mrr * 100) / 100,
      arr: Math.round(mrr * 12 * 100) / 100,
      totalRevenue: totalRevenue._sum.amount?.toNumber() ?? 0,
      revenueThisMonth: revenueThisMonth._sum.amount?.toNumber() ?? 0,
      churnRate: Math.round(churnRate * 100) / 100,
    };
  }

  async listPayments(query: ListPaymentsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.gateway) where.gateway = query.gateway;

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          subscription: { include: { plan: { select: { name: true } } } },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      data: payments,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async listAuditLogs(query: ListAuditLogsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.adminId) where.adminId = query.adminId;
    if (query.action) where.action = query.action;
    if (query.entity) where.entity = query.entity;

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

  async createPlan(dto: CreatePlanDto, adminId: string) {
    const plan = await this.prisma.subscriptionPlan.create({
      data: {
        name: dto.name,
        description: dto.description || null,
        price: dto.price,
        currency: dto.currency || 'INR',
        interval: dto.interval || 'monthly',
        features: (dto.features as any) || Prisma.JsonNull,
        maxAccounts: dto.maxAccounts ?? 3,
        maxCategories: dto.maxCategories ?? 20,
        maxBudgets: dto.maxBudgets ?? 10,
        maxBills: dto.maxBills ?? 20,
        maxGoals: dto.maxGoals ?? 10,
        maxInvestments: dto.maxInvestments ?? 5,
        maxFamilyMembers: dto.maxFamilyMembers ?? 0,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });

    await this.createAuditLog({
      adminId,
      action: 'created',
      entity: 'plan',
      entityId: plan.id,
      description: `Created plan: ${plan.name}`,
      ipAddress: null,
    });

    return plan;
  }

  async updatePlan(id: string, dto: UpdatePlanDto, adminId: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    const updated = await this.prisma.subscriptionPlan.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.interval !== undefined && { interval: dto.interval }),
        ...(dto.features !== undefined && { features: dto.features as any }),
        ...(dto.maxAccounts !== undefined && { maxAccounts: dto.maxAccounts }),
        ...(dto.maxCategories !== undefined && { maxCategories: dto.maxCategories }),
        ...(dto.maxBudgets !== undefined && { maxBudgets: dto.maxBudgets }),
        ...(dto.maxBills !== undefined && { maxBills: dto.maxBills }),
        ...(dto.maxGoals !== undefined && { maxGoals: dto.maxGoals }),
        ...(dto.maxInvestments !== undefined && { maxInvestments: dto.maxInvestments }),
        ...(dto.maxFamilyMembers !== undefined && { maxFamilyMembers: dto.maxFamilyMembers }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });

    await this.createAuditLog({
      adminId,
      action: 'updated',
      entity: 'plan',
      entityId: id,
      description: `Updated plan: ${updated.name}`,
      ipAddress: null,
    });

    return updated;
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

  async createFeatureFlag(dto: CreateFeatureFlagDto, adminId: string) {
    const existing = await this.prisma.featureFlag.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException(`Feature flag "${dto.name}" already exists`);
    }

    const flag = await this.prisma.featureFlag.create({
      data: {
        name: dto.name,
        description: dto.description || null,
        isEnabled: dto.isEnabled ?? false,
        createdBy: adminId,
        rollouts: Prisma.JsonNull,
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

  async listFeatureFlags() {
    return this.prisma.featureFlag.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async toggleFeatureFlag(id: string, adminId: string) {
    const flag = await this.prisma.featureFlag.findUnique({ where: { id } });
    if (!flag) {
      throw new NotFoundException('Feature flag not found');
    }

    const updated = await this.prisma.featureFlag.update({
      where: { id },
      data: { isEnabled: !flag.isEnabled },
    });

    await this.createAuditLog({
      adminId,
      action: 'updated',
      entity: 'feature_flag',
      entityId: id,
      description: `Toggled feature flag "${flag.name}" to ${updated.isEnabled}`,
      ipAddress: null,
    });

    return updated;
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
        await this.notificationService.sendPush(
          user.id,
          dto.title,
          dto.message,
          { type: dto.type || 'system', broadcastBy: adminId },
        );
        sentCount++;
      } catch (error) {
        this.logger.error(`Failed to send broadcast to user ${user.id}`, error instanceof Error ? error.stack : error);
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

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
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { FeaturesService } from '../features/features.service';
import {
  AdminLoginDto,
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
      this.prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          type: 'income',
          createdAt: { gte: startOfMonth },
          deletedAt: null,
        },
      }).then((r) => Number(r._sum.amount ?? 0)).catch(() => 0),
      this.prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          type: 'income',
          createdAt: { gte: startOfLastMonth, lt: startOfMonth },
          deletedAt: null,
        },
      }).then((r) => Number(r._sum.amount ?? 0)).catch(() => 0),
    ]);

    const [pendingPayments, usersLastMonth, subscriptionsLastMonth] = await Promise.all([
      this.prisma.transaction.count({
        where: { type: 'expense', deletedAt: null, ...({} as any) },
      }).catch(() => 0),
      this.prisma.user.count({
        where: { createdAt: { gte: startOfLastMonth, lt: startOfMonth }, deletedAt: null },
      }),
      this.prisma.subscription.count({
        where: { status: 'active', createdAt: { gte: startOfLastMonth, lt: startOfMonth } },
      }).catch(() => 0),
    ]);

    const userGrowth = usersLastMonth > 0
      ? Math.round(((totalUsers - usersLastMonth) / usersLastMonth) * 100)
      : 0;
    const subscriptionGrowth = subscriptionsLastMonth > 0
      ? Math.round(((activeSubscriptions - subscriptionsLastMonth) / subscriptionsLastMonth) * 100)
      : 0;
    const revenueGrowth = revenueLastMonth > 0
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
        { email: { contains: query.search, mode: 'insensitive' } },
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
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

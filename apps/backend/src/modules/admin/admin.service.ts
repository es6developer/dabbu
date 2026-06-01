import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  Logger,
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
  BroadcastNotificationDto,
  ListAuditLogsQueryDto,
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

  async getDashboardStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalUsers,
      activeUsers,
      totalAdmins,
      totalFamilies,
      totalReminders,
      totalTransactions,
      newUsersToday,
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
    ]);

    return {
      totalUsers,
      activeUsers,
      totalAdmins,
      totalFamilies,
      totalReminders,
      totalTransactions,
      newUsersToday,
      activeSubscriptions: await this.prisma.subscription
        .count({ where: { status: 'active' } })
        .catch(() => 0),
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

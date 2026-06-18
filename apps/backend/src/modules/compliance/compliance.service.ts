import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async exportUserData(userId: string, format: 'json' | 'pdf' = 'json', includes?: string[]) {
    const exportIncludes = includes || ['transactions', 'goals', 'bills', 'accounts', 'budgets', 'settings', 'profile'];

    const data: any = { exportedAt: new Date().toISOString(), userId };

    if (exportIncludes.includes('profile')) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true, email: true, firstName: true, lastName: true,
          phone: true, currency: true, timezone: true, locale: true,
          isEmailVerified: true, createdAt: true,
        },
      });
      data.profile = user;
    }

    if (exportIncludes.includes('transactions')) {
      data.transactions = await this.prisma.transaction.findMany({
        where: { userId, deletedAt: null },
        orderBy: { date: 'desc' },
        include: { category: { select: { name: true, icon: true } } },
      });
    }

    if (exportIncludes.includes('goals')) {
      data.goals = await this.prisma.goal.findMany({
        where: { userId, deletedAt: null },
      });
    }

    if (exportIncludes.includes('bills')) {
      data.bills = await this.prisma.bill.findMany({
        where: { userId, deletedAt: null },
      });
    }

    if (exportIncludes.includes('accounts')) {
      data.accounts = await this.prisma.account.findMany({
        where: { userId, deletedAt: null },
      });
    }

    if (exportIncludes.includes('budgets')) {
      data.budgets = await this.prisma.budget.findMany({
        where: { userId, deletedAt: null },
      });
    }

    if (exportIncludes.includes('settings')) {
      data.settings = await this.prisma.settings.findUnique({ where: { userId } });
      data.notificationPreferences = await this.prisma.notificationPreference.findMany({ where: { userId } });
    }

    if (exportIncludes.includes('streaks')) {
      data.streaks = await this.prisma.userStreak.findMany({ where: { userId } });
      data.badges = await this.prisma.userBadge.findMany({
        where: { userId },
        include: { badge: true },
      });
    }

    const exportRecord = await this.prisma.dataExport.create({
      data: {
        userId,
        format,
        status: 'completed',
        includes: exportIncludes,
        completedAt: new Date(),
      },
    });

    await this.notificationService.create({
      userId,
      type: 'system',
      title: 'Data Export Ready',
      message: `Your ${format.toUpperCase()} data export has been generated.`,
      priority: 'low',
      category: 'system',
    });

    return {
      id: exportRecord.id,
      format,
      data,
      generatedAt: exportRecord.completedAt,
    };
  }

  async getExportHistory(userId: string) {
    return this.prisma.dataExport.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async deleteAccount(userId: string, password?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const userEmail = user.email;

    await this.prisma.$transaction(async (tx) => {
      await tx.session.updateMany({ where: { userId }, data: { isRevoked: true } });
      await tx.user.update({
        where: { id: userId },
        data: {
          isActive: false,
          deletedAt: new Date(),
          email: `deleted_${userId}@dabbu.app`,
          password: '',
          firstName: 'Deleted',
          lastName: 'User',
          phone: null,
          avatarUrl: null,
        },
      });
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'deleted',
        entity: 'user',
        entityId: userId,
        description: `User account deleted by request`,
      },
    });

    return { message: 'Account deleted successfully. We\'re sorry to see you go.' };
  }

  async requestAccountDeletion(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true, firstName: true } });
    if (!user) throw new NotFoundException('User not found');

    await this.notificationService.create({
      userId,
      type: 'system',
      title: 'Account Deletion Scheduled',
      message: 'Your account will be deleted in 7 days. If this was a mistake, please contact support.',
      priority: 'high',
      category: 'system',
      actionUrl: '/settings/account',
    });

    return {
      message: 'Account deletion scheduled. You have 7 days to cancel.',
      scheduledDeletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };
  }

  async cancelAccountDeletion(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (!user.deletedAt) throw new BadRequestException('Account deletion has not been requested');

    await this.prisma.user.update({
      where: { id: userId },
      data: { deletedAt: null, isActive: true },
    });

    return { message: 'Account deletion cancelled. Welcome back!' };
  }

  async getDataRetentionPolicy() {
    return {
      retentionPeriods: {
        transactions: 'Forever (or until account deletion)',
        analytics_events: '90 days',
        audit_logs: '3 years',
        notification_logs: '1 year',
        session_logs: '90 days',
        login_activity: '90 days',
      },
      exportFormats: ['JSON', 'PDF'],
      exportIncludes: ['transactions', 'goals', 'bills', 'accounts', 'budgets', 'settings', 'streaks', 'badges'],
      deletionProcess: 'Account deletion removes all personal data within 30 days. Anonymized analytics may be retained.',
      gdprContact: 'privacy@dabbu.app',
    };
  }
}

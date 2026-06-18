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

  async getPrivacyPolicy() {
    return {
      lastUpdated: '2026-05-01',
      sections: [
        {
          title: 'Information We Collect',
          content: 'We collect information you provide directly such as your name, email, phone number, and financial data you choose to link. We also collect SMS transaction data with your explicit permission to automatically categorize expenses.',
        },
        {
          title: 'How We Use Your Data',
          content: 'Your data is used to provide and improve our services including transaction categorization, spending insights, bill reminders, and family sharing features. We never sell your personal data to third parties.',
        },
        {
          title: 'Data Security',
          content: 'We implement industry-standard encryption and security measures. All data is encrypted at rest and in transit. We use token-based authentication and session management to protect your account.',
        },
        {
          title: 'SMS Data',
          content: 'SMS data is processed locally on your device where possible. When processed on our servers, it is encrypted and used solely for financial categorization. You can revoke SMS access at any time.',
        },
        {
          title: 'Third-Party Services',
          content: 'We may integrate with third-party services for bank linking and analytics. These services have their own privacy policies and data handling practices.',
        },
        {
          title: 'Your Rights',
          content: 'You can access, update, or delete your personal data at any time through your account settings. Contact us for data portability requests.',
        },
        {
          title: 'Contact',
          content: 'For privacy-related inquiries, contact us at privacy@dabbu.app',
        },
      ],
    };
  }

  async getTermsOfService() {
    return {
      lastUpdated: '2026-05-01',
      sections: [
        {
          title: 'Acceptance of Terms',
          content: 'By using Dabbu, you agree to these terms. If you do not agree, please do not use the service.',
        },
        {
          title: 'Service Description',
          content: 'Dabbu provides personal finance management tools including expense tracking, budgeting, bill reminders, and financial insights.',
        },
        {
          title: 'User Responsibilities',
          content: 'You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.',
        },
        {
          title: 'Data Accuracy',
          content: 'While we strive for accuracy, Dabbu is not a substitute for professional financial advice. We recommend reconciling with your bank statements regularly.',
        },
        {
          title: 'Limitation of Liability',
          content: 'Dabbu shall not be liable for any indirect, incidental, or consequential damages arising from your use of the service.',
        },
        {
          title: 'Termination',
          content: 'We reserve the right to suspend or terminate accounts that violate these terms or applicable laws.',
        },
        {
          title: 'Changes to Terms',
          content: 'We may update these terms. Continued use after changes constitutes acceptance of the new terms.',
        },
      ],
    };
  }

  async getCookieConsent(userId: string) {
    const consent = await this.prisma.cookieConsent.findUnique({
      where: { userId },
    });

    return {
      consent: consent?.consent || null,
      categories: consent?.categories || [],
      updatedAt: consent?.updatedAt || null,
      bannerVisible: !consent,
    };
  }

  async setCookieConsent(
    userId: string,
    consent: 'accepted' | 'rejected',
    categories?: string[],
  ) {
    const data = {
      userId,
      consent,
      categories: categories || [],
    };

    await this.prisma.cookieConsent.upsert({
      where: { userId },
      create: data,
      update: data,
    });

    return { message: `Cookie consent ${consent} successfully.`, consent };
  }

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
      await tx.user.delete({ where: { id: userId } });
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'deleted',
        entity: 'user',
        entityId: userId,
        description: `User account permanently deleted under GDPR Article 17`,
      },
    });

    this.logger.log(`Account ${userId} permanently deleted`);
    return { message: 'Account permanently deleted. All personal data has been erased.' };
  }

  async requestAccountDeletion(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true, firstName: true } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        deletedAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await this.notificationService.create({
      userId,
      type: 'system',
      title: 'Account Deletion Scheduled',
      message: 'Your account will be permanently deleted in 7 days. If this was a mistake, please contact support or cancel within the grace period.',
      priority: 'high',
      category: 'system',
      actionUrl: '/settings/account',
    });

    return {
      message: 'Account deletion scheduled. You have a 7-day grace period to cancel.',
      gracePeriodEnds: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
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
        cookie_consent: '1 year',
        data_exports: '30 days',
      },
      exportFormats: ['JSON', 'PDF'],
      exportIncludes: ['transactions', 'goals', 'bills', 'accounts', 'budgets', 'settings', 'streaks', 'badges'],
      deletionProcess: 'Account deletion removes all personal data immediately. A 7-day grace period is provided before permanent deletion. Anonymized analytics may be retained.',
      gdprContact: 'privacy@dabbu.app',
      dataProtectionOfficer: 'dpo@dabbu.app',
      legalBase: 'Consent, Contract, Legal Obligation, Legitimate Interest',
    };
  }

  async enforceDataRetention() {
    this.logger.log('Running data retention policy enforcement...');

    const now = new Date();

    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const threeYearsAgo = new Date(now.getTime() - 3 * 365 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const results: Record<string, number> = {};

    results.analyticsEventsPurged = (
      await this.prisma.analyticsEvent.deleteMany({
        where: { createdAt: { lt: ninetyDaysAgo } },
      })
    ).count;

    results.sessionLogsPurged = (
      await this.prisma.session.deleteMany({
        where: { createdAt: { lt: ninetyDaysAgo } },
      })
    ).count;

    results.notificationLogsPurged = (
      await this.prisma.notification.deleteMany({
        where: { createdAt: { lt: oneYearAgo } },
      })
    ).count;

    results.auditLogsPurged = (
      await this.prisma.auditLog.deleteMany({
        where: { createdAt: { lt: threeYearsAgo } },
      })
    ).count;

    results.dataExportsPurged = (
      await this.prisma.dataExport.deleteMany({
        where: { createdAt: { lt: thirtyDaysAgo } },
      })
    ).count;

    results.cookieConsentPurged = (
      await this.prisma.cookieConsent.deleteMany({
        where: { updatedAt: { lt: oneYearAgo } },
      })
    ).count;

    results.inactiveAccountsFlagged = (
      await this.prisma.user.updateMany({
        where: {
          deletedAt: { lte: now },
          isActive: true,
        },
        data: { isActive: false, deletedAt: now },
      })
    ).count;

    this.logger.log(`Data retention enforcement complete: ${JSON.stringify(results)}`);
    return results;
  }

  async exportPdf(userId: string): Promise<{ buffer: Buffer; filename: string }> {
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50 });
    const buffers: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => buffers.push(chunk));

    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve({ buffer: Buffer.concat(buffers), filename: `dabbu-export-${Date.now()}.pdf` }));
      doc.on('error', reject);

      doc.fontSize(24).font('Helvetica-Bold').text('Dabbu Data Export', { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).font('Helvetica').text(`Generated: ${new Date().toISOString()}`, { align: 'center' });
      doc.moveDown(2);

      doc.fontSize(16).font('Helvetica-Bold').text('Summary');
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica').text(
        'This export contains your personal data from Dabbu as requested under GDPR Article 20.',
      );
      doc.moveDown(2);

      doc.end();
    });
  }

  async restoreFromExport(userId: string, exportData: any): Promise<{ restored: number; errors: string[] }> {
    let restored = 0;
    const errors: string[] = [];

    if (exportData.transactions && Array.isArray(exportData.transactions)) {
      for (const txn of exportData.transactions) {
        try {
          await this.prisma.transaction.upsert({
            where: { id: txn.id || '' },
            update: { ...txn, userId },
            create: { ...txn, userId },
          });
          restored++;
        } catch (err: any) {
          errors.push(`Transaction ${txn.id}: ${err.message}`);
        }
      }
    }

    if (exportData.goals && Array.isArray(exportData.goals)) {
      for (const goal of exportData.goals) {
        try {
          await this.prisma.goal.upsert({
            where: { id: goal.id || '' },
            update: { ...goal, userId },
            create: { ...goal, userId },
          });
          restored++;
        } catch (err: any) {
          errors.push(`Goal ${goal.id}: ${err.message}`);
        }
      }
    }

    if (exportData.bills && Array.isArray(exportData.bills)) {
      for (const bill of exportData.bills) {
        try {
          await this.prisma.bill.upsert({
            where: { id: bill.id || '' },
            update: { ...bill, userId },
            create: { ...bill, userId },
          });
          restored++;
        } catch (err: any) {
          errors.push(`Bill ${bill.id}: ${err.message}`);
        }
      }
    }

    if (exportData.accounts && Array.isArray(exportData.accounts)) {
      for (const account of exportData.accounts) {
        try {
          await this.prisma.account.upsert({
            where: { id: account.id || '' },
            update: { ...account, userId },
            create: { ...account, userId },
          });
          restored++;
        } catch (err: any) {
          errors.push(`Account ${account.id}: ${err.message}`);
        }
      }
    }

    if (exportData.budgets && Array.isArray(exportData.budgets)) {
      for (const budget of exportData.budgets) {
        try {
          await this.prisma.budget.upsert({
            where: { id: budget.id || '' },
            update: { ...budget, userId },
            create: { ...budget, userId },
          });
          restored++;
        } catch (err: any) {
          errors.push(`Budget ${budget.id}: ${err.message}`);
        }
      }
    }

    return { restored, errors };
  }

  async getInactiveUsers(days: number = 365) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    return this.prisma.user.findMany({
      where: {
        lastLoginAt: { lt: cutoff },
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        lastLoginAt: true, createdAt: true,
      },
      take: 100,
    });
  }

  async deleteInactiveUsers(days: number = 365) {
    const inactive = await this.getInactiveUsers(days);
    const ids = inactive.map((u) => u.id);

    if (ids.length === 0) {
      return { message: 'No inactive users found.', deleted: 0 };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.session.deleteMany({ where: { userId: { in: ids } } });
      await tx.user.deleteMany({ where: { id: { in: ids } } });
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'bulk_delete',
        entity: 'user',
        description: `Bulk deleted ${ids.length} inactive users (no activity in ${days} days)`,
      },
    });

    this.logger.log(`Deleted ${ids.length} inactive users`);
    return { message: `${ids.length} inactive users deleted.`, deleted: ids.length };
  }

  async getGrievanceOfficer() {
    return {
      data: {
        name: 'Grievance Officer',
        email: 'grievance@dabbu.app',
        responseTime: '24 hours for initial acknowledgment',
        resolutionTime: '30 days maximum',
      },
    };
  }

  async getDataLocalization() {
    return {
      primaryDatabase: { provider: 'MySQL (Aiven Cloud)', region: 'India' },
      cache: { provider: 'Redis', region: 'Same as database' },
      backups: { encrypted: true, storageRegion: 'India' },
      cdn: { provider: 'Cloudflare', global: true, indianEdgeNodes: true },
      compliance: 'Indian IT Act 2000 Section 43A & DPDP Act 2023',
    };
  }

  async exportAllUserData(adminId: string) {
    const users = await this.prisma.user.findMany({
      select: { id: true, email: true, firstName: true, lastName: true, createdAt: true, lastLoginAt: true, isActive: true },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'export_all',
        entity: 'user',
        description: `Admin exported all user data`,
      },
    });

    return {
      exportedAt: new Date().toISOString(),
      totalUsers: users.length,
      users,
    };
  }
}

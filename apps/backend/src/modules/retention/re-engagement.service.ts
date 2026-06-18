import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/dto/create-notification.dto';

@Injectable()
export class ReEngagementService {
  private readonly logger = new Logger(ReEngagementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async classifyUsers() {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const users = await this.prisma.user.findMany({
      where: { isActive: true, deletedAt: null },
      select: { id: true, email: true, firstName: true },
    });

    for (const user of users) {
      const engagement = await this.prisma.userEngagement.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id, reEngagementStage: 'active' },
      });

      if (engagement.reEngagementOptOut) continue;

      const lastAction = engagement.lastActionAt || new Date(0);
      let newStage = 'active';

      if (lastAction <= ninetyDaysAgo) newStage = 'lost_90d';
      else if (lastAction <= sixtyDaysAgo) newStage = 'dormant_60d';
      else if (lastAction <= thirtyDaysAgo) newStage = 'at_risk_30d';
      else if (lastAction <= fourteenDaysAgo) newStage = 'at_risk_14d';
      else if (lastAction <= sevenDaysAgo) newStage = 'at_risk_7d';

      if (newStage !== engagement.reEngagementStage) {
        await this.prisma.userEngagement.update({
          where: { userId: user.id },
          data: { reEngagementStage: newStage },
        });
      }
    }
  }

  private async sendReEngagement(userId: string, stage: string, userName: string, email: string) {
    const messages: Record<string, { pushTitle: string; pushBody: string; emailSubject: string }> = {
      at_risk_7d: {
        pushTitle: 'We miss you!',
        pushBody: `Hey ${userName}, it's been a week since you last checked in. Come back and see your financial progress!`,
        emailSubject: 'We miss you at Dabbu!',
      },
      at_risk_14d: {
        pushTitle: 'Your finances need attention',
        pushBody: `It's been 2 weeks, ${userName}. Your budget might need a quick check-in.`,
        emailSubject: 'Your Dabbu finances need a check-in',
      },
      at_risk_30d: {
        pushTitle: 'Don\'t lose your streak!',
        pushBody: `${userName}, you haven't visited in 30 days. Log in to keep your financial goals on track.`,
        emailSubject: 'Don\'t lose your financial momentum!',
      },
      dormant_60d: {
        pushTitle: 'Come back to Dabbu',
        pushBody: `${userName}, we have new features waiting for you! See what's new.`,
        emailSubject: 'New features waiting for you at Dabbu',
      },
      lost_90d: {
        pushTitle: 'Should we take a break?',
        pushBody: `${userName}, it's been 3 months. We'd love to have you back with a special offer.`,
        emailSubject: 'A special offer to welcome you back',
      },
    };

    const msg = messages[stage];
    if (!msg) return;

    await this.notificationService.create({
      userId,
      type: NotificationType.SYSTEM,
      title: msg.pushTitle,
      message: msg.pushBody,
      priority: 'medium',
      category: 'system',
      data: { reEngagement: true, stage },
    });

    await this.prisma.userEngagement.update({
      where: { userId },
      data: {
        reEngagementSentCount: { increment: 1 },
        lastNotificationSentAt: new Date(),
      },
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async processReEngagement() {
    this.logger.log('Running re-engagement classification...');
    await this.classifyUsers();
    this.logger.log('Processing re-engagement notifications...');

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const atRiskUsers = await this.prisma.userEngagement.findMany({
      where: {
        reEngagementOptOut: false,
        OR: [
          { reEngagementStage: 'at_risk_7d', lastNotificationSentAt: null },
          { reEngagementStage: 'at_risk_14d', lastNotificationSentAt: null },
          { reEngagementStage: 'at_risk_30d', lastNotificationSentAt: null },
          { reEngagementStage: 'dormant_60d', lastNotificationSentAt: null },
          { reEngagementStage: 'lost_90d', lastNotificationSentAt: null },
        ],
        AND: [
          { lastNotificationSentAt: null },
        ],
      },
      include: {
        user: { select: { id: true, firstName: true, email: true } },
      },
    });

    const refreshedUsers = await this.prisma.userEngagement.findMany({
      where: {
        reEngagementOptOut: false,
        lastNotificationSentAt: { lte: yesterday },
        OR: [
          { reEngagementStage: 'at_risk_7d' },
          { reEngagementStage: 'at_risk_14d' },
          { reEngagementStage: 'at_risk_30d' },
          { reEngagementStage: 'dormant_60d' },
        ],
      },
      include: {
        user: { select: { id: true, firstName: true, email: true } },
      },
    });

    const toReach = [...atRiskUsers, ...refreshedUsers];
    for (const eu of toReach) {
      const daysSinceLastNotif = eu.lastNotificationSentAt
        ? Math.floor((now.getTime() - eu.lastNotificationSentAt.getTime()) / (1000 * 60 * 60 * 24))
        : 99;
      if (daysSinceLastNotif < 7) continue;
      if (eu.reEngagementSentCount >= 3) continue;

      try {
        await this.sendReEngagement(
          eu.userId,
          eu.reEngagementStage,
          eu.user.firstName || 'there',
          eu.user.email,
        );
      } catch (err: any) {
        this.logger.error(`Re-engagement failed for user ${eu.userId}: ${err.message}`);
      }
    }
    this.logger.log(`Re-engagement sent to ${toReach.length} users`);
  }

  async optOutReEngagement(userId: string) {
    return this.prisma.userEngagement.upsert({
      where: { userId },
      update: { reEngagementOptOut: true },
      create: { userId, reEngagementOptOut: true },
    });
  }

  async optInReEngagement(userId: string) {
    return this.prisma.userEngagement.upsert({
      where: { userId },
      update: { reEngagementOptOut: false, reEngagementStage: 'active' },
      create: { userId, reEngagementOptOut: false },
    });
  }
}

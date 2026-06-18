import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RetentionService } from './retention.service';

@Injectable()
export class RetentionScheduler {
  private readonly logger = new Logger(RetentionScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly retentionService: RetentionService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_11AM)
  async dailyStreakCheck() {
    this.logger.log('Running daily streak check for active users...');
    const activeUsers = await this.prisma.user.findMany({
      where: { isActive: true, deletedAt: null },
      select: { id: true },
    });
    for (const user of activeUsers) {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const streaks = await this.prisma.userStreak.findMany({
        where: { userId: user.id },
      });
      for (const streak of streaks) {
        if (streak.lastActivityAt && streak.lastActivityAt < yesterday) {
          const lastDay = new Date(streak.lastActivityAt);
          const today = new Date();
          const diffDays = Math.round((today.getTime() - lastDay.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays > 1 && ['daily', 'weekly', 'monthly', 'financial'].includes(streak.streakType)) {
            await this.prisma.userStreak.update({
              where: { id: streak.id },
              data: { currentStreak: 1 },
            });
            this.logger.debug(`Reset streak ${streak.streakType} for user ${user.id}`);
          }
        }
      }
    }
  }

  @Cron('0 9 1 1 *')
  async generateNewYearSummaries() {
    this.logger.log('Generating end-of-year summaries...');
    const lastYear = new Date().getFullYear() - 1;
    const users = await this.prisma.user.findMany({
      where: { isActive: true, deletedAt: null },
      select: { id: true },
    });
    for (const user of users) {
      try {
        await this.retentionService.generateYearlySummary(user.id, lastYear);
      } catch (err: any) {
        this.logger.error(`Failed yearly summary for user ${user.id}: ${err.message}`);
      }
    }
    this.logger.log(`Generated ${users.length} yearly summaries for ${lastYear}`);
  }
}

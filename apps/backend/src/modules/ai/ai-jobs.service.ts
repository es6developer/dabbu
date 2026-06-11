import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AiService } from './ai.service';

@Injectable()
export class AiJobsService {
  private readonly logger = new Logger(AiJobsService.name);
  private readonly BATCH_SIZE = 50;
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async runDailyJobs() {
    if (this.isRunning) {return;}
    this.isRunning = true;
    this.logger.log('Starting daily AI computation for all users...');

    try {
      const users = await this.prisma.user.findMany({
        where: { deletedAt: null },
        select: { id: true },
      });

      for (let i = 0; i < users.length; i += this.BATCH_SIZE) {
        const batch = users.slice(i, i + this.BATCH_SIZE);
        await Promise.allSettled(
          batch.map(u =>
            this.aiService.computeDailyForUser(u.id).catch(e =>
              this.logger.error(`Daily AI failed for user ${u.id}: ${e.message}`)
            )
          )
        );
        this.logger.log(`Daily AI: processed ${Math.min(i + this.BATCH_SIZE, users.length)}/${users.length} users`);
      }

      this.logger.log('Daily AI computation completed');
    } catch (error) {
      this.logger.error(`Daily AI job failed: ${(error as Error).message}`);
    } finally {
      this.isRunning = false;
    }
  }

  @Cron('0 1 * * 1')
  async runWeeklyJobs() {
    this.logger.log('Starting weekly AI computation...');

    try {
      const users = await this.prisma.user.findMany({
        where: { deletedAt: null },
        select: { id: true },
      });

      for (let i = 0; i < users.length; i += this.BATCH_SIZE) {
        const batch = users.slice(i, i + this.BATCH_SIZE);
        await Promise.allSettled(
          batch.map(u =>
            this.aiService.computeWeeklyForUser(u.id).catch(e =>
              this.logger.error(`Weekly AI failed for user ${u.id}: ${e.message}`)
            )
          )
        );
      }

      this.logger.log('Weekly AI computation completed');
    } catch (error) {
      this.logger.error(`Weekly AI job failed: ${(error as Error).message}`);
    }
  }

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async runMonthlyJobs() {
    this.logger.log('Starting monthly AI computation...');

    try {
      const users = await this.prisma.user.findMany({
        where: { deletedAt: null },
        select: { id: true },
      });

      for (let i = 0; i < users.length; i += this.BATCH_SIZE) {
        const batch = users.slice(i, i + this.BATCH_SIZE);
        await Promise.allSettled(
          batch.map(u =>
            this.aiService.computeMonthlyForUser(u.id).catch(e =>
              this.logger.error(`Monthly AI failed for user ${u.id}: ${e.message}`)
            )
          )
        );
      }

      this.logger.log('Monthly AI computation completed');
    } catch (error) {
      this.logger.error(`Monthly AI job failed: ${(error as Error).message}`);
    }
  }

  @Cron(CronExpression.EVERY_6_HOURS)
  async regenerateDailyFeeds() {
    if (this.isRunning) {return;}
    this.isRunning = true;
    this.logger.log('Starting feed regeneration for all users...');

    try {
      const users = await this.prisma.user.findMany({
        where: { deletedAt: null },
        select: { id: true },
      });

      for (let i = 0; i < users.length; i += this.BATCH_SIZE) {
        const batch = users.slice(i, i + this.BATCH_SIZE);
        await Promise.allSettled(
          batch.map(u =>
            this.aiService.generateTodayFeed(u.id).catch(e =>
              this.logger.error(`Feed generation failed for user ${u.id}: ${e.message}`)
            )
          )
        );
        this.logger.log(`Feed regen: processed ${Math.min(i + this.BATCH_SIZE, users.length)}/${users.length} users`);
      }

      this.logger.log('Feed regeneration completed');
    } catch (error) {
      this.logger.error(`Feed regeneration job failed: ${(error as Error).message}`);
    } finally {
      this.isRunning = false;
    }
  }
}

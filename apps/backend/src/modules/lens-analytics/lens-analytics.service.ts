import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class LensAnalyticsService {
  private readonly logger = new Logger(LensAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async trackLensSwitch(
    userId: string,
    fromLens: string | undefined,
    toLens: string,
    reason = 'manual',
    metadata: Record<string, unknown> = {},
  ): Promise<void> {
    await this.prisma.lensSwitchLog.create({
      data: {
        userId,
        fromLens: (fromLens || 'PERSONAL') as any,
        toLens: toLens as any,
        reason,
        metadata: metadata as any,
      },
    });
  }

  async getLensSwitchHistory(userId: string, limit = 20) {
    return this.prisma.lensSwitchLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getLensEngagementStats(userId: string) {
    const logs = await this.prisma.lensSwitchLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    const timeInLens: Record<string, number> = {};
    let lastSwitch: (typeof logs)[0] | null = null;

    for (const log of logs) {
      if (lastSwitch) {
        const duration = log.createdAt.getTime() - lastSwitch.createdAt.getTime();
        const lensKey = lastSwitch.toLens;
        timeInLens[lensKey] = (timeInLens[lensKey] || 0) + duration;
      }
      lastSwitch = log;
    }

    const totalByLens: Record<string, number> = {};
    for (const log of logs) {
      totalByLens[log.toLens] = (totalByLens[log.toLens] || 0) + 1;
    }

    return {
      totalSwitches: logs.length,
      switchesByLens: totalByLens,
      estimatedTimeInLensMs: timeInLens,
      lastSwitch: logs[logs.length - 1] || null,
    };
  }

  async getMostUsedLens(userId: string): Promise<string> {
    const stats = await this.getLensEngagementStats(userId);
    const switches = stats.switchesByLens;
    let maxLens = 'PERSONAL';
    let maxCount = 0;

    for (const [lens, count] of Object.entries(switches)) {
      if (count > maxCount) {
        maxCount = count;
        maxLens = lens;
      }
    }

    return maxLens;
  }
}

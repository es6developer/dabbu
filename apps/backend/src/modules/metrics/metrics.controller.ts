import { Controller, Get, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SkipThrottle } from '@nestjs/throttler';

@SkipThrottle()
@Controller('metrics')
export class MetricsController {
  private readonly logger = new Logger(MetricsController.name);
  private readonly startTime = Date.now();

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getMetrics() {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    const memoryUsage = process.memoryUsage();

    let dbConnections = 0;
    try {
      const result = await this.prisma.$queryRawUnsafe<Array<{ Count: number }>>(
        'SELECT COUNT(*) as Count FROM information_schema.processlist'
      );
      dbConnections = Number(result[0]?.Count || 0);
    } catch {}

    const metrics = [
      `# HELP dabbu_up Is the service up`,
      `# TYPE dabbu_up gauge`,
      `dabbu_up 1`,
      ``,
      `# HELP dabbu_uptime_seconds Service uptime`,
      `# TYPE dabbu_uptime_seconds counter`,
      `dabbu_uptime_seconds ${uptime}`,
      ``,
      `# HELP dabbu_memory_bytes Memory usage in bytes`,
      `# TYPE dabbu_memory_bytes gauge`,
      `dabbu_memory_bytes{type="rss"} ${memoryUsage.rss}`,
      `dabbu_memory_bytes{type="heapTotal"} ${memoryUsage.heapTotal}`,
      `dabbu_memory_bytes{type="heapUsed"} ${memoryUsage.heapUsed}`,
      `dabbu_memory_bytes{type="external"} ${memoryUsage.external}`,
      ``,
      `# HELP dabbu_db_connections Current database connections`,
      `# TYPE dabbu_db_connections gauge`,
      `dabbu_db_connections ${dbConnections}`,
      ``,
      `# HELP dabbu_active_users Current active user count`,
      `# TYPE dabbu_active_users gauge`,
      `dabbu_active_users ${await this.getActiveUserCount()}`,
    ].join('\n');

    return metrics;
  }

  private async getActiveUserCount(): Promise<number> {
    try {
      return await this.prisma.user.count({
        where: { isActive: true },
      });
    } catch {
      return 0;
    }
  }
}

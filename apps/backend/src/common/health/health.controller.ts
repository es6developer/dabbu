import { Controller, Get, HttpCode, HttpStatus, Inject, Optional } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../decorators';
import { PrismaService } from '../prisma/prisma.service';
import * as os from 'os';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    database: { status: string; latency?: number; error?: string };
    redis?: { status: string; error?: string };
    bullmq?: { status: string; jobCounts?: any };
    memory: { usage: string; heapUsed: number; heapTotal: number; rss: number };
    cpu: { loadAverage: number[]; cores: number };
    disk?: { status: string; free?: number; total?: number };
  };
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly startTime = Date.now();
  private readonly version = process.env.npm_package_version || '1.0.0';

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Optional() @InjectQueue('notification-queue') private readonly notificationQueue?: Queue,
  ) {}

  @Get()
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Health check endpoint' })
  async check(): Promise<HealthStatus> {
    const dbStart = Date.now();
    let dbStatus = 'healthy';
    let dbError: string | undefined;
    let dbLatency: number | undefined;

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - dbStart;
    } catch (err) {
      dbStatus = 'unhealthy';
      dbError = err instanceof Error ? err.message : 'Database connection failed';
    }

    let redisStatus: string | undefined;
    let redisError: string | undefined;
    let bullmqJobCounts: any = undefined;
    try {
      if (this.notificationQueue) {
        const counts = await this.notificationQueue.getJobCounts();
        bullmqJobCounts = counts;
        redisStatus = 'healthy';
      } else {
        redisStatus = 'not_configured';
      }
    } catch (err) {
      redisStatus = 'unhealthy';
      redisError = err instanceof Error ? err.message : 'Redis connection failed';
    }

    const memUsage = process.memoryUsage();
    let diskStatus: string | undefined;
    let diskFree: number | undefined;
    let diskTotal: number | undefined;
    try {
      const df = require('child_process').execSync('df -k / | tail -1').toString().trim().split(/\s+/);
      diskTotal = parseInt(df[1]) * 1024;
      diskFree = parseInt(df[3]) * 1024;
      diskStatus = diskFree && diskTotal && (diskFree / diskTotal) > 0.1 ? 'healthy' : 'low_space';
    } catch {}

    const isDegraded = dbStatus === 'unhealthy';
    const status: HealthStatus['status'] = isDegraded ? 'unhealthy' : 'healthy';

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      version: this.version,
      services: {
        database: { status: dbStatus, latency: dbLatency, error: dbError },
        ...(redisStatus !== undefined ? {
          redis: { status: redisStatus || '', error: redisError },
          bullmq: { status: redisStatus || '', jobCounts: bullmqJobCounts },
        } : {}),
        memory: {
          usage: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          rss: memUsage.rss,
        },
        cpu: { loadAverage: os.loadavg(), cores: os.cpus().length },
        ...(diskStatus ? { disk: { status: diskStatus, free: diskFree, total: diskTotal } } : {}),
      },
    };
  }

  @Get('ready')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Readiness check' })
  async readiness(): Promise<{ status: string }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ready' };
    } catch {
      return { status: 'not ready' };
    }
  }

  @Get('live')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Liveness check' })
  liveness(): { status: string } {
    return { status: 'alive' };
  }
}

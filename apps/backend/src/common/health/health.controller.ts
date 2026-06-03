import { Controller, Get, HttpCode, HttpStatus, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../decorators';
import { PrismaService } from '../prisma/prisma.service';
import * as os from 'os';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    database: { status: string; latency?: number; error?: string };
    redis?: { status: string; error?: string };
    memory: { usage: string; heapUsed: number; heapTotal: number };
    cpu: { loadAverage: number[]; cores: number };
  };
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly startTime = Date.now();
  private readonly version = process.env.npm_package_version || '1.0.0';

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

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

    const memUsage = process.memoryUsage();
    const status: HealthStatus['status'] = dbStatus === 'unhealthy' ? 'unhealthy' : 'healthy';

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      version: this.version,
      services: {
        database: { status: dbStatus, latency: dbLatency, error: dbError },
        memory: {
          usage: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
        },
        cpu: {
          loadAverage: os.loadavg(),
          cores: os.cpus().length,
        },
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
}

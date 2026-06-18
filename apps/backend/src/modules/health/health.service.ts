import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  async checkRedis(): Promise<boolean> {
    try {
      const { default: Redis } = await import('ioredis');
      const host = process.env.REDIS_HOST || 'localhost';
      const port = parseInt(process.env.REDIS_PORT || '6379', 10);
      const password = process.env.REDIS_PASSWORD || '';
      const client = new Redis({ host, port, password, lazyConnect: true });
      await client.connect();
      await client.ping();
      await client.quit();
      return true;
    } catch {
      return false;
    }
  }
}

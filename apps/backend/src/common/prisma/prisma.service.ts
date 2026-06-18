import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const baseUrl = process.env.DATABASE_URL;
    const isDev = process.env.NODE_ENV !== 'production';
    const poolOpts = isDev
      ? 'connection_limit=5&pool_timeout=30'
      : 'connection_limit=10&pool_timeout=30';
    const connector = baseUrl?.includes('mysql') ? 'mysql' : 'mysql';
    const url = baseUrl
      ? baseUrl.includes('?')
        ? `${baseUrl}&${poolOpts}`
        : `${baseUrl}?${poolOpts}`
      : `mysql://root:@localhost:3306/dabbu?${poolOpts}`;
    super({
      log: isDev ? ['query', 'info', 'warn', 'error'] : ['error'],
      datasourceUrl: url,
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Database connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect to database', (error as Error).message);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  async cleanDatabase(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production');
    }
    const tableNames = Object.values(this).filter(
      (value): value is { tableName: string } =>
        typeof value === 'object' && value !== null && 'tableName' in value,
    );
    for (const table of tableNames) {
      await this.$executeRawUnsafe(`DELETE FROM \`${table.tableName}\``);
    }
  }
}

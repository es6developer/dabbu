import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const baseUrl = process.env.DATABASE_URL;
    const url = baseUrl
      ? baseUrl.includes('?')
        ? baseUrl + '&connection_limit=1&pool_timeout=10'
        : baseUrl + '?connection_limit=1&pool_timeout=10'
      : 'mysql://root:@localhost:3306/dabbu?connection_limit=1&pool_timeout=10';
    super({
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
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

import { Module, MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';

// Config
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';

// Database
import { DatabaseModule } from './database/database.module';
import { PrismaModule } from './common/prisma/prisma.module';

// Common
import { SecurityConfig } from './common/security/security.config';
import { HealthController } from './common/health/health.controller';

// Modules
import { AuthModule } from './modules/auth/auth.module';
import { FamilyModule } from './modules/family/family.module';
import { ChatModule } from './modules/chat/chat.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ReminderModule } from './modules/reminder/reminder.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { NotificationModule } from './modules/notification/notification.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AdminModule } from './modules/admin/admin.module';
import { SmsDetectionModule } from './modules/sms-detection/sms-detection.module';
import { FeaturesModule } from './modules/features/features.module';
import { BillsModule } from './modules/bills/bills.module';
import { SharedFinanceModule } from './modules/shared-finance/shared-finance.module';
import { ExternalSharingModule } from './modules/external-sharing/external-sharing.module';
import { AiInsightsModule } from './modules/ai-insights/ai-insights.module';

@Module({
  imports: [
    // ─── Configuration ─────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig],
      envFilePath: ['.env', '.env.local'],
    }),

    // ─── Rate Limiting ──────────────────────────────
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('app.throttleTtl', 60),
            limit: config.get<number>('app.throttleLimit', 100),
          },
        ],
      }),
    }),

    // ─── Queue/BullMQ ───────────────────────────────
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('database.redisHost', 'localhost'),
          port: config.get<number>('database.redisPort', 6379),
        },
      }),
    }),

    // ─── Scheduling ─────────────────────────────────
    ScheduleModule.forRoot(),

    // ─── Database ───────────────────────────────────
    DatabaseModule,
    PrismaModule,

    // ─── Application Modules ────────────────────────
    AuthModule,
    FamilyModule,
    ChatModule,
    AccountsModule,
    TransactionsModule,
    CategoriesModule,
    ReminderModule,
    SubscriptionModule,
    NotificationModule,
    AnalyticsModule,
    AdminModule,
    SmsDetectionModule,
    FeaturesModule,
    BillsModule,
    SharedFinanceModule,
    ExternalSharingModule,
    AiInsightsModule,
  ],
  controllers: [HealthController],
  providers: [
    SecurityConfig,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

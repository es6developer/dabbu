import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';

import appConfig from '../src/config/app.config';
import databaseConfig from '../src/config/database.config';
import jwtConfig from '../src/config/jwt.config';

import { DatabaseModule } from '../src/database/database.module';
import { PrismaModule } from '../src/common/prisma/prisma.module';
import { SecurityConfig } from '../src/common/security/security.config';
import { HealthController } from '../src/common/health/health.controller';

import { AuthModule } from '../src/modules/auth/auth.module';
import { FamilyModule } from '../src/modules/family/family.module';
import { ChatModule } from '../src/modules/chat/chat.module';
import { AccountsModule } from '../src/modules/accounts/accounts.module';
import { TransactionsModule } from '../src/modules/transactions/transactions.module';
import { CategoriesModule } from '../src/modules/categories/categories.module';
import { ReminderModule } from '../src/modules/reminder/reminder.module';
import { SubscriptionModule } from '../src/modules/subscription/subscription.module';
import { NotificationModule } from '../src/modules/notification/notification.module';
import { AnalyticsModule } from '../src/modules/analytics/analytics.module';
import { AdminModule } from '../src/modules/admin/admin.module';
import { SmsDetectionModule } from '../src/modules/sms-detection/sms-detection.module';
import { FeaturesModule } from '../src/modules/features/features.module';
import { BillsModule } from '../src/modules/bills/bills.module';
import { SharedFinanceModule } from '../src/modules/shared-finance/shared-finance.module';
import { ExternalSharingModule } from '../src/modules/external-sharing/external-sharing.module';
import { AiInsightsModule } from '../src/modules/ai-insights/ai-insights.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [{
          ttl: config.get<number>('app.throttleTtl', 60),
          limit: config.get<number>('app.throttleLimit', 100),
        }],
      }),
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    PrismaModule,
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
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class ServerlessAppModule {}

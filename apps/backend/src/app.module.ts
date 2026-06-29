import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import isRedisAvailable from './common/redis.util';

// Config
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import mailConfig from './config/mail.config';
import firebaseConfig from './config/firebase.config';
import aiConfig from './modules/ai/ai.config';
import sentryConfig from './config/sentry.config';
import expoConfig from './config/expo.config';

// Database
import { DatabaseModule } from './database/database.module';
import { PrismaModule } from './common/prisma/prisma.module';

// Common
import { SecurityConfig } from './common/security/security.config';
import { CacheModule } from './common/cache/cache.module';
import { LensDataModule } from './common/lens/lens-data.module';

// Modules
import { AuthModule } from './modules/auth/auth.module';
import { FamilyModule } from './modules/family/family.module';
import { ChatModule } from './modules/chat/chat.module';
import { CoupleModule } from './modules/couple/couple.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ReminderModule } from './modules/reminder/reminder.module';
import { PremiumModule } from './modules/premium/premium.module';
import { ExternalSharingModule } from './modules/external-sharing/external-sharing.module';
import { NotificationModule } from './modules/notification/notification.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AdminModule } from './modules/admin/admin.module';
import { SmsDetectionModule } from './modules/sms-detection/sms-detection.module';
import { ExpenseGroupsModule } from './modules/expense-groups/expense-groups.module';
import { CurrencyModule } from './modules/currency/currency.module';
import { BillsModule } from './modules/bills/bills.module';
import { GoalsModule } from './modules/goals/goals.module';
import { SharedFinanceModule } from './modules/shared-finance/shared-finance.module';
import { SettlementsModule } from './modules/settlements/settlements.module';
import { UserPreferencesModule } from './modules/user-preferences/user-preferences.module';
import { EmailModule } from './modules/email/email.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { GamificationModule } from './modules/gamification/gamification.module';
import { ReferralModule } from './modules/referral/referral.module';
import { UsersModule } from './modules/users/users.module';
import { FamilySpaceModule } from './modules/family-space/family-space.module';
import { FriendsModule } from './modules/friends/friends.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { AiModule } from './modules/ai/ai.module';
import { LifeHubModule } from './modules/life-hub/life-hub.module';
import { LifeEventsModule } from './modules/life-events/life-events.module';
import { LoansModule } from './modules/loans/loans.module';
import { NetWorthModule } from './modules/net-worth/net-worth.module';
import { BudgetsModule } from './modules/budgets/budgets.module';
import { ReportsModule } from './modules/reports/reports.module';
import { BillRemindersModule } from './modules/bill-reminders/bill-reminders.module';
import { ForecastModule } from './modules/forecast/forecast.module';
import { WealthModule } from './modules/wealth/wealth.module';
import { ChallengesModule } from './modules/challenges/challenges.module';
import { EmergencyFundModule } from './modules/emergency-fund/emergency-fund.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { FeaturesModule } from './modules/features/features.module';
import { AiFamilyAdvisorModule } from './modules/ai-family-advisor/ai-family-advisor.module';
import { RetentionModule } from './modules/retention/retention.module';
import { SearchModule } from './modules/search/search.module';
import { StorageModule } from './modules/storage/storage.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { SupportModule } from './modules/support/support.module';
import { AuditModule } from './modules/audit/audit.module';
import { HealthModule } from './modules/health/health.module';
import { HealthScoreModule } from './modules/health-score/health-score.module';
import { DabbuScoreModule } from './modules/dabbu-score/dabbu-score.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { SpacesModule } from './modules/spaces/spaces.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { LensModule } from './modules/lens/lens.module';

@Module({
  imports: [
    // ─── Configuration ─────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        databaseConfig,
        jwtConfig,
        mailConfig,
        firebaseConfig,
        aiConfig,
        sentryConfig,
        expoConfig,
      ],
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

    // ─── Queue/BullMQ (only if Redis is configured) ──
    ...(isRedisAvailable()
      ? (() => {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { BullModule } = require('@nestjs/bullmq');
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { ConfigModule } = require('@nestjs/config');
          return [
            BullModule.forRootAsync({
              imports: [ConfigModule],
              inject: [ConfigService],
              useFactory: (config: ConfigService) => ({
                connection: {
                  host: config.get('database.redisHost', 'localhost') as string,
                  port: config.get('database.redisPort', 6379) as number,
                  password: config.get('database.redisPassword', '') as string,
                },
              }),
            }),
          ];
        })()
      : []),

    // ─── Scheduling ─────────────────────────────────
    ScheduleModule.forRoot(),

    // ─── Cache ──────────────────────────────────────
    CacheModule,

    // ─── Database ───────────────────────────────────
    DatabaseModule,
    PrismaModule,

    // ─── Lens Data (shared) ─────────────────────────
    LensDataModule,

    // ─── Application Modules ────────────────────────
    AuthModule,
    FamilyModule,
    ChatModule,
    CoupleModule,
    TransactionsModule,
    CategoriesModule,
    ReminderModule,
    PremiumModule,
    ExternalSharingModule,
    NotificationModule,
    AnalyticsModule,
    AdminModule,
    SmsDetectionModule,
    BillsModule,
    ExpenseGroupsModule,
    CurrencyModule,
    GoalsModule,
    AiModule,
    SharedFinanceModule,
    SettlementsModule,
    UserPreferencesModule,
    FeaturesModule,
    FamilySpaceModule,
    EmailModule,
    DocumentsModule,
    GamificationModule,
    ReferralModule,
    UsersModule,
    FriendsModule,
    FavoritesModule,
    LifeHubModule,
    LifeEventsModule,
    LoansModule,
    NetWorthModule,
    BudgetsModule,
    ReportsModule,
    BillRemindersModule,
    ForecastModule,
    WealthModule,
    ChallengesModule,
    EmergencyFundModule,
    AccountsModule,
    DashboardModule,
    AiFamilyAdvisorModule,
    RetentionModule,
    SearchModule,
    StorageModule,
    ComplianceModule,
    SupportModule,
    AuditModule,
    HealthModule,
    HealthScoreModule,
    DabbuScoreModule,
    MetricsModule,
    SpacesModule,
    LensModule,
  ],
  controllers: [],
  providers: [
    SecurityConfig,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

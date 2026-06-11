import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { CoupleController } from './couple.controller';
import { CoupleService } from './couple.service';
import { SharedFinanceService } from '../shared-finance/shared-finance.service';
import { SettlementEngine } from '../shared-finance/engines/settlement.engine';
import { AiInsightsEngine } from '../shared-finance/engines/ai-insights.engine';
import { AccessRevocationEngine } from '../shared-finance/engines/access-revocation.engine';
import { GroupLifecycleService } from '../shared-finance/engines/group-lifecycle.service';
import { TripCostForecastEngine } from '../shared-finance/engines/trip-forecast.engine';
import { DuplicateDetectionEngine } from '../shared-finance/engines/duplicate-detection.engine';
import { NotificationModule } from '../notification/notification.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    PrismaModule,
    NotificationModule,
    EmailModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret') || 'dabbu-dev-jwt-secret',
        signOptions: {
          expiresIn: configService.get<string>('jwt.expiresIn') || '15m',
          issuer: configService.get<string>('jwt.issuer') || 'dabbu',
          audience: configService.get<string>('jwt.audience') || 'dabbu-users',
        },
      }),
    }),
  ],
  controllers: [CoupleController],
  providers: [
    CoupleService,
    SharedFinanceService,
    SettlementEngine,
    AiInsightsEngine,
    AccessRevocationEngine,
    GroupLifecycleService,
    TripCostForecastEngine,
    DuplicateDetectionEngine,
  ],
  exports: [CoupleService],
})
export class CoupleModule {}

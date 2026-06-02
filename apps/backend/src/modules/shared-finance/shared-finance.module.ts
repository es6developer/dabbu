import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { EmailModule } from '../email/email.module';
import { SharedFinanceController } from './shared-finance.controller';
import { SharedFinanceService } from './shared-finance.service';
import { SettlementEngine } from './engines/settlement.engine';
import { AiInsightsEngine } from './engines/ai-insights.engine';
import { AccessRevocationEngine } from './engines/access-revocation.engine';
import { GroupLifecycleService } from './engines/group-lifecycle.service';
import { TripCostForecastEngine } from './engines/trip-forecast.engine';
import { DuplicateDetectionEngine } from './engines/duplicate-detection.engine';
import { SharedFinanceGateway } from './gateways/shared-finance.gateway';
import { GroupMemberGuard } from './guards/group-member.guard';

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
  controllers: [SharedFinanceController],
  providers: [
    SharedFinanceService,
    SettlementEngine,
    AiInsightsEngine,
    AccessRevocationEngine,
    GroupLifecycleService,
    TripCostForecastEngine,
    DuplicateDetectionEngine,
    SharedFinanceGateway,
    GroupMemberGuard,
  ],
  exports: [SharedFinanceService, SettlementEngine, AccessRevocationEngine, GroupLifecycleService],
})
export class SharedFinanceModule implements OnModuleInit {
  private readonly logger = new Logger(SharedFinanceModule.name);

  constructor(
    private readonly sharedFinanceService: SharedFinanceService,
    private readonly gateway: SharedFinanceGateway,
  ) {}

  onModuleInit() {
    // Wire the socket server to the service so it can push revocation events
    this.sharedFinanceService.setSocketServer(this.gateway.getServer());
    this.logger.log('SharedFinanceModule initialized with socket server');
  }
}

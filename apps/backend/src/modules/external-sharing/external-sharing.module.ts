import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { SharedFinanceRealtimeModule } from '../shared-finance/realtime.module';
import { TempAuthController } from './temp-auth.controller';
import { TempAuthService } from './temp-auth.service';
import { InviteController } from './invite.controller';
import { InviteService } from './invite.service';
import { ConversionController } from './conversion.controller';
import { ConversionService } from './conversion.service';
import { PremiumTrialController } from './premium-trial.controller';
import { PremiumTrialService } from './premium-trial.service';
import { InstallTrackController } from './install-track.controller';
import { InstallTrackService } from './install-track.service';
import { LifecycleController } from './lifecycle.controller';
import { LifecycleService } from './lifecycle.service';
import { AccessControlController } from './access-control.controller';
import { AccessControlService } from './access-control.service';
import { RevocationService } from './revocation.service';
import { LifecycleNotificationService } from './lifecycle-notification.service';
import { TempUserAccessGuard, GroupStatusGuard } from './access-guard';

@Module({
  imports: [PrismaModule, SharedFinanceRealtimeModule],
  controllers: [
    TempAuthController,
    InviteController,
    ConversionController,
    PremiumTrialController,
    InstallTrackController,
    LifecycleController,
    AccessControlController,
  ],
  providers: [
    TempAuthService,
    InviteService,
    ConversionService,
    PremiumTrialService,
    InstallTrackService,
    LifecycleService,
    AccessControlService,
    RevocationService,
    LifecycleNotificationService,
    TempUserAccessGuard,
    GroupStatusGuard,
  ],
  exports: [
    TempAuthService,
    InviteService,
    ConversionService,
    PremiumTrialService,
    InstallTrackService,
    LifecycleService,
    AccessControlService,
    RevocationService,
    LifecycleNotificationService,
    TempUserAccessGuard,
    GroupStatusGuard,
  ],
})
export class ExternalSharingModule {}

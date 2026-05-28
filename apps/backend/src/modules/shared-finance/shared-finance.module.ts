import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import { SettlementsController } from './settlements.controller';
import { SettlementsService } from './settlements.service';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';
import { CoupleController } from './couple.controller';
import { CoupleService } from './couple.service';
import { SubscriptionsController, SubscriptionsRemindersController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { ContributionsController } from './contributions.controller';
import { ContributionsService } from './contributions.service';
import { InsightsController } from './insights.controller';
import { InsightsService } from './insights.service';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { SharedFinanceRealtimeModule } from './realtime.module';

@Module({
  imports: [PrismaModule, SharedFinanceRealtimeModule],
  controllers: [
    GroupsController,
    ExpensesController,
    SettlementsController,
    TripsController,
    CoupleController,
    SubscriptionsController,
    SubscriptionsRemindersController,
    ContributionsController,
    InsightsController,
    ChatController,
  ],
  providers: [
    GroupsService,
    ExpensesService,
    SettlementsService,
    TripsService,
    CoupleService,
    SubscriptionsService,
    ContributionsService,
    InsightsService,
    ChatService,
  ],
  exports: [
    GroupsService,
    ExpensesService,
    SettlementsService,
    TripsService,
    CoupleService,
    SubscriptionsService,
    ContributionsService,
    InsightsService,
    ChatService,
  ],
})
export class SharedFinanceModule {}

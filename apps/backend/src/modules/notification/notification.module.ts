import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../../common/prisma/prisma.module';
import isRedisAvailable from '../../common/redis.util';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationEventsService } from './notification-events.service';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { NotificationProcessor } from './notification.processor';
import { FcmService } from './fcm.service';
import { NotificationGateway } from './notification.gateway';

@Module({
  imports: [
    PrismaModule,
    ScheduleModule.forRoot(),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: { expiresIn: configService.get<string>('jwt.expiresIn') },
      }),
    }),
    ...(isRedisAvailable()
      ? (() => {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { BullModule } = require('@nestjs/bullmq');
          return [
            BullModule.registerQueue({
              name: 'notification-queue',
            }),
          ];
        })()
      : []),
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationEventsService,
    NotificationSchedulerService,
    ...(isRedisAvailable() ? [NotificationProcessor] : []),
    FcmService,
    NotificationGateway,
  ],
  exports: [NotificationService, NotificationEventsService, FcmService, NotificationGateway],
})
export class NotificationModule {}

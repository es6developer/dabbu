import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { NotificationModule } from '../notification/notification.module';
import { FeaturesModule } from '../features/features.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminGuard } from './guards';

@Module({
  imports: [
    PrismaModule,
    EmailModule,
    NotificationModule,
    FeaturesModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret') || 'dabbu-dev-jwt-secret',
        signOptions: {
          expiresIn: configService.get<string>('jwt.adminExpiresIn') || '8h',
          issuer: configService.get<string>('jwt.issuer') || 'dabbu',
          audience: 'dabbu-admins',
        },
      }),
    }),
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminGuard],
  exports: [AdminService],
})
export class AdminModule {}

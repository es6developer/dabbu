import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AvatarController } from './avatar.controller';
import { JwtStrategy } from './jwt.strategy';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { ReferralModule } from '../referral/referral.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    PrismaModule,
    EmailModule,
    ReferralModule,
    NotificationModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
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
  controllers: [AuthController, AvatarController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}

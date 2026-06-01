import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ExternalSharingController } from './external-sharing.controller';
import { ExternalSharingService } from './external-sharing.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { JwtStrategy } from '../auth/jwt.strategy';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret') || 'dabbu-dev-jwt-secret',
        signOptions: {
          expiresIn: '15m',
          issuer: configService.get<string>('jwt.issuer') || 'dabbu',
          audience: configService.get<string>('jwt.audience') || 'dabbu-users',
        },
      }),
    }),
  ],
  controllers: [ExternalSharingController],
  providers: [ExternalSharingService, JwtStrategy],
  exports: [ExternalSharingService],
})
export class ExternalSharingModule {}

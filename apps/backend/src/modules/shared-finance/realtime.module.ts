import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { SharedFinanceGateway } from './realtime.gateway';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || 'dabbu-jwt-secret',
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  providers: [SharedFinanceGateway],
  exports: [SharedFinanceGateway],
})
export class SharedFinanceRealtimeModule {}

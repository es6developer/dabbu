import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  exports: [PrismaModule],
})
export class DatabaseModule {}

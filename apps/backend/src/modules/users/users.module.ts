import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { SpacesModule } from '../spaces/spaces.module';
import { LensModule } from '../lens/lens.module';

@Module({
  imports: [SpacesModule, LensModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

import {
  Controller, Get, Patch, Post, Param, Body, UseGuards, HttpCode, HttpStatus, Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LifecycleService } from './lifecycle.service';
import { UpdateGroupStatusDto } from './dto/lifecycle.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('External Sharing - Lifecycle')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('external-sharing/lifecycle')
export class LifecycleController {
  constructor(private readonly lifecycleService: LifecycleService) {}

  @Patch('groups/:groupId/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update group status (transition state machine)' })
  async updateStatus(
    @CurrentUser('id') userId: string,
    @Param('groupId') groupId: string,
    @Body() dto: UpdateGroupStatusDto,
  ) {
    return this.lifecycleService.updateStatus(groupId, dto.status, userId, dto.reason);
  }

  @Get('groups/:groupId/status')
  @ApiOperation({ summary: 'Get group status' })
  async getStatus(@Param('groupId') groupId: string) {
    const result = await this.lifecycleService.getStatus(groupId);
    return { data: result };
  }

  @Get('groups/:groupId/events')
  @ApiOperation({ summary: 'Get group lifecycle events' })
  async getEvents(@Param('groupId') groupId: string) {
    const result = await this.lifecycleService.getEvents(groupId);
    return { data: result };
  }

  @Post('groups/:groupId/freeze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Freeze group (PAUSED state)' })
  async freeze(
    @CurrentUser('id') userId: string,
    @Param('groupId') groupId: string,
  ) {
    return this.lifecycleService.freeze(groupId, userId);
  }

  @Post('groups/:groupId/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete group (COMPLETED state)' })
  async complete(
    @CurrentUser('id') userId: string,
    @Param('groupId') groupId: string,
  ) {
    return this.lifecycleService.complete(groupId, userId);
  }

  @Post('groups/:groupId/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive group (ARCHIVED state)' })
  async archive(
    @CurrentUser('id') userId: string,
    @Param('groupId') groupId: string,
  ) {
    return this.lifecycleService.archive(groupId, userId);
  }

  @Post('groups/:groupId/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Close group (CLOSED state - permanent)' })
  async close(
    @CurrentUser('id') userId: string,
    @Param('groupId') groupId: string,
  ) {
    return this.lifecycleService.close(groupId, userId);
  }

  @Post('groups/:groupId/reactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reactivate group (back to ACTIVE)' })
  async reactivate(
    @CurrentUser('id') userId: string,
    @Param('groupId') groupId: string,
  ) {
    return this.lifecycleService.reactivate(groupId, userId);
  }
}

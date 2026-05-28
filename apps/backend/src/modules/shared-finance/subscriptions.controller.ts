import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import {
  CreateSubscriptionDto, UpdateSubscriptionDto, SubscriptionReminderQueryDto,
} from './dto/subscriptions.dto';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';

@ApiTags('Shared Finance - Subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shared-finance/groups/:groupId/subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create shared subscription' })
  async create(
    @Param('groupId') groupId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateSubscriptionDto,
  ) {
    return this.subscriptionsService.create(groupId, user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List group subscriptions' })
  async findAll(
    @Param('groupId') groupId: string,
    @CurrentUser() user: any,
  ) {
    return this.subscriptionsService.findAll(groupId, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get subscription detail' })
  async findOne(
    @Param('groupId') groupId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.subscriptionsService.findOne(groupId, id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update subscription' })
  async update(
    @Param('groupId') groupId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateSubscriptionDto,
  ) {
    return this.subscriptionsService.update(groupId, id, user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete subscription' })
  async delete(
    @Param('groupId') groupId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.subscriptionsService.delete(groupId, id, user.id);
  }

  @Post(':id/renew')
  @ApiOperation({ summary: 'Mark renewal' })
  async markRenewed(
    @Param('groupId') groupId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.subscriptionsService.markRenewed(groupId, id, user.id);
  }
}

@ApiTags('Shared Finance - Subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shared-finance/subscriptions')
export class SubscriptionsRemindersController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('reminders/upcoming')
  @ApiOperation({ summary: 'Get upcoming renewals across all groups' })
  async getUpcoming(
    @CurrentUser() user: any,
    @Query() query: SubscriptionReminderQueryDto,
  ) {
    return this.subscriptionsService.getUpcomingRenewals(user.id, query.days);
  }

  @Get('analytics/all')
  @ApiOperation({ summary: 'Get subscription analytics for all groups' })
  async getAnalytics(
    @CurrentUser() user: any,
    @Query('groupId') groupId: string,
  ) {
    return this.subscriptionsService.getAnalytics(groupId, user.id);
  }
}

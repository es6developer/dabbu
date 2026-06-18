import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';
import { NotificationService } from './notification.service';
import {
  ListNotificationsQueryDto,
  UpdateDeviceTokenDto,
  UpdateNotificationPreferencesDto,
  TestPushDto,
} from './dto/create-notification.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('notifications')
  @ApiOperation({ summary: 'List user notifications' })
  async findAll(
    @CurrentUser('id') userId: string,
    @Query() query: ListNotificationsQueryDto,
  ) {
    return this.notificationService.findAll(userId, query);
  }

  @Get('notifications/unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@CurrentUser('id') userId: string) {
    return this.notificationService.getUnreadCount(userId);
  }

  @Get('notifications/grouped')
  @ApiOperation({ summary: 'Get notifications grouped by category' })
  async getGrouped(@CurrentUser('id') userId: string) {
    return this.notificationService.getGroupedNotifications(userId);
  }

  @Get('notifications/filter')
  @ApiOperation({ summary: 'Filter notifications by category/priority/status' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'overdue', required: false })
  @ApiQuery({ name: 'isRead', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  async filterNotifications(
    @CurrentUser('id') userId: string,
    @Query('category') category?: string,
    @Query('priority') priority?: string,
    @Query('overdue') overdue?: string,
    @Query('isRead') isRead?: string,
    @Query('type') type?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.notificationService.getNotificationsWithFilters(userId, {
      category, priority,
      overdue: overdue !== undefined ? overdue === 'true' : undefined,
      isRead: isRead !== undefined ? isRead === 'true' : undefined,
      type,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    });
  }

  @Patch('notifications/read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@CurrentUser('id') userId: string) {
    return this.notificationService.markAllAsRead(userId);
  }

  @Patch('notifications/:id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.notificationService.markAsRead(userId, id);
  }

  @Post('notifications/:id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive a notification' })
  async archive(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.notificationService.archive(userId, id);
  }

  @Post('notifications/:id/unarchive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unarchive a notification' })
  async unarchive(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.notificationService.unarchive(userId, id);
  }

  @Post('notifications/archive-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive all notifications' })
  async archiveAll(@CurrentUser('id') userId: string) {
    return this.notificationService.archiveAll(userId);
  }

  @Get('notifications/archived')
  @ApiOperation({ summary: 'Get archived notifications' })
  async getArchived(
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.notificationService.getArchived(userId, limit ? parseInt(limit) : 50, offset ? parseInt(offset) : 0);
  }

  @Delete('notifications/all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete all notifications' })
  async deleteAll(@CurrentUser('id') userId: string) {
    return this.notificationService.deleteAll(userId);
  }

  @Delete('notifications/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a notification' })
  async remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.notificationService.remove(userId, id);
  }

  @Post('devices/register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register or update device token' })
  async registerDevice(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateDeviceTokenDto,
  ) {
    return this.notificationService.registerDevice(userId, dto.deviceId, dto.platform, dto.token, dto.deviceName);
  }

  @Post('devices/test-push')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a test push notification' })
  async testPush(@CurrentUser('id') userId: string, @Body() dto: TestPushDto) {
    return this.notificationService.testPush(userId, dto.title, dto.body);
  }

  @Delete('devices/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unregister a device' })
  async unregisterDevice(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.notificationService.unregisterDevice(userId, id);
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences (global + per-category)' })
  async getPreferences(@CurrentUser('id') userId: string) {
    return this.notificationService.getPreferences(userId);
  }

  @Patch('preferences')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update global notification preferences' })
  async updatePreferences(@CurrentUser('id') userId: string, @Body() dto: UpdateNotificationPreferencesDto) {
    return this.notificationService.updatePreferences(userId, dto);
  }

  @Get('preferences/categories')
  @ApiOperation({ summary: 'Get per-category notification preferences' })
  async getCategoryPreferences(@CurrentUser('id') userId: string) {
    return this.notificationService.getCategoryPreferences(userId);
  }

  @Patch('preferences/categories/:category')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update per-category notification preference' })
  async updateCategoryPreference(
    @CurrentUser('id') userId: string,
    @Param('category') category: string,
    @Body() data: any,
  ) {
    return this.notificationService.updateCategoryPreference(userId, category, data);
  }

  @Post('notifications/monthly-summary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate monthly reminder summary notification' })
  async generateMonthlySummary(@CurrentUser('id') userId: string) {
    return this.notificationService.sendMonthlySummary(userId);
  }
}

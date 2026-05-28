import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';
import { NotificationService } from './notification.service';
import {
  ListNotificationsQueryDto,
  UpdateDeviceTokenDto,
  UpdateNotificationPreferencesDto,
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

  @Patch('notifications/read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@CurrentUser('id') userId: string) {
    return this.notificationService.markAllAsRead(userId);
  }

  @Patch('notifications/:id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.notificationService.markAsRead(userId, id);
  }

  @Delete('notifications/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a notification' })
  async remove(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.notificationService.remove(userId, id);
  }

  @Post('devices/register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register or update device token' })
  async registerDevice(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateDeviceTokenDto,
  ) {
    return this.notificationService.registerDevice(
      userId,
      dto.deviceId,
      dto.platform,
      dto.token,
      dto.deviceName,
    );
  }

  @Delete('devices/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unregister a device' })
  async unregisterDevice(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.notificationService.unregisterDevice(userId, id);
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences' })
  async getPreferences(@CurrentUser('id') userId: string) {
    return this.notificationService.getPreferences(userId);
  }

  @Patch('preferences')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update notification preferences' })
  async updatePreferences(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    return this.notificationService.updatePreferences(userId, dto);
  }
}

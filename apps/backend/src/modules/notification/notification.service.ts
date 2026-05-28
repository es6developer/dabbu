import {
  Injectable, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FcmService } from './fcm.service';
import {
  CreateNotificationDto,
  ListNotificationsQueryDto,
  UpdateNotificationPreferencesDto,
  NotificationChannel,
} from './dto/create-notification.dto';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fcmService: FcmService,
    @InjectQueue('notification-queue') private readonly notificationQueue: Queue,
  ) {}

  async create(dto: CreateNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        message: dto.body || '',
        data: dto.data || undefined,
      },
    });

    if (dto.scheduledFor) {
      const scheduledDate = new Date(dto.scheduledFor);
      if (scheduledDate > new Date()) {
        await this.scheduleNotification(dto.userId, notification.id, scheduledDate);
        return notification;
      }
    }

    await this.sendPush(
      dto.userId,
      dto.title,
      dto.body || '',
      { notificationId: notification.id, type: dto.type },
    );

    return notification;
  }

  async findAll(userId: string, query: ListNotificationsQueryDto) {
    const { type, read, limit = 20, page = 1 } = query;
    const skip = (page - 1) * limit;

    const where: any = { userId };

    if (type) {
      where.type = type;
    }

    if (read !== undefined) {
      where.isRead = read;
    }

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data: notifications,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async markAsRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    return { message: 'All notifications marked as read' };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });

    return { count };
  }

  async remove(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notification.delete({ where: { id } });

    return { message: 'Notification deleted' };
  }

  async sendPush(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<void> {
    const devices = await this.prisma.device.findMany({
      where: { userId, isActive: true, pushToken: { not: null } },
    });

    if (devices.length === 0) {
      this.logger.warn(`No active devices found for user ${userId}`);
      return;
    }

    const notificationType = data?.type as string || 'system';

    for (const device of devices) {
      await this.sendToDevice(
        device,
        title,
        body,
        data,
        notificationType,
      );
    }
  }

  async sendToDevice(
    device: {
      id: string;
      pushToken: string | null;
      platform: string | null;
      userId: string;
    },
    title: string,
    body: string,
    data?: Record<string, any>,
    type?: string,
  ): Promise<void> {
    if (!device.pushToken) return;

    const notification = await this.prisma.notification.create({
      data: {
        userId: device.userId,
        type: type || 'system',
        title,
        message: body,
        data: data || undefined,
      },
    });

    const log = await this._createLog(
      notification.id,
      device.userId,
      NotificationChannel.PUSH,
      'queued',
    );

    try {
      const payload = this.fcmService.buildPayload(
        title,
        body,
        data,
        device.platform || undefined,
      );

      const result = await this.fcmService.sendPush(device.pushToken, payload);

      if (result.success) {
        await this._updateLogStatus(log.id, 'sent');
        await this.prisma.notification.update({
          where: { id: notification.id },
          data: { isRead: false },
        });
      } else if (result.error === 'INVALID_TOKEN') {
        await this._updateLogStatus(log.id, 'failed', 'Invalid or unregistered device token');
        await this.prisma.device.update({
          where: { id: device.id },
          data: { isActive: false },
        });
        this.logger.warn(`Deactivated device ${device.id} due to invalid token`);
      } else {
        await this._updateLogStatus(log.id, 'failed', result.error);
        throw new BadRequestException(`FCM send failed: ${result.error}`);
      }
    } catch (error: any) {
      await this._updateLogStatus(log.id, 'failed', error.message);
      throw error;
    }
  }

  async scheduleNotification(
    userId: string,
    notificationId: string,
    scheduledFor: Date,
  ): Promise<void> {
    const delay = scheduledFor.getTime() - Date.now();

    if (delay <= 0) {
      await this.sendScheduledNotification(notificationId);
      return;
    }

    await this.notificationQueue.add(
      'send-notification',
      { userId, notificationId },
      { delay, attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );

    this.logger.debug(
      `Notification ${notificationId} scheduled for ${scheduledFor.toISOString()}`,
    );
  }

  async sendScheduledNotification(notificationId: string): Promise<void> {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      this.logger.warn(`Scheduled notification ${notificationId} not found`);
      return;
    }

    await this.sendPush(
      notification.userId,
      notification.title,
      notification.message,
      { notificationId: notification.id, type: notification.type },
    );
  }

  async registerDevice(
    userId: string,
    deviceId: string,
    platform: string,
    token: string,
    deviceName?: string,
  ) {
    const existing = await this.prisma.device.findUnique({
      where: { userId_deviceId: { userId, deviceId } },
    });

    if (existing) {
      return this.prisma.device.update({
        where: { id: existing.id },
        data: {
          pushToken: token,
          platform,
          deviceName: deviceName || existing.deviceName,
          isActive: true,
          lastUsedAt: new Date(),
        },
      });
    }

    return this.prisma.device.create({
      data: {
        userId,
        deviceId,
        platform,
        pushToken: token,
        deviceName,
        isActive: true,
        lastUsedAt: new Date(),
      },
    });
  }

  async unregisterDevice(userId: string, deviceId: string) {
    const device = await this.prisma.device.findFirst({
      where: { id: deviceId, userId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    await this.prisma.device.update({
      where: { id: deviceId },
      data: { isActive: false, pushToken: null },
    });

    return { message: 'Device unregistered' };
  }

  async getPreferences(userId: string) {
    const settings = await this.prisma.settings.findUnique({
      where: { userId },
    });

    if (!settings) {
      return {
        pushNotifications: true,
        emailNotifications: true,
        smsNotifications: false,
        weeklyReport: true,
        monthlyReport: true,
      };
    }

    return {
      pushNotifications: settings.pushNotifications,
      emailNotifications: settings.emailNotifications,
      smsNotifications: settings.smsNotifications,
      weeklyReport: settings.weeklyReport,
      monthlyReport: settings.monthlyReport,
    };
  }

  async updatePreferences(userId: string, dto: UpdateNotificationPreferencesDto) {
    const updateData: any = {};

    if (dto.pushNotifications !== undefined) updateData.pushNotifications = dto.pushNotifications;
    if (dto.emailNotifications !== undefined) updateData.emailNotifications = dto.emailNotifications;
    if (dto.smsNotifications !== undefined) updateData.smsNotifications = dto.smsNotifications;
    if (dto.weeklyReport !== undefined) updateData.weeklyReport = dto.weeklyReport;
    if (dto.monthlyReport !== undefined) updateData.monthlyReport = dto.monthlyReport;

    const settings = await this.prisma.settings.upsert({
      where: { userId },
      create: {
        userId,
        ...updateData,
      },
      update: updateData,
    });

    return {
      pushNotifications: settings.pushNotifications,
      emailNotifications: settings.emailNotifications,
      smsNotifications: settings.smsNotifications,
      weeklyReport: settings.weeklyReport,
      monthlyReport: settings.monthlyReport,
    };
  }

  async handlePushOpened(notificationId: string, userId: string): Promise<void> {
    await this._createLog(notificationId, userId, NotificationChannel.PUSH, 'opened');

    await this.prisma.notificationLog.updateMany({
      where: { notificationId, userId, channel: NotificationChannel.PUSH, status: 'sent' },
      data: { status: 'opened', openedAt: new Date() },
    });
  }

  private async _createLog(
    notificationId: string,
    userId: string,
    channel: NotificationChannel,
    status: string,
  ) {
    return this.prisma.notificationLog.create({
      data: {
        notificationId,
        userId,
        channel,
        status,
      },
    });
  }

  private async _updateLogStatus(
    logId: string,
    status: string,
    errorMessage?: string,
  ) {
    const updateData: any = { status };

    if (status === 'sent') {
      updateData.deliveredAt = new Date();
    }

    if (errorMessage) {
      updateData.errorMessage = errorMessage;
    }

    return this.prisma.notificationLog.update({
      where: { id: logId },
      data: updateData,
    });
  }
}

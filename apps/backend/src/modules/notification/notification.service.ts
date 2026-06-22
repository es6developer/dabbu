import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LensDataService } from '../../common/lens/lens-data.service';
import { FcmService } from './fcm.service';
import { NotificationGateway } from './notification.gateway';
import { EmailService } from '../email/email.service';
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
    private readonly lensData: LensDataService,
    private readonly fcmService: FcmService,
    @Optional() private readonly emailService?: EmailService,
    @Optional() @InjectQueue('notification-queue') private readonly notificationQueue?: Queue | null,
    @Optional() private readonly notificationGateway?: NotificationGateway,
  ) {}

  async create(
    dto: CreateNotificationDto & {
      priority?: string;
      category?: string;
      reminderId?: string;
      actionUrl?: string;
      overdue?: boolean;
    },
  ) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        message: dto.message || dto.body || '',
        data: dto.data || undefined,
        priority: dto.priority || 'medium',
        category: dto.category || undefined,
        reminderId: dto.reminderId || undefined,
        actionUrl: dto.actionUrl || undefined,
        overdue: dto.overdue || false,
      },
    });

    if (dto.scheduledFor) {
      const scheduledDate = new Date(dto.scheduledFor);
      if (scheduledDate > new Date()) {
        await this.scheduleNotification(dto.userId, notification.id, scheduledDate);
        return notification;
      }
    }

    const prefs = await this._getCategoryPrefs(dto.userId, dto.category || dto.type);
    if (prefs?.pushEnabled !== false) {
      await this._sendPushToDevices(dto.userId, dto.title, dto.message || dto.body || '', {
        notificationId: notification.id,
        type: dto.type,
      });
    }

    if (prefs?.emailEnabled !== false && this.emailService) {
      try {
        const user = await this.prisma.user.findUnique({ where: { id: dto.userId }, select: { email: true, firstName: true } });
        if (user) {
          await this.emailService.sendNotificationEmail(
            user.email,
            user.firstName || 'there',
            dto.title,
            dto.message || dto.body || '',
            dto.actionUrl,
          );
        }
      } catch (err: any) {
        this.logger.warn(`Email notification failed for user ${dto.userId}: ${err.message}`);
      }
    }

    if (prefs?.inAppEnabled !== false) {
      this.notificationGateway?.emitNotification(dto.userId, notification);
    }

    return notification;
  }

  private async _getCategoryPrefs(userId: string, categoryOrType: string) {
    const categoryMap: Record<string, string> = {
      bill_reminder: 'bills', budget_alert: 'bills',
      goal_milestone: 'goals', goal_complete: 'goals', goal_behind: 'goals',
      expense: 'transactions', expense_alert: 'transactions', spending_spike: 'transactions',
      family_invite: 'family', family_remove: 'family', family_leave: 'family',
      couple: 'couple',
      ai_insight: 'ai',
      subscription_reminder: 'subscription', subscription_renewal: 'subscription',
      system: 'system',
    };
    const category = categoryMap[categoryOrType] || 'system';
    return this.prisma.notificationPreference.findUnique({
      where: { userId_category: { userId, category } },
    });
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

  async archive(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notification) throw new NotFoundException('Notification not found');
    return this.prisma.notification.update({
      where: { id },
      data: { isArchived: true, archivedAt: new Date() },
    });
  }

  async unarchive(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notification) throw new NotFoundException('Notification not found');
    return this.prisma.notification.update({
      where: { id },
      data: { isArchived: false, archivedAt: null },
    });
  }

  async archiveAll(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isArchived: false },
      data: { isArchived: true, archivedAt: new Date() },
    });
    return { message: 'All notifications archived' };
  }

  async deleteAll(userId: string) {
    await this.prisma.notification.deleteMany({ where: { userId } });
    return { message: 'All notifications deleted' };
  }

  async getArchived(userId: string, limit = 50, offset = 0) {
    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId, isArchived: true },
        orderBy: { archivedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.notification.count({ where: { userId, isArchived: true } }),
    ]);
    return { data, total, limit, offset };
  }

  async sendPush(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<void> {
    const notificationType = (data?.type as string) || 'system';

    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type: notificationType,
        title,
        message: body,
        data: data || undefined,
      },
    });

    await this._sendPushToDevices(userId, title, body, {
      ...data,
      notificationId: notification.id,
    });

    this.notificationGateway?.emitNotification(userId, notification);
  }

  private async _sendPushToDevices(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<void> {
    const devices = await this.prisma.device.findMany({
      where: { userId, isActive: true, pushToken: { not: null } },
    });

    if (devices.length === 0) {
      this.logger.warn(`No active devices for user ${userId}`);
      return;
    }

    for (const device of devices) {
      try {
        const payload = this.fcmService.buildPayload(
          title,
          body,
          data,
          device.platform || undefined,
        );
        const result = await this.fcmService.sendPush(device.pushToken!, payload);
        if (result.success) {
          this.logger.log(`Push sent to device ${device.id} for user ${userId}`);
        } else if (result.error === 'INVALID_TOKEN') {
          await this.prisma.device.update({
            where: { id: device.id },
            data: { isActive: false },
          });
          this.logger.warn(`Deactivated device ${device.id} — invalid push token`);
        } else {
          this.logger.error(`Push failed for device ${device.id}: ${result.error}`);
        }
      } catch (err: any) {
        this.logger.error(`Push send error for device ${device.id}: ${err.message}`);
      }
    }
  }

  async testPush(userId: string, title?: string, body?: string) {
    const devices = await this.prisma.device.findMany({
      where: { userId, isActive: true, pushToken: { not: null } },
      select: { id: true, platform: true, pushToken: true, deviceName: true },
    });

    if (devices.length === 0) {
      return {
        success: false,
        message: 'No active devices with push tokens found for your account.',
        devices: [],
      };
    }

    const results: Array<{
      deviceId: string;
      platform: string | null;
      deviceName: string | null;
      pushToken: string;
      success: boolean;
      error: string | null;
    }> = [];
    for (const device of devices) {
      try {
        const payload = this.fcmService.buildPayload(
          title || 'Test Notification',
          body || 'This is a test push notification from Dabbu',
          { type: 'test_push', timestamp: new Date().toISOString() },
          device.platform || undefined,
        );
        const result = await this.fcmService.sendPush(device.pushToken!, payload);
        results.push({
          deviceId: device.id,
          platform: device.platform,
          deviceName: device.deviceName,
          pushToken: device.pushToken?.substring(0, 30) + '...',
          success: result.success,
          error: result.error || null,
        });
        if (!result.success) {
          this.logger.warn(
            `[testPush] Device ${device.id} (${device.platform}, ${device.deviceName}) token=${device.pushToken?.substring(0, 40)}... failed: ${result.error}`,
          );
          if (result.error === 'INVALID_TOKEN') {
            await this.prisma.device.update({
              where: { id: device.id },
              data: { isActive: false },
            });
            this.logger.warn(`Deactivated device ${device.id} — invalid push token`);
          }
        }
      } catch (err: any) {
        this.logger.error(
          `[testPush] Device ${device.id} (${device.platform}, ${device.deviceName}) threw: ${err.message}`,
        );
        results.push({
          deviceId: device.id,
          platform: device.platform,
          deviceName: device.deviceName,
          pushToken: device.pushToken?.substring(0, 30) + '...',
          success: false,
          error: err.message,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    return {
      success: successCount > 0,
      message: `Sent to ${devices.length} device(s): ${successCount} succeeded, ${devices.length - successCount} failed.`,
      devices: results,
    };
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
    if (!device.pushToken) {
      return;
    }

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
      const payload = this.fcmService.buildPayload(title, body, data, device.platform || undefined);

      const result = await this.fcmService.sendPush(device.pushToken!, payload);

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

    if (!this.notificationQueue) {
      await this.sendScheduledNotification(notificationId);
      return;
    }

    await this.notificationQueue.add(
      'send-notification',
      { userId, notificationId },
      { delay, attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );

    this.logger.debug(`Notification ${notificationId} scheduled for ${scheduledFor.toISOString()}`);
  }

  async sendScheduledNotification(notificationId: string): Promise<void> {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      this.logger.warn(`Scheduled notification ${notificationId} not found`);
      return;
    }

    await this.sendPush(notification.userId, notification.title, notification.message, {
      notificationId: notification.id,
      type: notification.type,
    });
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
    const [settings, categoryPrefs] = await Promise.all([
      this.prisma.settings.findUnique({ where: { userId } }),
      this.prisma.notificationPreference.findMany({ where: { userId } }),
    ]);

    return {
      global: settings ? {
        pushNotifications: settings.pushNotifications,
        emailNotifications: settings.emailNotifications,
        smsNotifications: settings.smsNotifications,
        weeklyReport: settings.weeklyReport,
        monthlyReport: settings.monthlyReport,
      } : {
        pushNotifications: true,
        emailNotifications: true,
        smsNotifications: false,
        weeklyReport: true,
        monthlyReport: true,
      },
      categories: categoryPrefs.length > 0 ? categoryPrefs : [
        { category: 'bills', pushEnabled: true, emailEnabled: true, smsEnabled: false, inAppEnabled: true, quietHoursStart: null, quietHoursEnd: null },
        { category: 'goals', pushEnabled: true, emailEnabled: true, smsEnabled: false, inAppEnabled: true, quietHoursStart: null, quietHoursEnd: null },
        { category: 'transactions', pushEnabled: true, emailEnabled: false, smsEnabled: false, inAppEnabled: true, quietHoursStart: null, quietHoursEnd: null },
        { category: 'family', pushEnabled: true, emailEnabled: true, smsEnabled: false, inAppEnabled: true, quietHoursStart: null, quietHoursEnd: null },
        { category: 'couple', pushEnabled: true, emailEnabled: true, smsEnabled: false, inAppEnabled: true, quietHoursStart: null, quietHoursEnd: null },
        { category: 'ai', pushEnabled: true, emailEnabled: false, smsEnabled: false, inAppEnabled: true, quietHoursStart: null, quietHoursEnd: null },
        { category: 'subscription', pushEnabled: true, emailEnabled: true, smsEnabled: false, inAppEnabled: true, quietHoursStart: null, quietHoursEnd: null },
        { category: 'system', pushEnabled: true, emailEnabled: false, smsEnabled: false, inAppEnabled: true, quietHoursStart: null, quietHoursEnd: null },
      ],
    };
  }

  async updatePreferences(userId: string, dto: UpdateNotificationPreferencesDto) {
    const updateData: any = {};

    if (dto.pushNotifications !== undefined) {
      updateData.pushNotifications = dto.pushNotifications;
    }
    if (dto.emailNotifications !== undefined) {
      updateData.emailNotifications = dto.emailNotifications;
    }
    if (dto.smsNotifications !== undefined) {
      updateData.smsNotifications = dto.smsNotifications;
    }
    if (dto.weeklyReport !== undefined) {
      updateData.weeklyReport = dto.weeklyReport;
    }
    if (dto.monthlyReport !== undefined) {
      updateData.monthlyReport = dto.monthlyReport;
    }

    const settings = await this.prisma.settings.upsert({
      where: { userId },
      create: { userId, ...updateData },
      update: updateData,
    });

    return {
      global: {
        pushNotifications: settings.pushNotifications,
        emailNotifications: settings.emailNotifications,
        smsNotifications: settings.smsNotifications,
        weeklyReport: settings.weeklyReport,
        monthlyReport: settings.monthlyReport,
      },
    };
  }

  async updateCategoryPreference(userId: string, category: string, data: {
    pushEnabled?: boolean; emailEnabled?: boolean;
    smsEnabled?: boolean; inAppEnabled?: boolean;
    quietHoursStart?: number | null; quietHoursEnd?: number | null;
  }) {
    return this.prisma.notificationPreference.upsert({
      where: { userId_category: { userId, category } },
      create: { userId, category, ...data },
      update: data,
    });
  }

  async getCategoryPreferences(userId: string) {
    return this.prisma.notificationPreference.findMany({ where: { userId } });
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

  private async _updateLogStatus(logId: string, status: string, errorMessage?: string) {
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

  async getGroupedNotifications(userId: string) {
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const groups: Record<string, { label: string; notifications: typeof notifications }> = {
      overdue: { label: 'Overdue', notifications: [] },
      upcoming: { label: 'Upcoming', notifications: [] },
      paid: { label: 'Completed', notifications: [] },
      other: { label: 'Other', notifications: [] },
    };

    for (const n of notifications) {
      if (n.overdue) {
        groups.overdue.notifications.push(n);
      } else if (n.type === 'reminder_upcoming' || n.type === 'reminder') {
        groups.upcoming.notifications.push(n);
      } else if (n.type === 'goal_milestone' || n.type === 'completed') {
        groups.paid.notifications.push(n);
      } else {
        groups.other.notifications.push(n);
      }
    }

    return Object.entries(groups)
      .filter(([, g]) => g.notifications.length > 0)
      .map(([key, g]) => ({ key, ...g }));
  }

  async getNotificationsWithFilters(
    userId: string,
    filters: {
      category?: string;
      priority?: string;
      overdue?: boolean;
      isRead?: boolean;
      limit?: number;
      offset?: number;
      type?: string;
    },
  ) {
    const where: any = { userId };
    if (filters.category) {
      where.category = filters.category;
    }
    if (filters.priority) {
      where.priority = filters.priority;
    }
    if (filters.overdue !== undefined) {
      where.overdue = filters.overdue;
    }
    if (filters.isRead !== undefined) {
      where.isRead = filters.isRead;
    }
    if (filters.type) {
      where.type = filters.type;
    }

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return { data: notifications, total, limit: filters.limit || 50, offset: filters.offset || 0 };
  }

  async getNotificationAnalytics(userId?: string) {
    const where = userId ? { userId } : {};

    const [total, delivered, opened, failed] = await Promise.all([
      this.prisma.notificationLog.count({ where }),
      this.prisma.notificationLog.count({ where: { ...where, status: 'delivered' } }),
      this.prisma.notificationLog.count({ where: { ...where, status: 'opened' } }),
      this.prisma.notificationLog.count({ where: { ...where, status: 'failed' } }),
    ]);

    return {
      total,
      delivered,
      opened,
      failed,
      deliveryRate: total > 0 ? ((delivered / total) * 100).toFixed(1) + '%' : '0%',
      openRate: delivered > 0 ? ((opened / delivered) * 100).toFixed(1) + '%' : '0%',
      failureRate: total > 0 ? ((failed / total) * 100).toFixed(1) + '%' : '0%',
    };
  }

  async sendMonthlySummary(userId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const lensFilter = await this.lensData.buildLensFilter(userId);

    const [totalReminders, completedReminders, overdueReminders, upcomingReminders] =
      await Promise.all([
        this.prisma.reminder.count({ where: { userId, ...lensFilter, deletedAt: null } }),
        this.prisma.reminder.count({
          where: {
            userId,
            ...lensFilter,
            deletedAt: null,
            status: 'completed',
            updatedAt: { gte: startOfMonth, lte: endOfMonth },
          },
        }),
        this.prisma.reminder.count({
          where: { userId, ...lensFilter, deletedAt: null, status: { not: 'completed' }, dueDate: { lt: now } },
        }),
        this.prisma.reminder.count({
          where: {
            userId,
            ...lensFilter,
            deletedAt: null,
            status: 'pending',
            startDate: { gte: now, lte: endOfMonth },
          },
        }),
      ]);

    const title = 'Monthly Reminder Summary';
    const message = `${completedReminders} completed · ${overdueReminders} overdue · ${upcomingReminders} upcoming`;

    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type: 'monthly_report',
        title,
        message,
        priority: 'medium',
        category: 'summary',
        data: {
          totalReminders,
          completedReminders,
          overdueReminders,
          upcomingReminders,
          month: now.getMonth() + 1,
          year: now.getFullYear(),
        },
      },
    });

    await this.sendPush(userId, title, message, {
      notificationId: notification.id,
      type: 'monthly_report',
    }).catch(() => {});

    return notification;
  }
}

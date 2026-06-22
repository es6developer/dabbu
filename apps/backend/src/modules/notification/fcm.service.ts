import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

const BRAND_COLOR = '#4F46E5';

interface PushPayload {
  notification: {
    title: string;
    body: string;
    image?: string;
  };
  data?: Record<string, string>;
  android?: {
    priority: 'normal' | 'high';
    notification?: {
      channelId: string;
      priority: 'default' | 'high' | 'max';
      sound?: string;
      color?: string;
      tag?: string;
      image?: string;
      icon?: string;
      ticker?: string;
      sticky?: boolean;
      visibility?: 'public' | 'private' | 'secret';
      notificationCount?: number;
      notificationTimeout?: string;
      localOnly?: boolean;
      defaultVibrateTimings?: boolean;
      vibrateTimings?: number[];
    };
    fcmOptions?: {
      analyticsLabel?: string;
    };
  };
  apns?: {
    payload: {
      aps: {
        alert: { title: string; body: string };
        sound: string;
        badge: number;
        'content-available': number;
        'mutable-content'?: number;
        'thread-id'?: string;
        category?: string;
      };
    };
  };
  webpush?: {
    notification: {
      title: string;
      body: string;
      icon: string;
      vibrate: number[];
      badge?: string;
      image?: string;
      requireInteraction?: boolean;
    };
  };
}

@Injectable()
export class FcmService {
  private readonly logger = new Logger(FcmService.name);
  private initialized = false;
  private expoAccessToken: string;

  constructor(private readonly configService: ConfigService) {
    this.expoAccessToken = this.configService.get<string>('expo.accessToken', '');
    this.initializeApp();
  }

  private initializeApp(): void {
    if (this.initialized) {
      return;
    }

    const projectId = this.configService.get<string>('firebase.projectId');
    const clientEmail = this.configService.get<string>('firebase.clientEmail');
    const privateKey = this.configService.get<string>('firebase.privateKey');

    if (!projectId || !clientEmail || !privateKey) {
      this.logger.warn(
        'Firebase credentials not configured. FCM push notifications will be disabled.',
      );
      return;
    }

    try {
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, '\n'),
          }),
        });
      }
      this.initialized = true;
      this.logger.log('Firebase Admin SDK initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin SDK', error);
    }
  }

  async sendPush(
    deviceToken: string,
    payload: PushPayload,
  ): Promise<{ success: boolean; error?: string }> {
    if (deviceToken.startsWith('ExponentPushToken[') || deviceToken.startsWith('ExpoPushToken[')) {
      return this.sendExpoPush(deviceToken, payload);
    }

    if (!this.initialized) {
      return { success: false, error: 'Firebase not initialized' };
    }

    try {
      const message: admin.messaging.Message = {
        token: deviceToken,
        notification: payload.notification,
        data: payload.data,
        android: payload.android,
        apns: payload.apns,
        webpush: payload.webpush,
      };

      const response = await admin.messaging().send(message);
      this.logger.debug(`FCM sent successfully: ${response}`);
      return { success: true };
    } catch (error: any) {
      const errorCode = error.code || 'unknown';
      const errorMessage = error.message || 'FCM send failed';

      this.logger.error(`FCM error [${errorCode}]: ${errorMessage}`);

      if (
        errorCode === 'messaging/invalid-registration-token' ||
        errorCode === 'messaging/registration-token-not-registered' ||
        errorCode === 'messaging/invalid-argument'
      ) {
        return { success: false, error: 'INVALID_TOKEN' };
      }

      if (
        errorCode === 'messaging/quota-exceeded' ||
        errorCode === 'messaging/server-unavailable'
      ) {
        return { success: false, error: 'RETRYABLE' };
      }

      return { success: false, error: errorMessage };
    }
  }

  private async sendExpoPush(
    deviceToken: string,
    payload: PushPayload,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const headers: Record<string, string> = {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      };
      if (this.expoAccessToken) {
        headers['Authorization'] = `Bearer ${this.expoAccessToken}`;
      }

      const notifType = payload.data?.type as string | undefined;
      const channel = this.getChannelForType(notifType);

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          to: deviceToken,
          title: payload.notification.title,
          body: payload.notification.body,
          data: payload.data,
          sound: 'default',
          channelId: channel.channelId,
          priority: channel.priority === 'max' ? 'high' : 'default',
          badge: 1,
          ...(payload.android?.notification?.color && {
            color: payload.android.notification.color,
          }),
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        const errMsg = result?.errors?.[0]?.message || result?.message || `HTTP ${response.status}`;
        this.logger.warn(`Expo push API error [${response.status}]: ${errMsg}`);
        return { success: false, error: errMsg };
      }
      const ticket = result?.data;
      this.logger.debug(`Expo push response: ${JSON.stringify(result)}`);
      if (ticket?.status !== 'error') {
        return { success: true };
      }
      const error = ticket?.details?.error || ticket?.message || 'Expo push failed';
      if (error === 'DeviceNotRegistered') {
        return { success: false, error: 'INVALID_TOKEN' };
      }
      this.logger.warn(
        `Expo push ticket error: ${error} (token: ${deviceToken.substring(0, 30)}..., response: ${JSON.stringify(result)})`,
      );
      return { success: false, error };
    } catch (error: any) {
      this.logger.error(`Expo push error: ${error.message}`);
      return { success: false, error: error.message || 'Expo push failed' };
    }
  }

  async sendMulticast(
    tokens: string[],
    payload: PushPayload,
  ): Promise<{ successCount: number; failureCount: number; invalidTokens: string[] }> {
    if (!this.initialized || tokens.length === 0) {
      return { successCount: 0, failureCount: 0, invalidTokens: [] };
    }

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: payload.notification,
        data: payload.data,
        android: payload.android,
        apns: payload.apns,
        webpush: payload.webpush,
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      const invalidTokens: string[] = [];

      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const code = resp.error?.code || '';
          if (
            code === 'messaging/invalid-registration-token' ||
            code === 'messaging/registration-token-not-registered'
          ) {
            invalidTokens.push(tokens[idx]);
          }
        }
      });

      this.logger.debug(
        `FCM multicast: ${response.successCount} success, ${response.failureCount} failures`,
      );

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        invalidTokens,
      };
    } catch (error: any) {
      this.logger.error(`FCM multicast error: ${error.message}`);
      return {
        successCount: 0,
        failureCount: tokens.length,
        invalidTokens: tokens,
      };
    }
  }

  private getChannelForType(type?: string): {
    channelId: string;
    priority: 'default' | 'high' | 'max';
    tag: string;
    color: string;
  } {
    const map: Record<
      string,
      { channelId: string; priority: 'default' | 'high' | 'max'; tag: string; color: string }
    > = {
      expense: { channelId: 'transactions', priority: 'high', tag: 'expense', color: '#F7892C' },
      group_expense: {
        channelId: 'transactions',
        priority: 'high',
        tag: 'group_expense',
        color: '#F7892C',
      },
      expense_alert: {
        channelId: 'budgets',
        priority: 'high',
        tag: 'expense_alert',
        color: '#EF4444',
      },
      settlement_request: {
        channelId: 'settlements',
        priority: 'high',
        tag: 'settlement',
        color: '#4F46E5',
      },
      settlement_complete: {
        channelId: 'settlements',
        priority: 'high',
        tag: 'settlement',
        color: '#4F46E5',
      },
      payment_sent: {
        channelId: 'settlements',
        priority: 'high',
        tag: 'settlement',
        color: '#4F46E5',
      },
      budget_exceeded: { channelId: 'budgets', priority: 'high', tag: 'budget', color: '#EF4444' },
      budget_alert: { channelId: 'budgets', priority: 'high', tag: 'budget', color: '#F7892C' },
      goal_created: { channelId: 'goals', priority: 'default', tag: 'goal', color: '#10B981' },
      goal_milestone: { channelId: 'goals', priority: 'default', tag: 'goal', color: '#10B981' },
      goal_complete: { channelId: 'goals', priority: 'high', tag: 'goal', color: '#10B981' },
      goal_behind: { channelId: 'goals', priority: 'default', tag: 'goal', color: '#EF4444' },
      group_invite: {
        channelId: 'groups',
        priority: 'high',
        tag: 'group_invite',
        color: '#3B82F6',
      },
      group_join: { channelId: 'groups', priority: 'default', tag: 'group', color: '#3B82F6' },
      group_remove: { channelId: 'groups', priority: 'default', tag: 'group', color: '#EF4444' },
      group_leave: { channelId: 'groups', priority: 'default', tag: 'group', color: '#3B82F6' },
      member_added: { channelId: 'groups', priority: 'default', tag: 'group', color: '#3B82F6' },
      emi_reminder: { channelId: 'reminders', priority: 'high', tag: 'reminder', color: '#8B5CF6' },
      emi_overdue: {
        channelId: 'reminders',
        priority: 'max',
        tag: 'reminder_overdue',
        color: '#EF4444',
      },
      subscription_reminder: {
        channelId: 'reminders',
        priority: 'default',
        tag: 'subscription',
        color: '#8B5CF6',
      },
      bill_reminder: { channelId: 'reminders', priority: 'high', tag: 'bill', color: '#8B5CF6' },
      friend_request: { channelId: 'social', priority: 'default', tag: 'friend', color: '#4F46E5' },
      friend_accepted: {
        channelId: 'social',
        priority: 'default',
        tag: 'friend',
        color: '#10B981',
      },
      family_invite: { channelId: 'social', priority: 'default', tag: 'family', color: '#4F46E5' },
      family_remove: { channelId: 'social', priority: 'default', tag: 'family', color: '#EF4444' },
      family_leave: { channelId: 'social', priority: 'default', tag: 'family', color: '#4F46E5' },
      daily_digest: { channelId: 'insights', priority: 'default', tag: 'digest', color: '#14B8A6' },
      weekly_digest: {
        channelId: 'insights',
        priority: 'default',
        tag: 'digest',
        color: '#14B8A6',
      },
      monthly_report: {
        channelId: 'insights',
        priority: 'default',
        tag: 'report',
        color: '#14B8A6',
      },
      ai_insight: {
        channelId: 'insights',
        priority: 'default',
        tag: 'ai_insight',
        color: '#14B8A6',
      },
      system: { channelId: 'system', priority: 'default', tag: 'system', color: '#6B7280' },
    };
    return (
      map[type || ''] || {
        channelId: 'transactions',
        priority: 'high',
        tag: 'general',
        color: BRAND_COLOR,
      }
    );
  }

  buildPayload(
    title: string,
    body: string,
    data?: Record<string, any>,
    platform?: string,
  ): PushPayload {
    const safeTitle = (title || '').trim() || 'Dabbu';
    const safeBody = (body || '').trim() || 'You have a new notification';
    const notifType = data?.type as string | undefined;
    const channel = this.getChannelForType(notifType);

    const payload: PushPayload = {
      notification: { title: safeTitle, body: safeBody },
      data: data ? this.serializeData(data) : undefined,
    };

    if (platform === 'ios') {
      payload.apns = {
        payload: {
          aps: {
            alert: { title: safeTitle, body: safeBody },
            sound: 'default',
            badge: 1,
            'content-available': 1,
            'mutable-content': 1,
            'thread-id': channel.tag,
            category: notifType || 'default',
          },
        },
      };
    } else if (platform === 'android') {
      payload.android = {
        priority:
          channel.priority === 'max' ? 'high' : channel.priority === 'high' ? 'high' : 'normal',
        notification: {
          channelId: channel.channelId,
          priority: channel.priority,
          sound: 'default',
          color: channel.color,
          tag: channel.tag,
          icon: 'notification_icon',
          ticker: safeTitle,
          notificationCount: 0,
          visibility: 'public',
        },
      };
    } else {
      payload.webpush = {
        notification: {
          title: safeTitle,
          body: safeBody,
          icon: '/favicon.ico',
          vibrate: [200, 100, 200],
          badge: '/favicon.ico',
          requireInteraction: notifType === 'emi_overdue' || notifType === 'budget_exceeded',
        },
      };
    }

    return payload;
  }

  private serializeData(data: Record<string, any>): Record<string, string> {
    const serialized: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      serialized[key] = typeof value === 'string' ? value : JSON.stringify(value);
    }
    return serialized;
  }
}

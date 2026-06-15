import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

interface PushPayload {
  notification: {
    title: string;
    body: string;
  };
  data?: Record<string, string>;
  android?: {
    priority: 'normal' | 'high';
    notification?: {
      channelId: string;
      priority: 'default' | 'high' | 'max';
      sound?: string;
    };
  };
  apns?: {
    payload: {
      aps: {
        alert: { title: string; body: string };
        sound: string;
        badge: number;
        'content-available': number;
      };
    };
  };
  webpush?: {
    notification: {
      title: string;
      body: string;
      icon: string;
      vibrate: number[];
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
    if (this.initialized) {return;}

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
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          to: deviceToken,
          title: payload.notification.title,
          body: payload.notification.body,
          data: payload.data,
          sound: 'default',
          channelId: 'default',
          priority: 'high',
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
      this.logger.warn(`Expo push ticket error: ${error} (token: ${deviceToken.substring(0, 30)}..., response: ${JSON.stringify(result)})`);
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

  buildPayload(
    title: string,
    body: string,
    data?: Record<string, any>,
    platform?: string,
  ): PushPayload {
    const payload: PushPayload = {
      notification: { title, body },
      data: data ? this.serializeData(data) : undefined,
    };

    if (platform === 'ios') {
      payload.apns = {
        payload: {
          aps: {
            alert: { title, body },
            sound: 'default',
            badge: 1,
            'content-available': 1,
          },
        },
      };
    } else if (platform === 'android') {
      payload.android = {
        priority: 'high',
        notification: {
          channelId: 'default',
          priority: 'high',
          sound: 'default',
        },
      };
    } else {
      payload.webpush = {
        notification: {
          title,
          body,
          icon: '/favicon.ico',
          vibrate: [200, 100, 200],
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

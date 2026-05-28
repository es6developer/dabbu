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

  constructor(private readonly configService: ConfigService) {
    this.initializeApp();
  }

  private initializeApp(): void {
    if (this.initialized) return;

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

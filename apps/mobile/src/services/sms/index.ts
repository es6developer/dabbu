import { readSmsSince } from './smsService';
import type { SmsMessage } from './sms-parser';
import { api } from '../api';

export type SmsSyncStatus = 'idle' | 'syncing' | 'error';

export interface SmsSyncResult {
  raw: SmsMessage[];
  errors: number;
  timestamp: number;
}

let lastSyncTimestamp = Date.now() - 30 * 24 * 60 * 60 * 1000;

export async function syncSmsTransactions(): Promise<SmsSyncResult> {
  const messages = await readSmsSince(lastSyncTimestamp);
  lastSyncTimestamp = Date.now();
  return { raw: messages, errors: 0, timestamp: lastSyncTimestamp };
}

export async function sendToBackend(
  messages: SmsMessage[],
): Promise<{ success: number; failed: number; errors: string[] }> {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const msg of messages) {
    try {
      const res = await api.post<any>('/sms-detection/parse', {
        message: msg.body,
        sender: msg.address,
      });
      const body = res?.data ?? res;
      if (body?.parsed === null) {
        failed++;
        errors.push(body.message || 'Could not parse');
      } else {
        success++;
      }
    } catch (e: any) {
      failed++;
      errors.push(e?.message || 'Connection error');
    }
  }

  return { success, failed, errors };
}

export async function syncAndUpload(): Promise<
  SmsSyncResult & { upload: { success: number; failed: number; errors: string[] } }
> {
  const result = await syncSmsTransactions();
  const upload = await sendToBackend(result.raw);
  return { ...result, upload };
}

export function setSyncTimestamp(ts: number) {
  lastSyncTimestamp = ts;
}

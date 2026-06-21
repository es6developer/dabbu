import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';
import type { LensMode } from '../types';

const LENS_SWITCH_QUEUE_KEY = '@dabbu_lens_switch_queue';
const LENS_STATE_KEY = '@dabbu_lens_state';

interface PendingSwitch {
  lens: LensMode;
  reason: string;
  timestamp: number;
  retries: number;
}

export const lensPersistence = {
  getStoredLens: async (): Promise<LensMode | null> => {
    try {
      const stored = await AsyncStorage.getItem(LENS_STATE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (['PERSONAL', 'PARTNERED', 'FAMILY', 'FULL'].includes(parsed)) {
          return parsed as LensMode;
        }
      }
    } catch { /* silent */ }
    return null;
  },

  persistLens: async (lens: LensMode): Promise<void> => {
    try {
      await AsyncStorage.setItem(LENS_STATE_KEY, lens);
    } catch { /* silent */ }
  },

  queueLensSwitch: async (lens: LensMode, reason = 'manual'): Promise<void> => {
    try {
      const stored = await AsyncStorage.getItem(LENS_SWITCH_QUEUE_KEY);
      const queue: PendingSwitch[] = stored ? JSON.parse(stored) : [];
      queue.push({ lens, reason, timestamp: Date.now(), retries: 0 });
      await AsyncStorage.setItem(LENS_SWITCH_QUEUE_KEY, JSON.stringify(queue));
    } catch { /* silent */ }
  },

  flushSwitchQueue: async (): Promise<void> => {
    try {
      const stored = await AsyncStorage.getItem(LENS_SWITCH_QUEUE_KEY);
      if (!stored) return;

      const queue: PendingSwitch[] = JSON.parse(stored);
      const remaining: PendingSwitch[] = [];

      for (const sw of queue) {
        try {
          await api.put('/lens/change', { lens: sw.lens, reason: sw.reason });
        } catch {
          if (sw.retries < 3) {
            remaining.push({ ...sw, retries: sw.retries + 1 });
          }
        }
      }

      if (remaining.length > 0) {
        await AsyncStorage.setItem(LENS_SWITCH_QUEUE_KEY, JSON.stringify(remaining));
      } else {
        await AsyncStorage.removeItem(LENS_SWITCH_QUEUE_KEY);
      }
    } catch { /* silent */ }
  },

  clearQueue: async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(LENS_SWITCH_QUEUE_KEY);
    } catch { /* silent */ }
  },
};

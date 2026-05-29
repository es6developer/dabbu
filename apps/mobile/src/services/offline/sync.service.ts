import NetInfo from '@react-native-community/netinfo';
import { offlineStorage, OfflineQueueItem } from './offline-storage';
import { api, setAccessToken } from '../api';

type SyncCallback = (progress: { total: number; completed: number; failed: number }) => void;

class SyncService {
  private syncing = false;
  private listeners: Set<SyncCallback> = new Set();
  private unsubscribe: (() => void) | null = null;

  constructor() {
    this.setupConnectivity();
  }

  subscribe(cb: SyncCallback) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify(progress: { total: number; completed: number; failed: number }) {
    this.listeners.forEach(l => l(progress));
  }

  private async setupConnectivity() {
    try {
      const state = await NetInfo.fetch();
      await offlineStorage.setOnline(state.isConnected ?? true);

      this.unsubscribe = NetInfo.addEventListener(async (netState) => {
        const online = netState.isConnected ?? false;
        await offlineStorage.setOnline(online);
        if (online) {
          await this.sync();
        }
      });
    } catch (_e) {
      await offlineStorage.setOnline(true);
    }
  }

  async sync(): Promise<{ synced: number; failed: number }> {
    if (this.syncing || !offlineStorage.isOnline) {
      return { synced: 0, failed: 0 };
    }

    this.syncing = true;
    let synced = 0;
    let failed = 0;

    const queue = offlineStorage.getState().pendingQueue;
    this.notify({ total: queue.length, completed: 0, failed: 0 });

    for (const item of queue) {
      try {
        await this.processItem(item);
        await offlineStorage.dequeue(item.id);
        synced++;
        this.notify({ total: queue.length, completed: synced, failed });
      } catch (err: any) {
        await offlineStorage.markFailed(item.id, err?.message || 'Sync failed');
        failed++;
        this.notify({ total: queue.length, completed: synced, failed });
      }
    }

    this.syncing = false;
    return { synced, failed };
  }

  private async processItem(item: OfflineQueueItem) {
    const url = `/${item.resource}`;

    switch (item.action) {
      case 'create':
        await api.post(url, item.data);
        break;
      case 'update':
        await api.patch(`${url}/${item.data.id}`, item.data);
        break;
      case 'delete':
        await api.delete(`${url}/${item.data.id}`);
        break;
    }
  }

  async enqueueAndSync(action: OfflineQueueItem['action'], resource: string, data: any) {
    await offlineStorage.enqueue({ action, resource, data });
    if (offlineStorage.isOnline) {
      await this.sync();
    }
  }

  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}

export const syncService = new SyncService();

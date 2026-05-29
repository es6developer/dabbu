import AsyncStorage from '@react-native-async-storage/async-storage';

export interface OfflineQueueItem {
  id: string;
  action: 'create' | 'update' | 'delete';
  resource: string;
  data: any;
  createdAt: number;
  retries: number;
  lastError?: string;
}

export interface OfflineState {
  isOnline: boolean;
  pendingQueue: OfflineQueueItem[];
  lastSyncAt: number | null;
}

type StorageListener = (state: OfflineState) => void;

class OfflineStorage {
  private static KEY = 'offline_state';
  private listeners: Set<StorageListener> = new Set();
  private state: OfflineState = {
    isOnline: true,
    pendingQueue: [],
    lastSyncAt: null,
  };

  constructor() {
    this.load();
  }

  private async load() {
    try {
      const stored = await AsyncStorage.getItem(OfflineStorage.KEY);
      if (stored) {
        this.state = JSON.parse(stored);
      }
    } catch (_e) {
      // Use in-memory fallback
    }
  }

  private async persist() {
    try {
      await AsyncStorage.setItem(OfflineStorage.KEY, JSON.stringify(this.state));
    } catch (_e) {
      // In-memory only
    }
    this.notify();
  }

  private notify() {
    this.listeners.forEach(l => l(this.state));
  }

  subscribe(listener: StorageListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getState(): OfflineState {
    return { ...this.state };
  }

  async enqueue(item: Omit<OfflineQueueItem, 'id' | 'createdAt' | 'retries'>) {
    this.state.pendingQueue.push({
      ...item,
      id: `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(),
      retries: 0,
    });
    await this.persist();
  }

  async dequeue(id: string): Promise<OfflineQueueItem | null> {
    const idx = this.state.pendingQueue.findIndex(i => i.id === id);
    if (idx === -1) return null;
    const [item] = this.state.pendingQueue.splice(idx, 1);
    this.state.pendingQueue = [...this.state.pendingQueue];
    await this.persist();
    return item;
  }

  async markFailed(id: string, error: string) {
    const item = this.state.pendingQueue.find(i => i.id === id);
    if (item) {
      item.retries++;
      item.lastError = error;
      if (item.retries >= 5) {
        await this.dequeue(id);
      } else {
        this.state.pendingQueue = [...this.state.pendingQueue];
        await this.persist();
      }
    }
  }

  async setOnline(online: boolean) {
    this.state.isOnline = online;
    if (online) {
      this.state.lastSyncAt = Date.now();
    }
    await this.persist();
  }

  get pendingCount(): number {
    return this.state.pendingQueue.length;
  }

  get isOnline(): boolean {
    return this.state.isOnline;
  }
}

export const offlineStorage = new OfflineStorage();

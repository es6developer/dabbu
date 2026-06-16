import { api } from './api';

const SCREEN_PRELOADS: Record<string, string[]> = {
  Home: [
    '/transactions/recent?limit=10',
    '/accounts/stats',
  ],
  Settings: [
    '/user/preferences',
    '/premium/check',
  ],
  Wallet: [
    '/transactions/stats?months=3',
    '/accounts',
  ],
  SharedFinanceHome: [
    '/shared-finance/groups',
    '/expense-groups',
  ],
  GoalsList: [
    '/goals',
  ],
  NetWorth: [
    '/net-worth',
  ],
};

const preloaded = new Set<string>();

export function preloadScreenData(screenName: string): void {
  if (preloaded.has(screenName)) return;
  preloaded.add(screenName);

  const endpoints = SCREEN_PRELOADS[screenName];
  if (!endpoints) return;

  for (const ep of endpoints) {
    api.get<any>(ep).catch(() => {});
  }
}

export function resetPreloads(): void {
  preloaded.clear();
}

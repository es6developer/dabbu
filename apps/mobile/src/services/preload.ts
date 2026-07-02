import { api } from './api';

const PRELOAD_ENDPOINTS: string[] = [
  // HomeScreen dashboard — critical for first paint
  '/transactions/stats?months=1',

  // Reminders & notification badge (HomeScreen header)
  '/reminders/upcoming?days=7',
  '/notifications/unread-count',

  // Shared finance & expense groups
  '/expense-groups',
  '/shared-finance/groups',
  '/couple/dashboard',

  // Bills screen
  '/bills/upcoming',

  // Goals & savings
  '/goals',

  // Premium status (settings, upsells)
  '/premium/check',

  // User preferences (bottom menu config)
  '/user/preferences',

  // Recent transactions (HomeScreen quick view)
  '/transactions/recent?limit=10',

  // Favorites / frequent contacts
  '/favorites',
];

let _started = false;
let _promise: Promise<void> | null = null;

export function isPreloadStarted(): boolean {
  return _started;
}

export function getPreloadPromise(): Promise<void> | null {
  return _promise;
}

export function startPreloading(): Promise<void> {
  if (_promise) return _promise;

  _started = true;
  _promise = Promise.allSettled(
    PRELOAD_ENDPOINTS.map((endpoint) =>
      api.get<any>(endpoint).catch(() => {}),
    ),
  ).then(() => {}) as Promise<void>;

  return _promise;
}

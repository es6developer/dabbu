import { PlanTier } from './entitlements';
import { API_URL } from './api';

export type FeatureKey =
  | 'add_expense'
  | 'edit_expense'
  | 'delete_expense'
  | 'add_category'
  | 'sms_sync'
  | 'analytics'
  | 'recurring_detection'
  | 'ai_insights'
  | 'export_data'
  | 'family_sharing'
  | 'chat'
  | 'budgets'
  | 'bills'
  | 'goals'
  | 'investments';

export interface FeatureFlag {
  key: FeatureKey;
  label: string;
  requiredTier: PlanTier;
  enabled: boolean;
}

const DEFAULT_FEATURES: FeatureFlag[] = [
  { key: 'add_expense', label: 'Add Expense', requiredTier: 'FREE', enabled: true },
  { key: 'edit_expense', label: 'Edit Expense', requiredTier: 'FREE', enabled: true },
  { key: 'delete_expense', label: 'Delete Expense', requiredTier: 'FREE', enabled: true },
  { key: 'add_category', label: 'Add Custom Category', requiredTier: 'FREE', enabled: true },
  { key: 'sms_sync', label: 'SMS Auto-sync', requiredTier: 'FREE', enabled: true },
  { key: 'analytics', label: 'Advanced Analytics', requiredTier: 'PREMIUM', enabled: true },
  { key: 'recurring_detection', label: 'Recurring Detection', requiredTier: 'PREMIUM', enabled: true },
  { key: 'ai_insights', label: 'AI Insights', requiredTier: 'PREMIUM', enabled: true },
  { key: 'export_data', label: 'Export PDF/Excel', requiredTier: 'PREMIUM', enabled: true },
  { key: 'family_sharing', label: 'Family Sharing', requiredTier: 'FAMILY', enabled: true },
  { key: 'chat', label: 'Family Chat', requiredTier: 'FAMILY', enabled: true },
  { key: 'budgets', label: 'Budgets', requiredTier: 'FREE', enabled: true },
  { key: 'bills', label: 'Bills', requiredTier: 'FREE', enabled: true },
  { key: 'goals', label: 'Goals', requiredTier: 'FREE', enabled: true },
  { key: 'investments', label: 'Investments', requiredTier: 'PREMIUM', enabled: true },
];

let features: FeatureFlag[] = [...DEFAULT_FEATURES];

export async function loadFeatures(): Promise<void> {
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(`${API_URL}/features`, { signal: ctrl.signal });
    const json = await res.json();
    const remoteFlags = Array.isArray(json.data) ? json.data : [];
    if (remoteFlags.length > 0) {
      features = DEFAULT_FEATURES.map((f) => {
        const remote = remoteFlags.find((r: any) => r.name === f.key);
        if (remote) return { ...f, enabled: remote.isEnabled };
        return f;
      });
    }
  } catch (_e) {}
}

export function getFeature(key: FeatureKey): FeatureFlag | undefined {
  return features.find((f) => f.key === key);
}

export function isPremiumFeature(key: FeatureKey): boolean {
  return getFeature(key)?.requiredTier !== 'FREE';
}

export function isFeatureEnabled(key: FeatureKey): boolean {
  return getFeature(key)?.enabled ?? false;
}

export function getFeatures(): FeatureFlag[] {
  return features;
}

export function getPremiumFeatures(): FeatureFlag[] {
  return features.filter((f) => f.requiredTier !== 'FREE');
}

export function getFreeFeatures(): FeatureFlag[] {
  return features.filter((f) => f.requiredTier === 'FREE');
}

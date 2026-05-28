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
  | 'unlimited_accounts'
  | 'family_sharing'
  | 'chat'
  | 'budgets'
  | 'bills'
  | 'goals'
  | 'investments';

export interface FeatureFlag {
  key: FeatureKey;
  label: string;
  premium: boolean;
  enabled: boolean;
}

const DEFAULT_FEATURES: FeatureFlag[] = [
  { key: 'add_expense', label: 'Add Expense', premium: false, enabled: true },
  { key: 'edit_expense', label: 'Edit Expense', premium: false, enabled: true },
  { key: 'delete_expense', label: 'Delete Expense', premium: false, enabled: true },
  { key: 'add_category', label: 'Add Custom Category', premium: true, enabled: true },
  { key: 'sms_sync', label: 'SMS Auto-sync', premium: false, enabled: true },
  { key: 'analytics', label: 'Advanced Analytics', premium: true, enabled: true },
  { key: 'recurring_detection', label: 'Recurring Detection', premium: true, enabled: true },
  { key: 'ai_insights', label: 'AI Insights', premium: true, enabled: true },
  { key: 'export_data', label: 'Export PDF/Excel', premium: true, enabled: true },
  { key: 'unlimited_accounts', label: 'Unlimited Accounts', premium: true, enabled: true },
  { key: 'family_sharing', label: 'Family Sharing', premium: true, enabled: true },
  { key: 'chat', label: 'Family Chat', premium: true, enabled: true },
  { key: 'budgets', label: 'Budgets', premium: false, enabled: true },
  { key: 'bills', label: 'Bills', premium: false, enabled: true },
  { key: 'goals', label: 'Goals', premium: false, enabled: true },
  { key: 'investments', label: 'Investments', premium: false, enabled: true },
];

let features: FeatureFlag[] = [...DEFAULT_FEATURES];

export async function loadFeatures(): Promise<void> {
  try {
    const apiUrl = 'https://backend-es6developers-projects.vercel.app/api/v1';
    const res = await fetch(`${apiUrl}/features`);
    const json = await res.json();
    const remoteFlags = Array.isArray(json.data) ? json.data : [];

    if (remoteFlags.length > 0) {
      features = DEFAULT_FEATURES.map((f) => {
        const remote = remoteFlags.find((r: any) => r.name === f.key);
        if (remote) {
          return { ...f, enabled: remote.isEnabled };
        }
        return f;
      });
    }
  } catch {
    // keep existing features on failure
  }
}

export function getFeature(key: FeatureKey): FeatureFlag | undefined {
  return features.find((f) => f.key === key);
}

export function isPremiumFeature(key: FeatureKey): boolean {
  return getFeature(key)?.premium ?? false;
}

export function isFeatureEnabled(key: FeatureKey): boolean {
  return getFeature(key)?.enabled ?? false;
}

export function getFeatures(): FeatureFlag[] {
  return features;
}

export function getPremiumFeatures(): FeatureFlag[] {
  return features.filter((f) => f.premium);
}

export function getFreeFeatures(): FeatureFlag[] {
  return features.filter((f) => !f.premium);
}

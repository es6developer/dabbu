export interface Plan {
  name: string;
  code: string;
  price: number;
  interval?: 'month' | 'year';
  description?: string;
}

export const PLANS: Record<string, Plan> = {
  FREE: { name: 'Free', code: 'FREE', price: 0, description: 'Basic financial tracking' },
  PREMIUM_MONTHLY: { name: 'Premium Monthly', code: 'PREMIUM_MONTHLY', price: 99, interval: 'month', description: 'Full premium access' },
  PREMIUM_YEARLY: { name: 'Premium Yearly', code: 'PREMIUM_YEARLY', price: 999, interval: 'year', description: 'Best value premium' },
  FAMILY_MONTHLY: { name: 'Family Monthly', code: 'FAMILY_MONTHLY', price: 199, interval: 'month', description: 'Family financial hub' },
  FAMILY_YEARLY: { name: 'Family Yearly', code: 'FAMILY_YEARLY', price: 1999, interval: 'year', description: 'Best value family' },
};

export interface Feature {
  label: string;
  plans: string[];
  icon?: string;
  description?: string;
}

export const FEATURES: Record<string, Feature> = {
  personal_dashboard: { label: 'Personal Dashboard', plans: ['FREE', 'PREMIUM_MONTHLY', 'PREMIUM_YEARLY', 'FAMILY_MONTHLY', 'FAMILY_YEARLY'], icon: 'dashboard', description: 'Your financial overview' },
  couple_dashboard: { label: 'Couple Dashboard', plans: ['FREE', 'PREMIUM_MONTHLY', 'PREMIUM_YEARLY', 'FAMILY_MONTHLY', 'FAMILY_YEARLY'], icon: 'team', description: 'Shared couple finances' },
  net_worth: { label: 'Net Worth Tracking', plans: ['PREMIUM_MONTHLY', 'PREMIUM_YEARLY', 'FAMILY_MONTHLY', 'FAMILY_YEARLY'], icon: 'Trophy', description: 'Real-time wealth overview' },
  health_score: { label: 'Financial Health Score', plans: ['PREMIUM_MONTHLY', 'PREMIUM_YEARLY', 'FAMILY_MONTHLY', 'FAMILY_YEARLY'], icon: 'heart', description: 'AI-powered financial health' },
  ai_coach: { label: 'AI Financial Coach', plans: ['PREMIUM_MONTHLY', 'PREMIUM_YEARLY', 'FAMILY_MONTHLY', 'FAMILY_YEARLY'], icon: 'bulb1', description: 'Personal finance assistant' },
  advanced_ai: { label: 'Advanced AI Insights', plans: ['PREMIUM_MONTHLY', 'PREMIUM_YEARLY', 'FAMILY_MONTHLY', 'FAMILY_YEARLY'], icon: 'linechart', description: 'Smart financial suggestions' },
  export_pdf: { label: 'Export to PDF', plans: ['PREMIUM_MONTHLY', 'PREMIUM_YEARLY', 'FAMILY_MONTHLY', 'FAMILY_YEARLY'], icon: 'download', description: 'Professional reports' },
  export_excel: { label: 'Export to Excel', plans: ['PREMIUM_MONTHLY', 'PREMIUM_YEARLY', 'FAMILY_MONTHLY', 'FAMILY_YEARLY'], icon: 'table', description: 'Spreadsheet exports' },
  custom_categories: { label: 'Custom Categories', plans: ['PREMIUM_MONTHLY', 'PREMIUM_YEARLY', 'FAMILY_MONTHLY', 'FAMILY_YEARLY'], icon: 'appstore-o', description: 'Organize your way' },
  investment_tracker: { label: 'Investment Tracker', plans: ['PREMIUM_MONTHLY', 'PREMIUM_YEARLY', 'FAMILY_MONTHLY', 'FAMILY_YEARLY'], icon: 'linechart', description: 'Monitor your portfolio' },
  bill_prediction: { label: 'Bill Predictions', plans: ['PREMIUM_MONTHLY', 'PREMIUM_YEARLY', 'FAMILY_MONTHLY', 'FAMILY_YEARLY'], icon: 'bells', description: 'Never miss a payment' },
  emergency_fund: { label: 'Emergency Fund Tracker', plans: ['PREMIUM_MONTHLY', 'PREMIUM_YEARLY', 'FAMILY_MONTHLY', 'FAMILY_YEARLY'], icon: 'Safety', description: 'Build your safety net' },
  document_vault: { label: 'Document Vault', plans: ['PREMIUM_MONTHLY', 'PREMIUM_YEARLY', 'FAMILY_MONTHLY', 'FAMILY_YEARLY'], icon: 'folder1', description: 'Secure document storage' },
  priority_support: { label: 'Priority Support', plans: ['PREMIUM_MONTHLY', 'PREMIUM_YEARLY', 'FAMILY_MONTHLY', 'FAMILY_YEARLY'], icon: 'customerservice', description: 'Get help faster' },
  advanced_reports: { label: 'Advanced Reports', plans: ['PREMIUM_MONTHLY', 'PREMIUM_YEARLY', 'FAMILY_MONTHLY', 'FAMILY_YEARLY'], icon: 'linechart', description: 'Deep financial insights' },
  family_space: { label: 'Family Space', plans: ['FAMILY_MONTHLY', 'FAMILY_YEARLY'], icon: 'team', description: 'Collaborative finance' },
  family_dashboard: { label: 'Family Dashboard', plans: ['FAMILY_MONTHLY', 'FAMILY_YEARLY'], icon: 'team', description: 'Shared financial overview' },
  family_calendar: { label: 'Family Calendar', plans: ['FAMILY_MONTHLY', 'FAMILY_YEARLY'], icon: 'calendar', description: 'Shared family calendar' },
  family_ai_advisor: { label: 'Family AI Advisor', plans: ['FAMILY_MONTHLY', 'FAMILY_YEARLY'], icon: 'bulb1', description: 'AI-powered family insights' },
  family_goals: { label: 'Family Goals', plans: ['FAMILY_MONTHLY', 'FAMILY_YEARLY'], icon: 'flag', description: 'Shared financial goals' },
  family_wealth: { label: 'Family Wealth Dashboard', plans: ['FAMILY_MONTHLY', 'FAMILY_YEARLY'], icon: 'linechart', description: 'Combined wealth view' },
  shared_vault: { label: 'Shared Document Vault', plans: ['FAMILY_MONTHLY', 'FAMILY_YEARLY'], icon: 'folder1', description: 'Shared document storage' },
};

export const USAGE_LIMITS: Record<string, { free: number; premium: number | null }> = {
  family_hubs: { free: 3, premium: null },
  goals: { free: 3, premium: null },
  budgets: { free: 3, premium: null },
  transactions: { free: 100, premium: null },
  categories: { free: 10, premium: null },
  attachments: { free: 5, premium: null },
};

export function canAccess(featureKey: string, planCode: string): boolean {
  const feature = FEATURES[featureKey];
  if (!feature) return true;
  return feature.plans.includes(planCode);
}

export function getPlanFeatures(planCode: string): string[] {
  return Object.entries(FEATURES)
    .filter(([, feature]) => feature.plans.includes(planCode))
    .map(([key]) => key);
}

export function getUsageLimit(featureKey: string, planCode: string): number | null {
  const limits = USAGE_LIMITS[featureKey];
  if (!limits) return null;
  if (planCode === 'FREE') return limits.free;
  return limits.premium;
}

export function getPlanTier(planCode: string): 'free' | 'premium' | 'family' {
  if (planCode === 'FAMILY_MONTHLY' || planCode === 'FAMILY_YEARLY') return 'family';
  if (planCode === 'PREMIUM_MONTHLY' || planCode === 'PREMIUM_YEARLY') return 'premium';
  return 'free';
}

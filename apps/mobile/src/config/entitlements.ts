export type PlanTier = 'FREE' | 'PREMIUM' | 'FAMILY';

export interface Plan {
  name: string;
  code: string;
  monthlyPrice: number;
  yearlyPrice: number;
  tier: PlanTier;
  badge: string | null;
  tagline: string;
  savings: string | null;
}

export const PLANS: Record<string, Plan> = {
  FREE: { name: 'Free', code: 'FREE', monthlyPrice: 0, yearlyPrice: 0, tier: 'FREE', badge: null, tagline: 'Basic tracking for everyone', savings: null },
  PREMIUM_MONTHLY: { name: 'Premium', code: 'PREMIUM_MONTHLY', monthlyPrice: 99, yearlyPrice: 999, tier: 'PREMIUM', badge: 'POPULAR', tagline: 'Full financial superpowers', savings: null },
  PREMIUM_YEARLY: { name: 'Premium Yearly', code: 'PREMIUM_YEARLY', monthlyPrice: 99, yearlyPrice: 999, tier: 'PREMIUM', badge: 'BEST VALUE', tagline: 'Full financial superpowers', savings: 'Save 16%' },
  FAMILY_MONTHLY: { name: 'Family', code: 'FAMILY_MONTHLY', monthlyPrice: 199, yearlyPrice: 1999, tier: 'FAMILY', badge: 'RECOMMENDED', tagline: 'Up to 6 family members', savings: null },
  FAMILY_YEARLY: { name: 'Family Yearly', code: 'FAMILY_YEARLY', monthlyPrice: 199, yearlyPrice: 1999, tier: 'FAMILY', badge: 'BEST VALUE', tagline: 'Up to 6 family members', savings: 'Save 17%' },
};

export interface FeatureEntry {
  label: string;
  tier: PlanTier;
  icon: string;
  description: string;
}

export const FEATURES: Record<string, FeatureEntry> = {
  personal_dashboard: { label: 'Personal Dashboard', tier: 'FREE', icon: 'dashboard', description: 'Your financial overview' },
  manual_expense: { label: 'Manual Expense Tracking', tier: 'FREE', icon: 'edit', description: 'Track expenses manually' },
  manual_income: { label: 'Manual Income Tracking', tier: 'FREE', icon: 'arrowup', description: 'Track income manually' },
  basic_categories: { label: 'Basic Categories', tier: 'FREE', icon: 'appstore-o', description: 'Predefined categories' },
  basic_reports: { label: 'Basic Reports', tier: 'FREE', icon: 'linechart', description: 'Simple spending reports' },
  basic_goals: { label: 'Basic Goals (Max 3)', tier: 'FREE', icon: 'flag', description: 'Set up to 3 goals' },
  basic_budget: { label: 'Basic Budget (Max 3)', tier: 'FREE', icon: 'piechart', description: 'Create up to 3 budgets' },
  basic_ai_insights: { label: 'Basic AI Insights', tier: 'FREE', icon: 'bulb1', description: 'AI-powered suggestions' },
  upi_settlements: { label: 'UPI Settlements', tier: 'FREE', icon: 'wallet', description: 'Settle up with UPI' },
  couple_invite: { label: 'Couple Invite', tier: 'FREE', icon: 'team', description: 'Invite your partner' },
  couple_dashboard: { label: 'Couple Dashboard', tier: 'FREE', icon: 'team', description: 'Shared couple finances' },
  unlimited_transactions: { label: 'Unlimited Transactions', tier: 'PREMIUM', icon: 'swap', description: 'No transaction limits' },
  unlimited_goals: { label: 'Unlimited Goals', tier: 'PREMIUM', icon: 'flag', description: 'Set unlimited goals' },
  unlimited_budgets: { label: 'Unlimited Budgets', tier: 'PREMIUM', icon: 'piechart', description: 'Create unlimited budgets' },
  unlimited_history: { label: 'Unlimited History', tier: 'PREMIUM', icon: 'calendar', description: 'Full transaction history' },
  advanced_reports: { label: 'Advanced Reports', tier: 'PREMIUM', icon: 'linechart', description: 'Deep financial insights' },
  export_pdf: { label: 'PDF Export', tier: 'PREMIUM', icon: 'download', description: 'Export reports as PDF' },
  export_excel: { label: 'Excel Export', tier: 'PREMIUM', icon: 'table', description: 'Export reports as Excel' },
  net_worth: { label: 'Net Worth Tracking', tier: 'PREMIUM', icon: 'Trophy', description: 'Real-time wealth overview' },
  health_score: { label: 'Financial Health Score', tier: 'PREMIUM', icon: 'heart', description: 'AI-powered financial health' },
  advanced_ai_insights: { label: 'Advanced AI Insights', tier: 'PREMIUM', icon: 'bulb1', description: 'Smart financial suggestions' },
  ai_coach: { label: 'AI Financial Coach', tier: 'PREMIUM', icon: 'message1', description: 'Personal finance assistant' },
  custom_categories: { label: 'Custom Categories', tier: 'PREMIUM', icon: 'appstore-o', description: 'Organize your way' },
  investment_tracker: { label: 'Investment Tracker', tier: 'PREMIUM', icon: 'linechart', description: 'Monitor your portfolio' },
  bill_prediction: { label: 'Bill Predictions', tier: 'PREMIUM', icon: 'bells', description: 'Never miss a payment' },
  emergency_fund_tracker: { label: 'Emergency Fund Tracker', tier: 'PREMIUM', icon: 'Safety', description: 'Build your safety net' },
  document_vault: { label: 'Document Vault', tier: 'PREMIUM', icon: 'folder1', description: 'Secure document storage' },
  priority_support: { label: 'Priority Support', tier: 'PREMIUM', icon: 'customerservice', description: 'Get help faster' },
  family_dashboard: { label: 'Family Dashboard', tier: 'FAMILY', icon: 'team', description: 'Shared financial overview' },
  family_space: { label: 'Family Space', tier: 'FAMILY', icon: 'team', description: 'Collaborative finance' },
  family_goals: { label: 'Family Goals', tier: 'FAMILY', icon: 'flag', description: 'Shared financial goals' },
  family_wealth: { label: 'Family Wealth Dashboard', tier: 'FAMILY', icon: 'linechart', description: 'Combined wealth view' },
  family_contributions: { label: 'Family Contributions', tier: 'FAMILY', icon: 'arrowup', description: 'Track family contributions' },
  family_calendar: { label: 'Family Calendar', tier: 'FAMILY', icon: 'calendar', description: 'Shared family calendar' },
  family_bills: { label: 'Family Bills', tier: 'FAMILY', icon: 'bells', description: 'Shared bill tracking' },
  family_investments: { label: 'Family Investments', tier: 'FAMILY', icon: 'linechart', description: 'Family investment tracking' },
  family_ai_advisor: { label: 'Family AI Advisor', tier: 'FAMILY', icon: 'bulb1', description: 'AI-powered family insights' },
  family_reports: { label: 'Family Reports', tier: 'FAMILY', icon: 'linechart', description: 'Family financial reports' },
  family_health_score: { label: 'Family Health Score', tier: 'FAMILY', icon: 'heart', description: 'Family financial health' },
  shared_vault: { label: 'Shared Document Vault', tier: 'FAMILY', icon: 'folder1', description: 'Shared document storage' },
  shared_documents: { label: 'Shared Documents', tier: 'FAMILY', icon: 'folder1', description: 'Share documents with family' },
  shared_ai: { label: 'Shared AI Insights', tier: 'FAMILY', icon: 'bulb1', description: 'AI for the whole family' },
  up_to_6_members: { label: 'Up to 6 Members', tier: 'FAMILY', icon: 'team', description: 'Add up to 6 family members' },
};

export interface UsageLimitEntry {
  freeLimit: number | null;
  premiumLimit: number | null;
  familyLimit: number | null;
  period: 'monthly' | 'all_time' | 'rolling_days';
}

export const USAGE_LIMITS: Record<string, UsageLimitEntry> = {
  goals: { freeLimit: 3, premiumLimit: null, familyLimit: null, period: 'all_time' },
  budgets: { freeLimit: 3, premiumLimit: null, familyLimit: null, period: 'all_time' },
  transactions: { freeLimit: 100, premiumLimit: null, familyLimit: null, period: 'monthly' },
  history_days: { freeLimit: 90, premiumLimit: null, familyLimit: null, period: 'rolling_days' },
  couple_spaces: { freeLimit: 1, premiumLimit: 1, familyLimit: 1, period: 'all_time' },
  family_members: { freeLimit: 0, premiumLimit: 0, familyLimit: 6, period: 'all_time' },
  documents: { freeLimit: 0, premiumLimit: null, familyLimit: null, period: 'all_time' },
  exports: { freeLimit: 0, premiumLimit: null, familyLimit: null, period: 'monthly' },
  investments: { freeLimit: 0, premiumLimit: null, familyLimit: null, period: 'all_time' },
  categories: { freeLimit: 10, premiumLimit: null, familyLimit: null, period: 'all_time' },
};

const TIER_ORDER: Record<PlanTier, number> = { FREE: 0, PREMIUM: 1, FAMILY: 2 };

export function canAccess(featureKey: string, planCode: string): boolean {
  const feature = FEATURES[featureKey];
  if (!feature) return true;
  const tier = getPlanTier(planCode);
  return TIER_ORDER[tier] >= TIER_ORDER[feature.tier];
}

export function getPlanTier(planCode: string): PlanTier {
  if (planCode === 'FAMILY_MONTHLY' || planCode === 'FAMILY_YEARLY') return 'FAMILY';
  if (planCode === 'PREMIUM' || planCode === 'PREMIUM_MONTHLY' || planCode === 'PREMIUM_YEARLY') return 'PREMIUM';
  return 'FREE';
}

export function getPlanFeatures(planCode: string): string[] {
  const tier = getPlanTier(planCode);
  return Object.entries(FEATURES)
    .filter(([, feature]) => TIER_ORDER[feature.tier] <= TIER_ORDER[tier])
    .map(([key]) => key);
}

export function getUsageLimit(featureKey: string, planCode: string): number | null {
  const limits = USAGE_LIMITS[featureKey];
  if (!limits) return null;
  const tier = getPlanTier(planCode);
  if (tier === 'FAMILY') return limits.familyLimit;
  if (tier === 'PREMIUM') return limits.premiumLimit;
  return limits.freeLimit;
}

export function getUpgradePlan(currentPlanCode: string, featureKey: string): PlanTier | null {
  const feature = FEATURES[featureKey];
  if (!feature) return null;
  const currentTier = getPlanTier(currentPlanCode);
  if (TIER_ORDER[currentTier] >= TIER_ORDER[feature.tier]) return null;
  return feature.tier;
}

export function getFeatureTier(featureKey: string): PlanTier | null {
  return FEATURES[featureKey]?.tier ?? null;
}

export const TIER_COLORS: Record<PlanTier, string> = {
  FREE: '#6B7280',
  PREMIUM: '#FFD700',
  FAMILY: '#C084FC',
};

import { Injectable } from '@nestjs/common';

export type PlanTier = 'FREE' | 'PREMIUM' | 'FAMILY';

export interface EntitlementResult {
  allowed: boolean;
  reason: 'UPGRADE_REQUIRED' | 'LIMIT_REACHED' | null;
  upgradePlan: PlanTier | null;
}

export interface FeatureDef {
  tier: PlanTier;
  description: string;
}

@Injectable()
export class EntitlementEngine {
  private readonly FEATURES: Record<string, FeatureDef> = {
    personal_dashboard: { tier: 'FREE', description: 'Personal Dashboard' },
    manual_expense: { tier: 'FREE', description: 'Manual Expense Tracking' },
    manual_income: { tier: 'FREE', description: 'Manual Income Tracking' },
    basic_categories: { tier: 'FREE', description: 'Basic Categories' },
    basic_reports: { tier: 'FREE', description: 'Basic Reports' },
    basic_goals: { tier: 'FREE', description: 'Basic Goals' },
    basic_budget: { tier: 'FREE', description: 'Basic Budget' },
    basic_ai_insights: { tier: 'FREE', description: 'Basic AI Insights' },
    upi_settlements: { tier: 'FREE', description: 'UPI Settlements' },
    couple_invite: { tier: 'FREE', description: 'Couple Invitation' },
    couple_dashboard: { tier: 'FREE', description: 'Couple Dashboard' },

    unlimited_transactions: { tier: 'PREMIUM', description: 'Unlimited Transactions' },
    unlimited_goals: { tier: 'PREMIUM', description: 'Unlimited Goals' },
    unlimited_budgets: { tier: 'PREMIUM', description: 'Unlimited Budgets' },
    unlimited_history: { tier: 'PREMIUM', description: 'Unlimited History' },
    advanced_reports: { tier: 'PREMIUM', description: 'Advanced Reports' },
    export_pdf: { tier: 'PREMIUM', description: 'PDF Export' },
    export_excel: { tier: 'PREMIUM', description: 'Excel Export' },
    net_worth: { tier: 'PREMIUM', description: 'Net Worth' },
    health_score: { tier: 'PREMIUM', description: 'Financial Health Score' },
    advanced_ai_insights: { tier: 'PREMIUM', description: 'Advanced AI Insights' },
    ai_coach: { tier: 'PREMIUM', description: 'AI Coach' },
    custom_categories: { tier: 'PREMIUM', description: 'Custom Categories' },
    investment_tracker: { tier: 'PREMIUM', description: 'Investment Tracker' },
    bill_prediction: { tier: 'PREMIUM', description: 'Bill Prediction' },
    emergency_fund_tracker: { tier: 'PREMIUM', description: 'Emergency Fund Tracker' },
    document_vault: { tier: 'PREMIUM', description: 'Document Vault' },
    priority_support: { tier: 'PREMIUM', description: 'Priority Support' },

    family_dashboard: { tier: 'FAMILY', description: 'Family Dashboard' },
    family_space: { tier: 'FAMILY', description: 'Family Space' },
    family_goals: { tier: 'FAMILY', description: 'Family Goals' },
    family_wealth: { tier: 'FAMILY', description: 'Family Wealth' },
    family_contributions: { tier: 'FAMILY', description: 'Family Contributions' },
    family_calendar: { tier: 'FAMILY', description: 'Family Calendar' },
    family_bills: { tier: 'FAMILY', description: 'Family Bills' },
    family_investments: { tier: 'FAMILY', description: 'Family Investments' },
    family_ai_advisor: { tier: 'FAMILY', description: 'Family AI Advisor' },
    family_reports: { tier: 'FAMILY', description: 'Family Reports' },
    family_health_score: { tier: 'FAMILY', description: 'Family Health Score' },
    shared_vault: { tier: 'FAMILY', description: 'Shared Vault' },
    shared_documents: { tier: 'FAMILY', description: 'Shared Documents' },
    shared_ai: { tier: 'FAMILY', description: 'Shared AI' },
    up_to_6_members: { tier: 'FAMILY', description: 'Up To 6 Members' },
  };

  private readonly HIERARCHY: Record<PlanTier, number> = {
    FREE: 0,
    PREMIUM: 1,
    FAMILY: 2,
  };

  private getEffectiveTier(planCode: string): PlanTier {
    if (planCode === 'FAMILY_MONTHLY' || planCode === 'FAMILY_YEARLY') return 'FAMILY';
    if (planCode === 'PREMIUM' || planCode === 'PREMIUM_MONTHLY' || planCode === 'PREMIUM_YEARLY') return 'PREMIUM';
    return 'FREE';
  }

  private getPlanCode(planCode: string): string {
    return planCode;
  }

  check(featureKey: string, planCode: string = 'FREE'): EntitlementResult {
    const feature = this.FEATURES[featureKey];
    if (!feature) {
      return { allowed: true, reason: null, upgradePlan: null };
    }

    const tier = this.getEffectiveTier(planCode);
    const requiredTier = feature.tier;
    const tierValue = this.HIERARCHY[tier];
    const requiredValue = this.HIERARCHY[requiredTier];

    if (tierValue >= requiredValue) {
      return { allowed: true, reason: null, upgradePlan: null };
    }

    if (requiredTier === 'FAMILY') {
      return { allowed: false, reason: 'UPGRADE_REQUIRED', upgradePlan: 'FAMILY' };
    }
    return { allowed: false, reason: 'UPGRADE_REQUIRED', upgradePlan: 'PREMIUM' };
  }

  canCreateGoal(planCode: string = 'FREE'): EntitlementResult {
    return this.check('basic_goals', planCode);
  }

  canCreateBudget(planCode: string = 'FREE'): EntitlementResult {
    return this.check('basic_budget', planCode);
  }

  canCreateFamily(planCode: string = 'FREE'): EntitlementResult {
    return this.check('family_space', planCode);
  }

  canUseNetWorth(planCode: string = 'FREE'): EntitlementResult {
    return this.check('net_worth', planCode);
  }

  canUseAI(planCode: string = 'FREE'): EntitlementResult {
    return this.check('advanced_ai_insights', planCode);
  }

  canUseExports(planCode: string = 'FREE'): EntitlementResult {
    return this.check('export_pdf', planCode);
  }

  canUseFamilyDashboard(planCode: string = 'FREE'): EntitlementResult {
    return this.check('family_dashboard', planCode);
  }

  canUseInvestmentTracker(planCode: string = 'FREE'): EntitlementResult {
    return this.check('investment_tracker', planCode);
  }

  canUseDocumentVault(planCode: string = 'FREE'): EntitlementResult {
    return this.check('document_vault', planCode);
  }

  canUseHealthScore(planCode: string = 'FREE'): EntitlementResult {
    return this.check('health_score', planCode);
  }

  canUseAdvancedReports(planCode: string = 'FREE'): EntitlementResult {
    return this.check('advanced_reports', planCode);
  }

  canUseCustomCategories(planCode: string = 'FREE'): EntitlementResult {
    return this.check('custom_categories', planCode);
  }

  canUseAICoach(planCode: string = 'FREE'): EntitlementResult {
    return this.check('ai_coach', planCode);
  }

  canUseBillPrediction(planCode: string = 'FREE'): EntitlementResult {
    return this.check('bill_prediction', planCode);
  }

  canUseEmergencyFund(planCode: string = 'FREE'): EntitlementResult {
    return this.check('emergency_fund_tracker', planCode);
  }

  canUsePrioritySupport(planCode: string = 'FREE'): EntitlementResult {
    return this.check('priority_support', planCode);
  }

  canUseFamilyCalendar(planCode: string = 'FREE'): EntitlementResult {
    return this.check('family_calendar', planCode);
  }

  canUseFamilyAI(planCode: string = 'FREE'): EntitlementResult {
    return this.check('family_ai_advisor', planCode);
  }

  getGrantedFeatures(planCode: string): string[] {
    const tier = this.getEffectiveTier(planCode);
    const tierValue = this.HIERARCHY[tier];
    return Object.entries(this.FEATURES)
      .filter(([_, def]) => this.HIERARCHY[def.tier] <= tierValue)
      .map(([key]) => key);
  }

  getFeatureTier(featureKey: string): PlanTier | null {
    return this.FEATURES[featureKey]?.tier ?? null;
  }

  getFeatureRegistry(): Record<string, FeatureDef> {
    return { ...this.FEATURES };
  }

  getFeatureComparison(): Record<string, { free: boolean; premium: boolean; family: boolean }> {
    const result: Record<string, { free: boolean; premium: boolean; family: boolean }> = {};
    for (const [key, def] of Object.entries(this.FEATURES)) {
      result[key] = {
        free: def.tier === 'FREE',
        premium: def.tier === 'PREMIUM' || def.tier === 'FAMILY',
        family: def.tier === 'FAMILY',
      };
    }
    return result;
  }
}

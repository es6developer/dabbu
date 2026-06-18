import { Injectable } from '@nestjs/common';

export interface EntitlementResult {
  allowed: boolean;
  reason: string | null;
  upgradePlan: string | null;
}

export interface FeatureDef {
  plans: string[];
  description: string;
  icon?: string;
  familyOnly?: boolean;
}

export type PlanTier = 'FREE' | 'PREMIUM' | 'FAMILY';

@Injectable()
export class EntitlementEngine {
  private readonly FEATURES: Record<string, FeatureDef> = {
    personal_dashboard: {
      plans: ['FREE', 'PREMIUM_MONTHLY', 'PREMIUM_YEARLY', 'FAMILY_MONTHLY', 'FAMILY_YEARLY'],
      description: 'Personal Dashboard',
    },
    manual_expense: {
      plans: ['FREE', 'PREMIUM_MONTHLY', 'PREMIUM_YEARLY', 'FAMILY_MONTHLY', 'FAMILY_YEARLY'],
      description: 'Manual Expense Tracking',
    },
    manual_income: {
      plans: ['FREE', 'PREMIUM_MONTHLY', 'PREMIUM_YEARLY', 'FAMILY_MONTHLY', 'FAMILY_YEARLY'],
      description: 'Manual Income Tracking',
    },
    basic_categories: {
      plans: ['FREE', 'PREMIUM_MONTHLY', 'PREMIUM_YEARLY', 'FAMILY_MONTHLY', 'FAMILY_YEARLY'],
      description: 'Basic Categories',
    },
    basic_reports: {
      plans: ['FREE', 'PREMIUM_MONTHLY', 'PREMIUM_YEARLY', 'FAMILY_MONTHLY', 'FAMILY_YEARLY'],
      description: 'Basic Reports',
    },
    basic_goals: {
      plans: ['FREE', 'PREMIUM_MONTHLY', 'PREMIUM_YEARLY', 'FAMILY_MONTHLY', 'FAMILY_YEARLY'],
      description: 'Basic Goals',
    },
    basic_budget: {
      plans: ['FREE', 'PREMIUM_MONTHLY', 'PREMIUM_YEARLY', 'FAMILY_MONTHLY', 'FAMILY_YEARLY'],
      description: 'Basic Budget',
    },
    basic_ai: {
      plans: ['FREE', 'PREMIUM_MONTHLY', 'PREMIUM_YEARLY', 'FAMILY_MONTHLY', 'FAMILY_YEARLY'],
      description: 'Basic AI Insights',
    },
    upi_settlements: {
      plans: ['FREE', 'PREMIUM_MONTHLY', 'PREMIUM_YEARLY', 'FAMILY_MONTHLY', 'FAMILY_YEARLY'],
      description: 'UPI Settlements',
    },
    couple_invite: {
      plans: ['FREE', 'PREMIUM_MONTHLY', 'PREMIUM_YEARLY', 'FAMILY_MONTHLY', 'FAMILY_YEARLY'],
      description: 'Couple Invitation',
    },
    couple_dashboard: {
      plans: ['FREE', 'PREMIUM_MONTHLY', 'PREMIUM_YEARLY', 'FAMILY_MONTHLY', 'FAMILY_YEARLY'],
      description: 'Couple Dashboard',
    },

    net_worth: {
      plans: ['PREMIUM_MONTHLY', 'PREMIUM_YEARLY', 'FAMILY_MONTHLY', 'FAMILY_YEARLY'],
      description: 'Net Worth Tracking',
      icon: 'Trophy',
    },
    health_score: {
      plans: ['PREMIUM_MONTHLY', 'PREMIUM_YEARLY', 'FAMILY_MONTHLY', 'FAMILY_YEARLY'],
      description: 'Financial Health Score',
      icon: 'heart',
    },
    ai_coach: {
      plans: ['PREMIUM_MONTHLY', 'PREMIUM_YEARLY', 'FAMILY_MONTHLY', 'FAMILY_YEARLY'],
      description: 'AI Financial Coach',
      icon: 'bulb1',
    },
    advanced_ai: {
      plans: ['PREMIUM_MONTHLY', 'PREMIUM_YEARLY', 'FAMILY_MONTHLY', 'FAMILY_YEARLY'],
      description: 'Advanced AI Insights',
      icon: 'linechart',
    },
    advanced_reports: {
      plans: ['PREMIUM_MONTHLY', 'PREMIUM_YEARLY', 'FAMILY_MONTHLY', 'FAMILY_YEARLY'],
      description: 'Advanced Reports',
      icon: 'linechart',
    },
    export_pdf: {
      plans: ['PREMIUM_MONTHLY', 'PREMIUM_YEARLY', 'FAMILY_MONTHLY', 'FAMILY_YEARLY'],
      description: 'Export Reports as PDF',
      icon: 'download',
    },
    export_excel: {
      plans: ['PREMIUM_MONTHLY', 'PREMIUM_YEARLY', 'FAMILY_MONTHLY', 'FAMILY_YEARLY'],
      description: 'Export Reports as Excel',
      icon: 'table',
    },
    custom_categories: {
      plans: ['PREMIUM_MONTHLY', 'PREMIUM_YEARLY', 'FAMILY_MONTHLY', 'FAMILY_YEARLY'],
      description: 'Custom Categories',
      icon: 'appstore-o',
    },
    investment_tracker: {
      plans: ['PREMIUM_MONTHLY', 'PREMIUM_YEARLY', 'FAMILY_MONTHLY', 'FAMILY_YEARLY'],
      description: 'Investment Tracker',
      icon: 'linechart',
    },
    bill_prediction: {
      plans: ['PREMIUM_MONTHLY', 'PREMIUM_YEARLY', 'FAMILY_MONTHLY', 'FAMILY_YEARLY'],
      description: 'Bill Prediction',
      icon: 'bells',
    },
    emergency_fund: {
      plans: ['PREMIUM_MONTHLY', 'PREMIUM_YEARLY', 'FAMILY_MONTHLY', 'FAMILY_YEARLY'],
      description: 'Emergency Fund Tracker',
      icon: 'Safety',
    },
    document_vault: {
      plans: ['PREMIUM_MONTHLY', 'PREMIUM_YEARLY', 'FAMILY_MONTHLY', 'FAMILY_YEARLY'],
      description: 'Document Vault',
      icon: 'folder1',
    },
    priority_support: {
      plans: ['PREMIUM_MONTHLY', 'PREMIUM_YEARLY', 'FAMILY_MONTHLY', 'FAMILY_YEARLY'],
      description: 'Priority Support',
      icon: 'customerservice',
    },

    family_space: {
      plans: ['FAMILY_MONTHLY', 'FAMILY_YEARLY'],
      description: 'Family Space',
      icon: 'team',
      familyOnly: true,
    },
    family_dashboard: {
      plans: ['FAMILY_MONTHLY', 'FAMILY_YEARLY'],
      description: 'Family Dashboard',
      icon: 'team',
      familyOnly: true,
    },
    family_goals: {
      plans: ['FAMILY_MONTHLY', 'FAMILY_YEARLY'],
      description: 'Family Goals',
      icon: 'flag',
      familyOnly: true,
    },
    family_wealth: {
      plans: ['FAMILY_MONTHLY', 'FAMILY_YEARLY'],
      description: 'Family Wealth Dashboard',
      icon: 'linechart',
      familyOnly: true,
    },
    family_contributions: {
      plans: ['FAMILY_MONTHLY', 'FAMILY_YEARLY'],
      description: 'Family Contributions',
      icon: 'arrowup',
      familyOnly: true,
    },
    family_calendar: {
      plans: ['FAMILY_MONTHLY', 'FAMILY_YEARLY'],
      description: 'Family Calendar',
      icon: 'calendar',
      familyOnly: true,
    },
    family_bills: {
      plans: ['FAMILY_MONTHLY', 'FAMILY_YEARLY'],
      description: 'Family Bills',
      icon: 'bells',
      familyOnly: true,
    },
    family_investments: {
      plans: ['FAMILY_MONTHLY', 'FAMILY_YEARLY'],
      description: 'Family Investments',
      icon: 'linechart',
      familyOnly: true,
    },
    family_ai_advisor: {
      plans: ['FAMILY_MONTHLY', 'FAMILY_YEARLY'],
      description: 'Family AI Advisor',
      icon: 'bulb1',
      familyOnly: true,
    },
    family_reports: {
      plans: ['FAMILY_MONTHLY', 'FAMILY_YEARLY'],
      description: 'Family Reports',
      icon: 'linechart',
      familyOnly: true,
    },
    family_health_score: {
      plans: ['FAMILY_MONTHLY', 'FAMILY_YEARLY'],
      description: 'Family Health Score',
      icon: 'heart',
      familyOnly: true,
    },
    shared_vault: {
      plans: ['FAMILY_MONTHLY', 'FAMILY_YEARLY'],
      description: 'Shared Document Vault',
      icon: 'folder1',
      familyOnly: true,
    },
    shared_documents: {
      plans: ['FAMILY_MONTHLY', 'FAMILY_YEARLY'],
      description: 'Shared Documents',
      icon: 'folder1',
      familyOnly: true,
    },
    shared_ai: {
      plans: ['FAMILY_MONTHLY', 'FAMILY_YEARLY'],
      description: 'Shared AI',
      icon: 'bulb1',
      familyOnly: true,
    },
  };

  private getPlanTier(planCode: string): PlanTier {
    if (planCode === 'FAMILY_MONTHLY' || planCode === 'FAMILY_YEARLY') {
      return 'FAMILY';
    }
    if (planCode === 'PREMIUM' || planCode === 'PREMIUM_MONTHLY' || planCode === 'PREMIUM_YEARLY') {
      return 'PREMIUM';
    }
    return 'FREE';
  }

  canAccess(planCode: string, featureKey: string): EntitlementResult {
    return this.check(featureKey, planCode);
  }

  check(featureKey: string, planCode: string = 'FREE'): EntitlementResult {
    const feature = this.FEATURES[featureKey];
    if (!feature) {
      return { allowed: true, reason: null, upgradePlan: null };
    }
    const allowed = feature.plans.some(
      (p) =>
        p === planCode || planCode.startsWith(p.replace('_MONTHLY', '').replace('_YEARLY', '')),
    );
    if (allowed) {
      return { allowed: true, reason: null, upgradePlan: null };
    }
    if (feature.familyOnly) {
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
    return this.check('advanced_ai', planCode);
  }

  canUseExports(planCode: string = 'FREE'): EntitlementResult {
    const pdf = this.check('export_pdf', planCode);
    if (!pdf.allowed) {
      return pdf;
    }
    return { allowed: true, reason: null, upgradePlan: null };
  }

  canUseFamilyDashboard(planCode: string = 'FREE'): EntitlementResult {
    return this.check('family_dashboard', planCode);
  }

  canUseFamilyCalendar(planCode: string = 'FREE'): EntitlementResult {
    return this.check('family_calendar', planCode);
  }

  canUseFamilyAI(planCode: string = 'FREE'): EntitlementResult {
    return this.check('family_ai_advisor', planCode);
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
    return this.check('emergency_fund', planCode);
  }

  canUsePrioritySupport(planCode: string = 'FREE'): EntitlementResult {
    return this.check('priority_support', planCode);
  }

  getGrantedFeatures(planCode: string): string[] {
    return Object.entries(this.FEATURES)
      .filter(([_, def]) =>
        def.plans.some(
          (p) =>
            p === planCode || planCode.startsWith(p.replace('_MONTHLY', '').replace('_YEARLY', '')),
        ),
      )
      .map(([key]) => key);
  }

  getFeatureRegistry(): Record<string, FeatureDef> {
    return { ...this.FEATURES };
  }

  getFeatureComparison(): Record<string, { free: boolean; premium: boolean; family: boolean }> {
    const result: Record<string, { free: boolean; premium: boolean; family: boolean }> = {};
    for (const [key, def] of Object.entries(this.FEATURES)) {
      result[key] = {
        free: def.plans.includes('FREE'),
        premium: def.plans.some((p) => p === 'PREMIUM_MONTHLY' || p === 'PREMIUM_YEARLY'),
        family: def.plans.some((p) => p === 'FAMILY_MONTHLY' || p === 'FAMILY_YEARLY'),
      };
    }
    return result;
  }
}

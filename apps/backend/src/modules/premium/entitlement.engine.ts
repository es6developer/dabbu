import { Injectable } from '@nestjs/common';

export interface FeatureDef {
  plans: string[];
  limit: number | false;
  description?: string;
}

@Injectable()
export class EntitlementEngine {
  private readonly FEATURES: Record<string, FeatureDef> = {
    unlimited_family_hubs: {
      plans: [
        'PREMIUM',
        'PREMIUM_MONTHLY',
        'PREMIUM_YEARLY',
        'PREMIUM_FAMILY',
        'FAMILY_MONTHLY',
        'FAMILY_YEARLY',
      ],
      limit: false,
      description: 'Unlimited family hubs',
    },
    unlimited_goals: {
      plans: [
        'PREMIUM',
        'PREMIUM_MONTHLY',
        'PREMIUM_YEARLY',
        'PREMIUM_FAMILY',
        'FAMILY_MONTHLY',
        'FAMILY_YEARLY',
      ],
      limit: false,
      description: 'Unlimited financial goals',
    },
    unlimited_budgets: {
      plans: [
        'PREMIUM',
        'PREMIUM_MONTHLY',
        'PREMIUM_YEARLY',
        'PREMIUM_FAMILY',
        'FAMILY_MONTHLY',
        'FAMILY_YEARLY',
      ],
      limit: false,
      description: 'Unlimited budgets',
    },
    full_reports: {
      plans: [
        'PREMIUM',
        'PREMIUM_MONTHLY',
        'PREMIUM_YEARLY',
        'PREMIUM_FAMILY',
        'FAMILY_MONTHLY',
        'FAMILY_YEARLY',
      ],
      limit: false,
      description: 'Full financial reports',
    },
    ai_insights: {
      plans: [
        'PREMIUM',
        'PREMIUM_MONTHLY',
        'PREMIUM_YEARLY',
        'PREMIUM_FAMILY',
        'FAMILY_MONTHLY',
        'FAMILY_YEARLY',
      ],
      limit: false,
      description: 'AI-powered insights',
    },
    ai_coach: {
      plans: [
        'PREMIUM',
        'PREMIUM_MONTHLY',
        'PREMIUM_YEARLY',
        'PREMIUM_FAMILY',
        'FAMILY_MONTHLY',
        'FAMILY_YEARLY',
      ],
      limit: false,
      description: 'AI financial coach',
    },
    export_pdf: {
      plans: [
        'PREMIUM',
        'PREMIUM_MONTHLY',
        'PREMIUM_YEARLY',
        'PREMIUM_FAMILY',
        'FAMILY_MONTHLY',
        'FAMILY_YEARLY',
      ],
      limit: false,
      description: 'Export reports as PDF',
    },
    export_excel: {
      plans: [
        'PREMIUM',
        'PREMIUM_MONTHLY',
        'PREMIUM_YEARLY',
        'PREMIUM_FAMILY',
        'FAMILY_MONTHLY',
        'FAMILY_YEARLY',
      ],
      limit: false,
      description: 'Export reports as Excel',
    },
    net_worth: {
      plans: [
        'PREMIUM',
        'PREMIUM_MONTHLY',
        'PREMIUM_YEARLY',
        'PREMIUM_FAMILY',
        'FAMILY_MONTHLY',
        'FAMILY_YEARLY',
      ],
      limit: false,
      description: 'Net worth tracking',
    },
    health_score: {
      plans: [
        'PREMIUM',
        'PREMIUM_MONTHLY',
        'PREMIUM_YEARLY',
        'PREMIUM_FAMILY',
        'FAMILY_MONTHLY',
        'FAMILY_YEARLY',
      ],
      limit: false,
      description: 'Financial health score',
    },
    family_analytics: {
      plans: [
        'PREMIUM',
        'PREMIUM_MONTHLY',
        'PREMIUM_YEARLY',
        'PREMIUM_FAMILY',
        'FAMILY_MONTHLY',
        'FAMILY_YEARLY',
      ],
      limit: false,
      description: 'Family analytics',
    },
    priority_support: {
      plans: [
        'PREMIUM',
        'PREMIUM_MONTHLY',
        'PREMIUM_YEARLY',
        'PREMIUM_FAMILY',
        'FAMILY_MONTHLY',
        'FAMILY_YEARLY',
      ],
      limit: false,
      description: 'Priority customer support',
    },
    couple_premium: {
      plans: ['PREMIUM_FAMILY', 'FAMILY_MONTHLY', 'FAMILY_YEARLY'],
      limit: false,
      description: 'Couple premium features',
    },
    family_premium: {
      plans: ['PREMIUM_FAMILY', 'FAMILY_MONTHLY', 'FAMILY_YEARLY'],
      limit: false,
      description: 'Family premium features',
    },
    shared_ai_insights: {
      plans: ['PREMIUM_FAMILY', 'FAMILY_MONTHLY', 'FAMILY_YEARLY'],
      limit: false,
      description: 'Shared AI insights for family',
    },
    shared_goals: {
      plans: ['PREMIUM_FAMILY', 'FAMILY_MONTHLY', 'FAMILY_YEARLY'],
      limit: false,
      description: 'Shared family goals',
    },
    shared_wealth_dashboard: {
      plans: ['PREMIUM_FAMILY', 'FAMILY_MONTHLY', 'FAMILY_YEARLY'],
      limit: false,
      description: 'Shared wealth dashboard',
    },
    shared_reports: {
      plans: ['PREMIUM_FAMILY', 'FAMILY_MONTHLY', 'FAMILY_YEARLY'],
      limit: false,
      description: 'Shared financial reports',
    },
    advanced_family_analytics: {
      plans: ['PREMIUM_FAMILY', 'FAMILY_MONTHLY', 'FAMILY_YEARLY'],
      limit: false,
      description: 'Advanced family analytics',
    },
  };

  canAccess(userPlan: string, featureKey: string): boolean {
    const feature = this.FEATURES[featureKey];
    if (!feature) {
      return false;
    }
    return feature.plans.some(
      (p) =>
        p === userPlan || userPlan.startsWith(p.replace('_MONTHLY', '').replace('_YEARLY', '')),
    );
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
}

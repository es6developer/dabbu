interface DashboardUserContext {
  userId: string;
  hasUpcomingBills: boolean;
  hasBudgetOverspend: boolean;
  hasSavingsOpportunities: boolean;
  hasGoalMilestone: boolean;
  hasAnomalies: boolean;
  hasFamilyData: boolean;
  hasCoupleData: boolean;
  hasSettlements: boolean;
  financialDna?: { spendingPersonality: string };
  healthScore?: number;
  dailyLoginCount: number;
}

interface DashboardCard {
  widgetType: string;
  title: string;
  description: string;
  priority: number;
  widgetSize: 'small' | 'medium' | 'large';
  icon?: string;
  actionLabel?: string;
  actionRoute?: string;
  metadata?: Record<string, unknown>;
}

interface DashboardLayoutOutput {
  userId: string;
  date: string;
  cards: DashboardCard[];
  layout: { columns: number; rows: number };
  generatedAt: string;
}

type WidgetConfig = {
  type: string;
  condition: (context: DashboardUserContext) => boolean;
  title: string;
  description: string;
  priority: number;
  size: 'small' | 'medium' | 'large';
  icon: string;
  actionLabel?: string;
  actionRoute?: string;
};

const WIDGETS: WidgetConfig[] = [
  {
    type: 'overspend_warning',
    condition: ctx => ctx.hasBudgetOverspend,
    title: 'Budget Overspend Alert',
    description: 'You\'ve exceeded a budget category. Review and adjust your spending.',
    priority: 100,
    size: 'large',
    icon: 'alert-triangle',
    actionLabel: 'View Budgets',
    actionRoute: '/budgets',
  },
  {
    type: 'anomaly_alert',
    condition: ctx => ctx.hasAnomalies,
    title: 'Unusual Activity Detected',
    description: 'We found some unusual transactions that need your attention.',
    priority: 90,
    size: 'large',
    icon: 'activity',
    actionLabel: 'Review',
    actionRoute: '/anomalies',
  },
  {
    type: 'goal_milestone',
    condition: ctx => ctx.hasGoalMilestone,
    title: 'Goal Milestone',
    description: 'You\'ve reached a milestone on one of your goals!',
    priority: 80,
    size: 'medium',
    icon: 'award',
    actionLabel: 'View Goals',
    actionRoute: '/goals',
  },
  {
    type: 'savings_opportunity',
    condition: ctx => ctx.hasSavingsOpportunities,
    title: 'Savings Opportunity',
    description: 'We found ways you could save money this month.',
    priority: 70,
    size: 'medium',
    icon: 'piggy-bank',
    actionLabel: 'See Opportunities',
    actionRoute: '/savings',
  },
  {
    type: 'upcoming_bills',
    condition: ctx => ctx.hasUpcomingBills,
    title: 'Upcoming Bills',
    description: 'You have bills due soon. Stay on top of payments.',
    priority: 60,
    size: 'medium',
    icon: 'credit-card',
    actionLabel: 'View Bills',
    actionRoute: '/bills',
  },
  {
    type: 'family_summary',
    condition: ctx => ctx.hasFamilyData,
    title: 'Family Summary',
    description: 'Overview of your family\'s shared finances.',
    priority: 50,
    size: 'medium',
    icon: 'users',
    actionLabel: 'Family Dashboard',
    actionRoute: '/family',
  },
  {
    type: 'couple_insight',
    condition: ctx => ctx.hasCoupleData,
    title: 'Couple Insight',
    description: 'Insights on your shared financial journey.',
    priority: 40,
    size: 'medium',
    icon: 'heart',
    actionLabel: 'View Insights',
    actionRoute: '/couple',
  },
  {
    type: 'settlement_reminder',
    condition: ctx => ctx.hasSettlements,
    title: 'Settlements Pending',
    description: 'You have pending settlements to resolve with your group.',
    priority: 30,
    size: 'small',
    icon: 'repeat',
    actionLabel: 'Settle Up',
    actionRoute: '/groups',
  },
  {
    type: 'financial_dna',
    condition: ctx => ctx.dailyLoginCount % 7 === 0,
    title: 'Your Financial DNA',
    description: 'Discover your spending personality and financial patterns.',
    priority: 20,
    size: 'small',
    icon: 'dna',
    actionLabel: 'Explore',
    actionRoute: '/dna',
  },
  {
    type: 'achievement',
    condition: () => true,
    title: 'Financial Achievement',
    description: 'You\'re making great strides in your financial journey!',
    priority: 10,
    size: 'small',
    icon: 'star',
  },
];

const ACHIEVEMENTS: Omit<WidgetConfig, 'condition'>[] = [
  {
    type: 'achievement',
    title: 'Streak Master',
    description: `You've been checking your finances daily — consistency is key!`,
    priority: 10,
    size: 'small',
    icon: 'zap',
  },
  {
    type: 'achievement',
    title: 'Smart Spender',
    description: 'You stayed within budget this month. Well done!',
    priority: 10,
    size: 'small',
    icon: 'check-circle',
  },
  {
    type: 'achievement',
    title: 'Savings Champion',
    description: 'Your savings rate is higher than last month. Keep it up!',
    priority: 10,
    size: 'small',
    icon: 'trending-up',
  },
  {
    type: 'achievement',
    title: 'Bill Buster',
    description: 'All bills paid on time this month. You\'re on a roll!',
    priority: 10,
    size: 'small',
    icon: 'clock',
  },
];

export class SmartDashboardEngine {
  private lastCardTypes: string[] = [];

  setLastLayout(cardTypes: string[]): void {
    this.lastCardTypes = cardTypes;
  }

  generateDailyDashboard(context: DashboardUserContext): DashboardLayoutOutput {
    const rawCards = this.selectWidgets(context);
    const sorted = rawCards.sort((a, b) => b.priority - a.priority);

    const hasPositiveCard = sorted.some(c =>
      c.widgetType === 'goal_milestone' || c.widgetType === 'achievement'
    );
    if (!hasPositiveCard && sorted.length > 0) {
      const achievement = this.pickRandomAchievement(context);
      sorted.push(achievement);
    }

    const selectedCards = sorted.slice(0, 5);
    const finalCards = this.shuffleSecondaryItems(selectedCards, context);

    const columns = finalCards.length >= 4 ? 2 : 1;
    const rows = Math.ceil(finalCards.length / columns);

    return {
      userId: context.userId,
      date: new Date().toISOString().split('T')[0],
      cards: finalCards,
      layout: { columns, rows },
      generatedAt: new Date().toISOString(),
    };
  }

  selectWidgets(context: DashboardUserContext): DashboardCard[] {
    const cards: DashboardCard[] = [];

    for (const widget of WIDGETS) {
      if (widget.type === 'achievement') continue;
      if (widget.condition(context)) {
        cards.push(this.widgetToCard(widget, context));
      }
    }

    if (context.dailyLoginCount % 7 === 0) {
      const dnaWidget = WIDGETS.find(w => w.type === 'financial_dna')!;
      if (!cards.some(c => c.widgetType === 'financial_dna')) {
        cards.push(this.widgetToCard(dnaWidget, context));
      }
    }

    return cards;
  }

  private widgetToCard(widget: WidgetConfig, context: DashboardUserContext): DashboardCard {
    return {
      widgetType: widget.type,
      title: widget.type === 'financial_dna' && context.financialDna?.spendingPersonality
        ? `Your ${context.financialDna.spendingPersonality} Personality`
        : widget.title,
      description: widget.description,
      priority: widget.priority,
      widgetSize: widget.size,
      icon: widget.icon,
      actionLabel: widget.actionLabel,
      actionRoute: widget.actionRoute,
    };
  }

  private pickRandomAchievement(context: DashboardUserContext): DashboardCard {
    const daySeed = (context.dailyLoginCount + new Date().getDate()) % ACHIEVEMENTS.length;
    const achievement = ACHIEVEMENTS[daySeed];
    return {
      widgetType: achievement.type,
      title: achievement.title,
      description: achievement.description,
      priority: 5,
      widgetSize: 'small',
      icon: achievement.icon,
    };
  }

  private shuffleSecondaryItems(cards: DashboardCard[], context: DashboardUserContext): DashboardCard[] {
    if (cards.length <= 1) return cards;

    const primary = cards.slice(0, 1);
    const secondary = cards.slice(1);

    const daySeed = (context.dailyLoginCount + new Date().getDate()) % Math.max(1, secondary.length);
    if (secondary.length > 1) {
      const shuffled = [...secondary];
      const [moved] = shuffled.splice(daySeed, 1);
      shuffled.push(moved);
      return [...primary, ...shuffled];
    }

    return cards;
  }
}

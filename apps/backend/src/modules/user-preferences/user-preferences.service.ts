import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class UserPreferencesService {
  private readonly logger = new Logger(UserPreferencesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getPreferences(userId: string) {
    const [user, settings] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          dashboardLayout: true,
          bottomMenuConfig: true,
          preferredPrimaryColor: true,
        },
      }),
      this.prisma.settings.findUnique({
        where: { userId },
        select: { bottomBarVisible: true, quickActionVisible: true },
      }),
    ]);
    return {
      dashboardLayout: user?.dashboardLayout || this.defaultDashboardLayout(),
      bottomMenuConfig: user?.bottomMenuConfig || this.defaultBottomMenuConfig(),
      preferredPrimaryColor: user?.preferredPrimaryColor || null,
      bottomBarVisible: settings?.bottomBarVisible ?? true,
      quickActionVisible: settings?.quickActionVisible ?? true,
    };
  }

  async updateDashboardLayout(userId: string, layout: any[]) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { dashboardLayout: layout },
    });
    return { message: 'Dashboard layout updated' };
  }

  async updateBottomMenuConfig(userId: string, config: any[]) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { bottomMenuConfig: config },
    });
    return { message: 'Bottom menu updated' };
  }

  async updatePrimaryColor(userId: string, color: string | null) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { preferredPrimaryColor: color },
    });
    return { message: 'Primary color updated' };
  }

  async updateVisibility(
    userId: string,
    data: { bottomBarVisible?: boolean; quickActionVisible?: boolean },
  ) {
    const settings = await this.prisma.settings.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
    return {
      bottomBarVisible: settings.bottomBarVisible,
      quickActionVisible: settings.quickActionVisible,
    };
  }

  async getWidgetCatalog(userId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
      select: { status: true, currentPeriodEnd: true, plan: { select: { code: true } } },
    });
    const isPremium = !!(
      sub &&
      sub.status === 'active' &&
      sub.currentPeriodEnd >= new Date() &&
      sub.plan.code !== 'FREE'
    );

    const freeWidgets = [
      {
        id: 'balance',
        name: 'Balance',
        description: 'Current account balance',
        size: 'small',
        premium: false,
      },
      {
        id: 'quickActions',
        name: 'Quick Actions',
        description: 'Add transaction, scan bill',
        size: 'small',
        premium: false,
      },
      {
        id: 'features',
        name: 'Feature Cards',
        description: 'Budgets, Bills, Goals',
        size: 'medium',
        premium: false,
      },
      {
        id: 'snapshots',
        name: 'Monthly Snapshots',
        description: 'Income vs Expense chart',
        size: 'medium',
        premium: false,
      },
      {
        id: 'recentActivity',
        name: 'Recent Activity',
        description: 'Last 5 transactions',
        size: 'medium',
        premium: false,
      },
      {
        id: 'upcomingBills',
        name: 'Upcoming Bills',
        description: 'Bills due soon',
        size: 'small',
        premium: false,
      },
      {
        id: 'budgetStatus',
        name: 'Budget Status',
        description: 'Budget progress bars',
        size: 'medium',
        premium: false,
      },
    ];

    const premiumWidgets = [
      {
        id: 'cashFlowForecast',
        name: 'Cash Flow Forecast',
        description: '30-day cash flow projection',
        size: 'large',
        premium: true,
      },
      {
        id: 'savingsForecast',
        name: 'Savings Growth',
        description: 'Savings projection chart',
        size: 'large',
        premium: true,
      },
      {
        id: 'loanPayoffTracker',
        name: 'Loan Payoff',
        description: 'Loan amortization tracker',
        size: 'medium',
        premium: true,
      },
      {
        id: 'healthScore',
        name: 'Financial Health',
        description: 'Health score gauge',
        size: 'small',
        premium: true,
      },
      {
        id: 'spendingInsights',
        name: 'AI Insights',
        description: 'Smart spending insights',
        size: 'medium',
        premium: true,
      },
      {
        id: 'categoryAnalytics',
        name: 'Deep Analytics',
        description: 'Advanced category trends',
        size: 'large',
        premium: true,
      },
      {
        id: 'goalForecast',
        name: 'Goal Forecast',
        description: 'Goal completion projections',
        size: 'medium',
        premium: true,
      },
      {
        id: 'investmentHealth',
        name: 'Investment Health',
        description: 'Portfolio analysis',
        size: 'medium',
        premium: true,
      },
    ];

    return {
      free: freeWidgets,
      premium: isPremium ? premiumWidgets : premiumWidgets.map((w) => ({ ...w, locked: true })),
      isPremium,
    };
  }

  private defaultDashboardLayout() {
    return [
      { id: 'balance', visible: true, order: 0 },
      { id: 'quickActions', visible: true, order: 1 },
      { id: 'features', visible: true, order: 2 },
      { id: 'snapshots', visible: true, order: 3 },
      { id: 'recentActivity', visible: true, order: 4 },
    ];
  }

  private defaultBottomMenuConfig() {
    return [
      { id: 'Dashboard', visible: true, order: 0 },
      { id: 'Expense', visible: true, order: 1 },
      { id: 'QuickAction', visible: true, order: 2 },
      { id: 'Spaces', visible: true, order: 3 },
      { id: 'Settings', visible: true, order: 4, locked: true },
    ];
  }
}

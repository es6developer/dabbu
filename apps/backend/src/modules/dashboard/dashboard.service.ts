import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import { PersonalDashboardService } from './personal-dashboard.service';
import { CoupleDashboardService } from './couple-dashboard.service';
import { FamilyDashboardService } from './family-dashboard.service';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly personalService: PersonalDashboardService,
    private readonly coupleService: CoupleDashboardService,
    private readonly familyService: FamilyDashboardService,
  ) {}

  async getDashboard(userId: string) {
    const cacheKey = `dashboard:mode:${userId}`;
    const cached = await this.cache.get<{ mode: string; widgets: any[] }>(cacheKey);
    if (cached) return cached;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isCoupleMode: true, partnerId: true, familyMemberships: { take: 1, select: { familyId: true } } },
    });
    if (!user) return { mode: 'personal', widgets: [] };

    let result: { mode: string; [key: string]: any };

    if (user.familyMemberships?.length > 0) {
      const widgets = await this.familyService.getWidgets(userId, user.familyMemberships[0].familyId);
      const flat: Record<string, any> = {};
      for (const w of widgets) {
        const key = this.widgetTypeToKey(w.type, 'family');
        if (key && w.data) flat[key] = w.data;
      }
      result = { mode: 'family', ...flat };
    } else if (user.isCoupleMode && user.partnerId) {
      const widgets = await this.coupleService.getWidgets(userId);
      const flat: Record<string, any> = {};
      for (const w of widgets) {
        const key = this.widgetTypeToKey(w.type, 'couple');
        if (key && w.data) flat[key] = w.data;
      }
      result = { mode: 'couple', ...flat };
    } else {
      const widgets = await this.personalService.getWidgets(userId);
      const flat: Record<string, any> = {};
      for (const w of widgets) {
        const key = this.widgetTypeToKey(w.type, 'personal');
        if (key && w.data) flat[key] = w.data;
      }
      result = { mode: 'personal', ...flat };
    }

    await this.cache.set(cacheKey, result, 120);
    return result;
  }

  private widgetTypeToKey(type: string, scope: string): string | null {
    const personal: Record<string, string> = {
      GREETING: 'greeting', NET_WORTH: 'netWorth', THIS_MONTH: 'monthlySnapshot',
      HEALTH_SCORE: 'healthScore', AI_INSIGHTS: 'aiInsight', GOALS: 'goals',
      UPCOMING_BILLS: 'upcomingBills', RECENT_TRANSACTIONS: 'recentTransactions',
      BUDGETS: 'budgetsOverview', QUICK_ACTIONS: 'quickActions',
    };
    const couple: Record<string, string> = {
      COUPLE_WEALTH: 'combinedWealth', COUPLE_GOALS: 'coupleGoals', COUPLE_TIMELINE: 'coupleTimeline',
      THIS_MONTH: 'coupleSnapshot', HEALTH_SCORE: 'coupleHealth', AI_INSIGHTS: 'coupleAI',
      UPCOMING_BILLS: 'upcomingBills', RECENT_TRANSACTIONS: 'recentTransactions', QUICK_ACTIONS: 'quickActions',
    };
    const family: Record<string, string> = {
      FAMILY_HERO: 'familyHero', FAMILY_WEALTH: 'familyWealth', FAMILY_SNAPSHOT: 'familySnapshot',
      FAMILY_GOALS: 'familyGoals', FAMILY_BILLS: 'familyBills', FAMILY_CONTRIBUTIONS: 'familyContributions',
      FAMILY_EXPENSES: 'familyExpenses', FAMILY_INSIGHTS: 'familyInsights', FAMILY_TIMELINE: 'familyTimeline',
      FAMILY_HEALTH: 'familyHealth', QUICK_ACTIONS: 'quickActions',
    };
    if (scope === 'couple') return couple[type] || null;
    if (scope === 'family') return family[type] || null;
    return personal[type] || null;
  }

  async getWidgetConfigs(userId: string, scope: string) {
    const widgets = await this.prisma.dashboardWidget.findMany({
      where: { userId, scope },
      orderBy: { position: 'asc' },
    });

    const allTypes = getAllWidgetTypes(scope);
    const configured = new Set(widgets.map(w => w.widgetType));

    const merged = allTypes.map((type, index) => {
      const existing = widgets.find(w => w.widgetType === type);
      return {
        widgetType: type,
        enabled: existing?.enabled ?? true,
        position: existing?.position ?? index,
        config: existing?.config ?? null,
      };
    });

    return merged.sort((a, b) => a.position - b.position);
  }

  async reorderWidgets(userId: string, widgetTypes: string[], scope: string) {
    const existing = await this.prisma.dashboardWidget.findMany({
      where: { userId, scope },
    });
    const existingMap = new Map(existing.map(w => [w.widgetType, w]));

    await this.prisma.$transaction(
      widgetTypes.map((widgetType, position) => {
        const record = existingMap.get(widgetType);
        if (record) {
          return this.prisma.dashboardWidget.update({
            where: { id: record.id },
            data: { position },
          });
        }
        return this.prisma.dashboardWidget.create({
          data: { userId, scope, widgetType, position, enabled: true },
        });
      }),
    );

    await this.invalidateCache(userId);
  }

  async toggleWidget(userId: string, widgetType: string, scope: string) {
    const existing = await this.prisma.dashboardWidget.findUnique({
      where: { userId_scope_widgetType: { userId, scope, widgetType } },
    });

    if (existing) {
      await this.prisma.dashboardWidget.update({
        where: { id: existing.id },
        data: { enabled: !existing.enabled },
      });
    } else {
      const maxPos = await this.prisma.dashboardWidget.findFirst({
        where: { userId, scope },
        orderBy: { position: 'desc' },
        select: { position: true },
      });
      await this.prisma.dashboardWidget.create({
        data: {
          userId,
          scope,
          widgetType,
          enabled: true,
          position: (maxPos?.position ?? -1) + 1,
        },
      });
    }

    await this.invalidateCache(userId);
  }

  async invalidateCache(userId: string) {
    await this.cache.invalidate(`dashboard:mode:${userId}`);
    await this.cache.invalidate(`dashboard:personal:${userId}`);
    await this.cache.invalidate(`dashboard:couple:${userId}`);
    await this.cache.invalidate(`dashboard:family:${userId}`);
  }

  async trackFeature(userId: string, feature: string, label?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { dashboardLayout: true },
    });
    if (!user) return;

    let layout: any = {};
    try { layout = user.dashboardLayout ? (user.dashboardLayout as any) : {}; } catch { layout = {}; }

    const recentFeatures: any[] = layout.recentFeatures || [];
    const now = new Date().toISOString();
    const existing = recentFeatures.findIndex((f: any) => f.feature === feature);
    const entry = { feature, label: label || feature, usedAt: now };
    if (existing >= 0) recentFeatures.splice(existing, 1);
    recentFeatures.unshift(entry);
    if (recentFeatures.length > 20) recentFeatures.length = 20;
    layout.recentFeatures = recentFeatures;

    await this.prisma.user.update({
      where: { id: userId },
      data: { dashboardLayout: layout as any },
    });
  }
}

function getAllWidgetTypes(scope: string): string[] {
  const personal = [
    'NET_WORTH', 'THIS_MONTH', 'HEALTH_SCORE', 'AI_INSIGHTS',
    'GOALS', 'UPCOMING_BILLS', 'RECENT_TRANSACTIONS', 'QUICK_ACTIONS',
  ];
  const couple = [
    'COUPLE_WEALTH', 'COUPLE_GOALS', 'COUPLE_TIMELINE', 'THIS_MONTH',
    'HEALTH_SCORE', 'AI_INSIGHTS', 'UPCOMING_BILLS', 'RECENT_TRANSACTIONS',
  ];
  const family = [
    'FAMILY_WEALTH', 'FAMILY_CONTRIBUTIONS', 'FAMILY_INSIGHTS', 'GOALS',
    'UPCOMING_BILLS', 'RECENT_TRANSACTIONS', 'HEALTH_SCORE', 'AI_INSIGHTS',
  ];

  if (scope === 'couple') return couple;
  if (scope === 'family') return family;
  return personal;
}

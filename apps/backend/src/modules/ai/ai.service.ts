import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LensDataService } from '../../common/lens/lens-data.service';
import { NotificationService } from '../notification/notification.service';
import {
  PredictionEngine,
  AnomalyDetectionEngine,
  SavingsOpportunityEngine,
  GoalAchievementEngine,
  FamilyIntelligenceEngine,
  CoupleIntelligenceEngine,
  FinancialDnaEngine,
  LifeEventDetectionEngine,
  SmartNotificationEngine,
  SmartDashboardEngine,
  SettlementOptimizerEngine,
  SmartCategoryLearningEngine,
  GroupSpaceAiEngine,
  JoyfulMomentsEngine,
  FinancialHealth2Engine,
  SmartOcrEngine,
  InvestmentHealthEngine,
  RetirementProjectionEngine,
  FamilyWealthForecastEngine,
  AiTaxPreparationAssistant,
  MonthlyAiReviewEngine,
  FeedEngine,
  LlmClient,
} from '@dabbu/ai-engine';

export interface AiInsight {
  type: string;
  section: string;
  title: string;
  message: string;
  severity: 'info' | 'success' | 'warning' | 'critical';
  actionable?: boolean;
  actionLabel?: string;
  source: 'ai';
}

export interface AiNarrative {
  summary: string;
  highlights: string[];
  recommendations: string[];
  riskFlags: string[];
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly enabled: boolean;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly apiKey: string;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly insightCache = new Map<string, { data: any; ts: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000;

  private readonly predictionEngine = new PredictionEngine();
  private readonly anomalyEngine = new AnomalyDetectionEngine();
  private readonly savingsEngine = new SavingsOpportunityEngine();
  private readonly goalEngine = new GoalAchievementEngine();
  private readonly familyEngine = new FamilyIntelligenceEngine();
  private readonly coupleEngine = new CoupleIntelligenceEngine();
  private readonly lifeEventEngine = new LifeEventDetectionEngine();
  private readonly notifEngine = new SmartNotificationEngine();
  private readonly dashboardEngine = new SmartDashboardEngine();
  private readonly settlementEngine = new SettlementOptimizerEngine();
  private readonly categoryEngine = new SmartCategoryLearningEngine();
  private readonly groupSpaceEngine = new GroupSpaceAiEngine();
  private readonly joyEngine = new JoyfulMomentsEngine();
  private readonly ocrEngine = new SmartOcrEngine();
  private readonly investHealthEngine = new InvestmentHealthEngine();
  private readonly retirementEngine = new RetirementProjectionEngine();
  private readonly wealthForecastEngine = new FamilyWealthForecastEngine();
  private readonly taxAssistantEngine = new AiTaxPreparationAssistant();
  private readonly feedEngine = new FeedEngine();

  private llmClient: LlmClient;
  private readonly dnaEngine: FinancialDnaEngine;
  private readonly health2Engine: FinancialHealth2Engine;
  private readonly monthlyReviewEngine: MonthlyAiReviewEngine;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly lensData: LensDataService,
    private readonly notificationService: NotificationService,
  ) {
    const aiConfig = this.config.get('ai');
    this.enabled = aiConfig?.enabled ?? false;
    this.baseUrl = aiConfig?.baseUrl || 'http://localhost:11434';
    this.model = aiConfig?.model || 'llama3.2';
    this.apiKey = aiConfig?.apiKey || '';
    this.timeout = aiConfig?.timeout || 30000;
    this.maxRetries = aiConfig?.maxRetries || 2;

    this.llmClient = new LlmClient({
      baseUrl: this.baseUrl,
      model: this.model,
      apiKey: this.apiKey,
      timeout: this.timeout,
      maxRetries: this.maxRetries,
    });

    this.dnaEngine = new FinancialDnaEngine(this.llmClient);
    this.health2Engine = new FinancialHealth2Engine(this.llmClient);
    this.monthlyReviewEngine = new MonthlyAiReviewEngine(this.llmClient);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private async lensWhere(userId: string): Promise<{ lensId?: string }> {
    return this.lensData.buildLensFilter(userId);
  }

  async generateInsights(section: string, context: Record<string, any>): Promise<AiInsight[]> {
    if (!this.enabled) {
      return [];
    }

    const cacheKey = `insights:${section}:${JSON.stringify(context)}`;
    const cached = this.insightCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < this.CACHE_TTL) {
      return cached.data;
    }

    const prompt = this.buildPrompt(section, context);
    const response = await this.callLlm(prompt);
    const result = this.parseInsights(response, section);
    this.insightCache.set(cacheKey, { data: result, ts: Date.now() });
    return result;
  }

  async generateNarrative(
    section: string,
    context: Record<string, any>,
  ): Promise<AiNarrative | null> {
    if (!this.enabled) {
      return null;
    }

    const cacheKey = `narrative:${section}:${JSON.stringify(context)}`;
    const cached = this.insightCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < this.CACHE_TTL) {
      return cached.data;
    }

    const prompt = this.buildNarrativePrompt(section, context);
    const response = await this.callLlm(prompt);
    const result = this.parseNarrative(response);
    if (result) {
      this.insightCache.set(cacheKey, { data: result, ts: Date.now() });
    }
    return result;
  }

  async generateGroupNarrative(groupId: string, userId: string): Promise<AiNarrative | null> {
    if (!this.enabled) {
      return null;
    }

    const cacheKey = `group:narrative:${groupId}`;
    const cached = this.insightCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < this.CACHE_TTL) {
      return cached.data;
    }

    const group = await this.prisma.expenseGroup.findUnique({
      where: { id: groupId },
      include: {
        _count: { select: { members: true, transactions: true } },
        members: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });
    if (!group) {
      return null;
    }

    const transactions = await this.prisma.transaction.findMany({
      where: { expenseGroupId: groupId },
      include: { category: { select: { name: true } } },
      orderBy: { date: 'desc' },
      take: 100,
    });

    const totalAmount = transactions.reduce((s, t) => s + Number(t.amount), 0);
    const byCategory: Record<string, number> = {};
    for (const t of transactions) {
      const cat = t.category?.name || 'Uncategorized';
      byCategory[cat] = (byCategory[cat] || 0) + Number(t.amount);
    }
    const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];

    const memberNames = group.members.map((m) => `${m.user.firstName} ${m.user.lastName}`.trim());
    const context: Record<string, any> = {
      groupName: group.name,
      description: group.description,
      totalMembers: group._count.members,
      totalTransactions: group._count.transactions,
      totalSpent: totalAmount,
      topCategory: topCategory ? { name: topCategory[0], amount: topCategory[1] } : null,
      categoryBreakdown: byCategory,
      members: memberNames,
      recentTransactions: transactions.slice(0, 10).map((t) => ({
        description: t.description,
        amount: Number(t.amount),
        type: t.type,
        date: t.date,
        category: t.category?.name || null,
      })),
    };

    const prompt = `You are a financial analyst analyzing an expense group called "${group.name}". 
The group has ${context.totalMembers} members and has made ${context.totalTransactions} transactions totalling ₹${totalAmount.toFixed(0)}.
Their top spending category is ${topCategory ? topCategory[0] + ' at ₹' + topCategory[1].toFixed(0) : 'N/A'}.

Return ONLY a JSON object with these exact fields:
- summary (2-3 sentences analyzing the group's spending patterns, fairness, and health)
- highlights (array of 2-3 specific observations about spending habits or group dynamics)
- recommendations (array of 2-3 actionable suggestions to improve group financial management)
- riskFlags (array of any potential issues like uneven spending, budget concerns, or inactivity)

Group Data:
${JSON.stringify(context, null, 2)}`;

    const response = await this.callLlm(prompt);
    const result = this.parseNarrative(response);
    if (result) {
      this.insightCache.set(cacheKey, { data: result, ts: Date.now() });
    }
    return result;
  }

  async generateSplitNarrative(groupId: string, userId: string): Promise<AiNarrative | null> {
    if (!this.enabled) {
      return null;
    }

    const cacheKey = `split:narrative:${groupId}`;
    const cached = this.insightCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < this.CACHE_TTL) {
      return cached.data;
    }

    const group = await this.prisma.expenseGroup.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });
    if (!group) {
      return null;
    }

    const transactions = await this.prisma.transaction.findMany({
      where: { expenseGroupId: groupId },
      orderBy: { date: 'desc' },
      take: 100,
    });

    const memberTotals: Record<string, { name: string; paid: number; count: number }> = {};
    for (const m of group.members) {
      const name = `${m.user.firstName} ${m.user.lastName}`.trim();
      memberTotals[m.user.id] = { name, paid: 0, count: 0 };
    }
    for (const t of transactions) {
      if (memberTotals[t.userId]) {
        memberTotals[t.userId].paid += Number(t.amount);
        memberTotals[t.userId].count += 1;
      }
    }

    const totalPaid = Object.values(memberTotals).reduce((s, m) => s + m.paid, 0);
    const fairShare = totalPaid / Math.max(Object.keys(memberTotals).length, 1);
    const imbalances: string[] = [];
    for (const m of Object.values(memberTotals)) {
      const diff = m.paid - fairShare;
      if (Math.abs(diff) > 0) {
        imbalances.push(
          `${m.name} paid ₹${m.paid.toFixed(0)} (${diff > 0 ? 'over' : 'under'} by ₹${Math.abs(diff).toFixed(0)})`,
        );
      }
    }

    const context: Record<string, any> = {
      groupName: group.name,
      totalSpent: totalPaid,
      fairSharePerPerson: fairShare,
      memberContributions: Object.values(memberTotals),
      imbalances,
      totalTransactions: transactions.length,
    };

    const prompt = `You are a settlement mediator analyzing the expense group "${group.name}".
The group spent a total of ₹${totalPaid.toFixed(0)} across ${transactions.length} transactions.
Fair share per person: ₹${fairShare.toFixed(0)}.

Return ONLY a JSON object with these exact fields:
- summary (2-3 sentences analyzing settlement fairness and patterns)
- highlights (array of 2-3 key observations about who paid what and imbalances)
- recommendations (array of 2-3 specific suggestions for fair settlements)
- riskFlags (array of any issues like large imbalances or infrequent contributions)

Settlement Data:
${JSON.stringify(context, null, 2)}`;

    const response = await this.callLlm(prompt);
    const result = this.parseNarrative(response);
    if (result) {
      this.insightCache.set(cacheKey, { data: result, ts: Date.now() });
    }
    return result;
  }

  // ── Conversation State ──────────────────────────────────────────
  private conversationStates = new Map<
    string,
    {
      step: string;
      intent: string;
      context: Record<string, any>;
      data: Record<string, any>;
      ts: number;
    }
  >();
  private readonly CONV_TTL = 5 * 60 * 1000;

  async processChat(
    userId: string,
    prompt: string,
  ): Promise<{ action: string; message: string; data?: any }> {
    const p = prompt.toLowerCase().trim();

    // ── Cancel any active conversation ────────────────────────────
    if (
      ['cancel', 'never mind', 'forget it', 'stop', 'go back', 'none'].some(
        (w) => p === w || p.startsWith(w),
      )
    ) {
      const had = this.conversationStates.delete(userId);
      return {
        action: 'cancel',
        message: had ? 'Cancelled. What else can I help with?' : 'Nothing to cancel.',
      };
    }

    // ── Resume pending conversation ───────────────────────────────
    const pending = this.conversationStates.get(userId);
    if (pending && Date.now() - pending.ts < this.CONV_TTL) {
      return this.handleConversationStep(userId, prompt, pending);
    } else if (pending) {
      this.conversationStates.delete(userId);
    }

    // ── Intent Detection (ordered: most specific first) ───────────

    // Budget alert — very specific (alert/limit + over)
    if (
      (p.includes('alert') ||
        p.includes('budget') ||
        p.includes('limit') ||
        p.includes('notify')) &&
      p.includes('over')
    ) {
      return this.handleSetBudget(prompt, userId);
    }

    // Attach receipt — specific keywords
    if (p.includes('receipt') || p.includes('attach')) {
      return this.handleAttachReceipt();
    }

    // Create expense group — "Create group: Monthly Rent with Roommates"
    if (
      (p.includes('group') &&
        !p.includes('spend') &&
        (p.includes('creat') || p.includes('new') || p.includes('monthly'))) ||
      p.includes('rent') ||
      p.includes('roommate')
    ) {
      return this.handleCreateExpenseGroup(prompt, userId);
    }

    // Create spending categories — "Create spending groups (Food, Transport...)"
    if (
      (p.includes('group') && p.includes('spend')) ||
      (p.includes('category') && (p.includes('creat') || p.includes('spend')))
    ) {
      return this.handleCreateGroups(userId);
    }

    // Create space — "Create a new space for Vacation Fund"
    if (
      p.includes('space') &&
      (p.includes('creat') || p.includes('new') || p.includes('vacation') || p.includes('fund'))
    ) {
      return this.handleCreateSpace(prompt, userId);
    }

    // Add expense — "Add expense: Coffee $4.50"
    if (
      p.includes('add') &&
      (p.includes('expense') || p.includes('$') || p.includes('₹') || /\d+/.test(p))
    ) {
      return this.handleAddExpenseWithFlow(prompt, userId);
    }

    // Savings analysis — "Show me where I can save money"
    if (
      p.includes('save') ||
      p.includes('reduce') ||
      p.includes('cut') ||
      p.includes('where can i')
    ) {
      return this.handleSavingsAnalysis(userId);
    }

    // Summarize — "Summarize my last 30 days of expenses"
    if (
      p.includes('summar') ||
      p.includes('summary') ||
      (p.includes('last') && (p.includes('30') || p.includes('month'))) ||
      (p.includes('spend') && p.includes('30'))
    ) {
      return this.handleSummarizeWithFlow(userId);
    }

    // Create circle shorthand — "Create a new circle" or "Make a circle"
    if (
      (p.includes('circle') || p.includes('new circle') || p.includes('create circle')) &&
      (p.includes('creat') || p.includes('new') || p.includes('make'))
    ) {
      return this.handleCreateExpenseGroup(prompt, userId);
    }

    // ── Fallback: context-aware chat response ─────────────────────
    return this.handleGeneralChat(userId, p);
  }

  // ── Conversation Step Router ────────────────────────────────────
  private async handleConversationStep(
    userId: string,
    response: string,
    state: {
      step: string;
      intent: string;
      context: Record<string, any>;
      data: Record<string, any>;
      ts: number;
    },
  ): Promise<{ action: string; message: string; data?: any }> {
    const r = response.trim();

    switch (state.step) {
      // ── ADD EXPENSE: destination type ─────────────────────────
      case 'ask_expense_destination': {
        const dest = r.toLowerCase();
        if (dest.includes('personal') || dest.includes('my')) {
          this.conversationStates.delete(userId);
          return this.handleAddExpense(state.context.raw || '', userId);
        }
        if (dest.includes('circle') || dest.includes('group')) {
          const circles = await this.getUserCircles(userId);
          if (circles.length === 0) {
            this.conversationStates.delete(userId);
            return this.handleAddExpense(state.context.raw || '', userId);
          }
          const options = circles.map((c: any) => c.name);
          this.conversationStates.set(userId, {
            ...state,
            step: 'ask_expense_circle',
            data: { ...state.data, circles },
            ts: Date.now(),
          });
          return {
            action: 'ask',
            message: 'Which circle?',
            data: { field: 'circle', options, context: state.context },
          };
        }
        if (dest.includes('space')) {
          this.conversationStates.delete(userId);
          return {
            action: 'add_expense',
            message: `Space expenses require splits and members. Add this in the Spaces tab instead. I'll save it as a personal expense for now.`,
            data: { amount: state.context.amount, description: state.context.description },
          };
        }
        return {
          action: 'ask',
          message: 'Please pick Personal or Circle.',
          data: { field: 'destination', options: ['Personal', 'Circle'], context: state.context },
        };
      }

      // ── ADD EXPENSE: pick circle ──────────────────────────────
      case 'ask_expense_circle': {
        const circles: any[] = state.data.circles || [];
        const match = circles.find(
          (c: any) =>
            c.name.toLowerCase() === r.toLowerCase() ||
            c.name.toLowerCase().includes(r.toLowerCase()),
        );
        if (!match) {
          return {
            action: 'ask',
            message: 'Please pick a circle from the list.',
            data: {
              field: 'circle',
              options: circles.map((c: any) => c.name),
              context: state.context,
            },
          };
        }
        this.conversationStates.delete(userId);
        // Create expense in that circle
        const raw = state.context.raw || '';
        const enriched = `${raw} in circle ${match.name}`;
        return this.handleAddExpense(enriched, userId, match.id);
      }

      // ── SUMMARIZE: scope ──────────────────────────────────────
      case 'ask_summary_scope': {
        const scope = r.toLowerCase();
        if (scope.includes('personal') || scope.includes('my')) {
          this.conversationStates.delete(userId);
          return this.handleSummarize(userId);
        }
        if (scope.includes('circle') || scope.includes('group')) {
          const circles = await this.getUserCircles(userId);
          if (circles.length === 0) {
            this.conversationStates.delete(userId);
            return {
              action: 'chat',
              message: "You don't have any circles yet. Create one to get started!",
            };
          }
          this.conversationStates.set(userId, {
            ...state,
            step: 'ask_summary_circle',
            data: { ...state.data, circles },
            ts: Date.now(),
          });
          return {
            action: 'ask',
            message: 'Which circle?',
            data: { field: 'circle', options: circles.map((c: any) => c.name) },
          };
        }
        if (scope.includes('space')) {
          const spaces = await this.getUserSpaces(userId);
          if (spaces.length === 0) {
            this.conversationStates.delete(userId);
            return {
              action: 'chat',
              message: "You don't have any spaces yet. Create one to get started!",
            };
          }
          this.conversationStates.set(userId, {
            ...state,
            step: 'ask_summary_space',
            data: { ...state.data, spaces },
            ts: Date.now(),
          });
          return {
            action: 'ask',
            message: 'Which space?',
            data: { field: 'space', options: spaces.map((s: any) => s.name) },
          };
        }
        if (scope.includes('all') || scope.includes('every')) {
          this.conversationStates.delete(userId);
          return this.handleSummarizeAll(userId);
        }
        return {
          action: 'ask',
          message: 'Pick Personal, Circle, Space, or All.',
          data: { field: 'scope', options: ['Personal', 'Circle', 'Space', 'All'] },
        };
      }

      // ── SUMMARIZE: pick circle ────────────────────────────────
      case 'ask_summary_circle': {
        const circles: any[] = state.data.circles || [];
        const match = circles.find(
          (c: any) =>
            c.name.toLowerCase() === r.toLowerCase() ||
            c.name.toLowerCase().includes(r.toLowerCase()),
        );
        if (!match) {
          return {
            action: 'ask',
            message: 'Please pick a circle from the list.',
            data: { field: 'circle', options: circles.map((c: any) => c.name) },
          };
        }
        this.conversationStates.delete(userId);
        return this.handleSummarizeCircle(userId, match.id, match.name);
      }

      // ── SUMMARIZE: pick space ─────────────────────────────────
      case 'ask_summary_space': {
        const spaces: any[] = state.data.spaces || [];
        const match = spaces.find(
          (s: any) =>
            s.name.toLowerCase() === r.toLowerCase() ||
            s.name.toLowerCase().includes(r.toLowerCase()),
        );
        if (!match) {
          return {
            action: 'ask',
            message: 'Please pick a space from the list.',
            data: { field: 'space', options: spaces.map((s: any) => s.name) },
          };
        }
        this.conversationStates.delete(userId);
        return this.handleSummarizeSpace(userId, match.id, match.name);
      }

      default:
        this.conversationStates.delete(userId);
        return this.handleGeneralChat(userId, r);
    }
  }

  // ── Conversational Handlers ────────────────────────────────────

  private async handleAddExpenseWithFlow(
    raw: string,
    userId: string,
  ): Promise<{ action: string; message: string; data?: any }> {
    const p = raw.toLowerCase();
    const amountMatch = raw.match(/(\d+\.?\d*)/);
    const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;

    const descMatch = raw.match(/add\s+(?:expense\s+)?(?::?\s*)?(.+)/i);
    const forMatch = raw.match(/for\s+(.+)/i);
    const description = (forMatch?.[1] || descMatch?.[1] || 'Expense').trim();

    if (amount <= 0) {
      return {
        action: 'add_expense',
        message: 'I need an amount to add an expense. Try "Add expense: Coffee ₹250".',
        data: null,
      };
    }

    // If the user already specified a destination in the prompt, execute directly
    const hasDest =
      p.includes('personal') || p.includes('circle') || p.includes('space') || p.includes('group');

    if (hasDest) {
      return this.handleAddExpense(raw, userId);
    }

    // Start conversation flow
    this.conversationStates.set(userId, {
      step: 'ask_expense_destination',
      intent: 'add_expense',
      context: { amount, description, raw },
      data: {},
      ts: Date.now(),
    });

    return {
      action: 'ask',
      message: `Where should **₹${amount.toFixed(2)}** for **${description}** go?`,
      data: {
        field: 'destination',
        options: ['Personal', 'Circle'],
        context: { amount, description },
      },
    };
  }

  private async handleSummarizeWithFlow(
    userId: string,
  ): Promise<{ action: string; message: string; data?: any }> {
    this.conversationStates.set(userId, {
      step: 'ask_summary_scope',
      intent: 'summarize',
      context: {},
      data: {},
      ts: Date.now(),
    });

    return {
      action: 'ask',
      message: 'Which scope would you like a summary for?',
      data: {
        field: 'scope',
        options: ['Personal', 'Circle', 'Space', 'All'],
      },
    };
  }

  // ── Helper: get user's circles (ExpenseGroups) ─────────────────
  private async getUserCircles(userId: string): Promise<any[]> {
    try {
      return await this.prisma.expenseGroup.findMany({
        where: {
          members: { some: { userId } },
        },
        select: { id: true, name: true },
        orderBy: { createdAt: 'desc' },
      });
    } catch {
      return [];
    }
  }

  // ── Helper: get user's spaces (SharedGroups) ───────────────────
  private async getUserSpaces(userId: string): Promise<any[]> {
    try {
      return await this.prisma.sharedGroup.findMany({
        where: {
          members: { some: { userId } },
          status: 'ACTIVE',
        },
        select: { id: true, name: true },
        orderBy: { createdAt: 'desc' },
      });
    } catch {
      return [];
    }
  }

  // ── Summarize all (personal + circles + spaces) ────────────────
  private async handleSummarizeAll(
    userId: string,
  ): Promise<{ action: string; message: string; data?: any }> {
    const personal = await this.handleSummarize(userId);
    const circles = await this.getUserCircles(userId);
    const circleSummaries: string[] = [];
    for (const c of circles.slice(0, 3)) {
      const s = await this.handleSummarizeCircle(userId, c.id, c.name);
      circleSummaries.push(s.message);
    }
    const msg = [personal.message, ...circleSummaries.map((m) => m.replace(/^\s*/, ''))].join(
      '\n\n',
    );
    return { action: 'summarize', message: msg, data: personal.data };
  }

  // ── Summarize a specific circle ─────────────────────────────────
  private async handleSummarizeCircle(
    userId: string,
    circleId: string,
    circleName: string,
  ): Promise<{ action: string; message: string; data?: any }> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const txns = await this.prisma.transaction.findMany({
      where: { expenseGroupId: circleId, date: { gte: thirtyDaysAgo }, deletedAt: null },
      include: { category: { select: { name: true } }, user: { select: { firstName: true } } },
      orderBy: { date: 'desc' },
      take: 100,
    });

    const total = txns.reduce((s, t) => s + Number(t.amount), 0);
    const byCategory: Record<string, number> = {};
    for (const t of txns) {
      const cat = t.category?.name || 'Other';
      byCategory[cat] = (byCategory[cat] || 0) + Number(t.amount);
    }
    const topCats = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const lines: string[] = [`📊 **${circleName} — Last 30 Days**`];
    lines.push(`\n💰 **Total:** ₹${total.toLocaleString('en-IN')}`);
    lines.push(`📝 **Transactions:** ${txns.length}`);
    if (topCats.length > 0) {
      lines.push('\n**Top Categories:**');
      for (const [cat, amt] of topCats) {
        const pct = total > 0 ? ((amt / total) * 100).toFixed(0) : '0';
        lines.push(`  • ${cat}: ₹${amt.toLocaleString('en-IN')} (${pct}%)`);
      }
    }

    return {
      action: 'summarize',
      message: lines.join('\n'),
      data: { total, categories: topCats, count: txns.length, circleName },
    };
  }

  // ── Summarize a specific space ─────────────────────────────────
  private async handleSummarizeSpace(
    userId: string,
    spaceId: string,
    spaceName: string,
  ): Promise<{ action: string; message: string; data?: any }> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const expenses = await this.prisma.sharedExpense.findMany({
      where: {
        groupId: spaceId,
        paidBy: userId,
        date: { gte: thirtyDaysAgo },
      },
      orderBy: { date: 'desc' },
      take: 100,
    });

    const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const byCategory: Record<string, number> = {};
    for (const e of expenses) {
      const cat = e.category || 'Other';
      byCategory[cat] = (byCategory[cat] || 0) + Number(e.amount);
    }
    const topCats = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const lines: string[] = [`📊 **${spaceName} — Last 30 Days**`];
    lines.push(`\n💰 **Total:** ₹${total.toLocaleString('en-IN')}`);
    lines.push(`📝 **Expenses:** ${expenses.length}`);
    if (topCats.length > 0) {
      lines.push('\n**Top Categories:**');
      for (const [cat, amt] of topCats) {
        const pct = total > 0 ? ((amt / total) * 100).toFixed(0) : '0';
        lines.push(`  • ${cat}: ₹${amt.toLocaleString('en-IN')} (${pct}%)`);
      }
    }

    return {
      action: 'summarize',
      message: lines.join('\n'),
      data: { total, categories: topCats, count: expenses.length, spaceName },
    };
  }

  private async handleSummarize(
    userId: string,
  ): Promise<{ action: string; message: string; data?: any }> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [txns, stats] = await Promise.all([
      this.prisma.transaction.findMany({
        where: {
          userId,
          date: { gte: thirtyDaysAgo },
          deletedAt: null,
          ...(await this.lensWhere(userId)),
        },
        include: { category: { select: { name: true } } },
        orderBy: { date: 'desc' },
        take: 100,
      }),
      this.getMonthlyStats(userId),
    ]);

    const totalIncome = txns
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + Number(t.amount), 0);
    const totalExpense = txns
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + Number(t.amount), 0);
    const byCategory: Record<string, number> = {};
    for (const t of txns) {
      if (t.type === 'expense') {
        const cat = t.category?.name || 'Other';
        byCategory[cat] = (byCategory[cat] || 0) + Number(t.amount);
      }
    }
    const topCats = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const lines: string[] = ['📊 **Last 30 Days Summary**'];
    lines.push(`\n💰 **Income:** ₹${totalIncome.toLocaleString('en-IN')}`);
    lines.push(`💳 **Spent:** ₹${totalExpense.toLocaleString('en-IN')}`);
    lines.push(`🏦 **Balance:** ₹${(totalIncome - totalExpense).toLocaleString('en-IN')}`);

    if (topCats.length > 0) {
      lines.push('\n**Top Spending Categories:**');
      for (const [cat, amt] of topCats) {
        const pct = totalExpense > 0 ? ((amt / totalExpense) * 100).toFixed(0) : '0';
        lines.push(`  • ${cat}: ₹${amt.toLocaleString('en-IN')} (${pct}%)`);
      }
    }

    lines.push(`\n📝 **Transactions:** ${txns.length} total`);

    if (txns.length > 0) {
      lines.push('\n**Recent:**');
      for (const t of txns.slice(0, 5)) {
        const cat = t.category?.name || 'Expense';
        lines.push(
          `  • ${t.description || cat}: ${t.type === 'income' ? '+' : '-'}₹${Number(t.amount).toLocaleString('en-IN')}`,
        );
      }
    }

    if (stats) {
      lines.push(`\n📈 **Savings Rate:** ${stats.savingsRate?.toFixed(0) || 'N/A'}% of income`);
    }

    return {
      action: 'summarize',
      message: lines.join('\n'),
      data: { totalIncome, totalExpense, categories: topCats, count: txns.length },
    };
  }

  private async handleSavingsAnalysis(
    userId: string,
  ): Promise<{ action: string; message: string; data?: any }> {
    const stats = await this.getMonthlyStats(userId);
    if (!stats) {
      return {
        action: 'analyze_savings',
        message:
          '📈 Not enough data to analyze savings patterns. Start tracking your expenses to get insights!',
      };
    }

    const lines: string[] = ['📈 **Savings Analysis**'];
    lines.push(`\n💵 **Income:** ₹${stats.income.toLocaleString('en-IN')}`);
    lines.push(`💳 **Spending:** ₹${stats.expense.toLocaleString('en-IN')}`);
    lines.push(`🏦 **Savings:** ₹${stats.savings.toLocaleString('en-IN')}`);
    lines.push(`📊 **Rate:** ${stats.savingsRate?.toFixed(1) || 0}% of income`);

    if (stats.topCategories.length > 0) {
      lines.push('\n✂️ **Potential cuts:**');
      for (const [cat, amt] of stats.topCategories.slice(0, 3)) {
        lines.push(`  • ${cat}: ₹${amt.toLocaleString('en-IN')}`);
      }
    }

    if (stats.savingsRate < 20) {
      lines.push(
        '\n💡 **Tip:** Try to save at least 20% of your income. Consider reducing discretionary spending on ' +
          (stats.topCategories[0]?.[0] || 'non-essentials') +
          '.',
      );
    } else {
      lines.push("\n✅ **Great job!** You're saving a healthy portion of your income.");
    }

    return { action: 'analyze_savings', message: lines.join('\n'), data: stats };
  }

  private async handleCreateGroups(
    userId: string,
  ): Promise<{ action: string; message: string; data?: any }> {
    const categories = await this.prisma.transactionCategory.findMany({
      where: { userId, isActive: true },
      select: { id: true, name: true },
      take: 10,
    });

    return {
      action: 'create_group',
      message:
        '📊 **Suggested Spending Groups:**\n\n' +
        '• 🍔 **Food** — Restaurants, groceries, snacks\n' +
        '• 🚗 **Transport** — Fuel, cabs, public transit\n' +
        '• 🎬 **Entertainment** — Movies, games, streaming\n' +
        '• 📄 **Bills** — Rent, utilities, subscriptions\n\n' +
        (categories.length > 0
          ? `You already have **${categories.length} categories** set up. Head to "Expenses > Categories" to organize them.\n\n`
          : '') +
        '💡 **Tip:** You can create custom categories in Settings → Categories to match your spending habits.',
      data: { existingCategories: categories.length },
    };
  }

  private async handleCreateSpace(
    raw: string,
    userId: string,
  ): Promise<{ action: string; message: string; data?: any }> {
    const nameMatch = raw.match(
      /(?:space|fund)\s*(?::|called|named)?\s*["""]?(.+?)["""]?(?:\s*with|\s*for|$)/i,
    );
    const name = nameMatch?.[1]?.trim() || 'Vacation Fund';

    try {
      const lensId = await this.lensData.getActiveLens(userId);
      const group = await this.prisma.sharedGroup.create({
        data: {
          name,
          type: 'friends',
          createdBy: userId,
          lensId,
          members: {
            create: { userId, role: 'admin' },
          },
        },
      });

      return {
        action: 'create_space',
        message: `Space "${name}" created successfully! You can now invite members.`,
        data: { groupId: group.id, groupName: group.name },
      };
    } catch (e: any) {
      return {
        action: 'create_space',
        message: `Space "${name}" is ready. Go to the Spaces tab to finish setting it up.`,
        data: { groupName: name },
      };
    }
  }

  private async handleAddExpense(
    raw: string,
    userId: string,
    expenseGroupId?: string,
  ): Promise<{ action: string; message: string; data?: any }> {
    const amountMatch = raw.match(/(\d+\.?\d*)/);
    const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;

    const descMatch = raw.match(/add\s+(?:expense\s+)?(?::?\s*)?(.+)/i);
    const forMatch = raw.match(/for\s+(.+)/i);
    const description = (forMatch?.[1] || descMatch?.[1] || 'Expense').trim();

    if (amount <= 0) {
      return {
        action: 'add_expense',
        message: 'I need an amount to add an expense. Try "Add expense: Coffee ₹250".',
        data: null,
      };
    }

    try {
      const category = await this.prisma.transactionCategory.findFirst({
        where: { userId, isActive: true },
        orderBy: { sortOrder: 'asc' },
      });

      const tx = await this.prisma.transaction.create({
        data: {
          userId,
          lensId: await this.lensData.getActiveLens(userId),
          amount,
          type: 'expense',
          description: description || 'AI added expense',
          date: new Date(),
          categoryId: category?.id || undefined,
          ...(expenseGroupId ? { expenseGroupId } : {}),
        },
      });

      return {
        action: 'add_expense',
        message: `➕ **Added Expense**\n\n**Amount:** ₹${Number(tx.amount).toFixed(2)}\n**Description:** ${tx.description || 'Expense'}\n\n✅ Recorded successfully!`,
        data: {
          amount: Number(tx.amount),
          description: tx.description || 'Expense',
          groupId: expenseGroupId,
        },
      };
    } catch (e: any) {
      return {
        action: 'add_expense',
        message: `➕ **Expense:** ₹${amount.toFixed(2)} for "${description}"\n\nYou can add this in the Expenses tab.`,
        data: { amount, description },
      };
    }
  }

  private async handleCreateExpenseGroup(
    raw: string,
    userId: string,
  ): Promise<{ action: string; message: string; data?: any }> {
    const nameMatch = raw.match(
      /(?:group|space|fund)\s*(?::|called|named)?\s*["""]?(.+?)["""]?(?:\s*with|\s*for|$)/i,
    );
    const name = nameMatch?.[1]?.trim() || 'Monthly Rent';

    try {
      const lensId = await this.lensData.getActiveLens(userId);
      const group = await this.prisma.expenseGroup.create({
        data: {
          name,
          description: `Created by Dabbu AI from: "${raw.slice(0, 100)}"`,
          createdBy: userId,
          lensId,
          members: {
            create: { userId, role: 'admin' },
          },
        },
      });

      return {
        action: 'create_group',
        message: `Group "${name}" created successfully! You can now add members and start tracking expenses.`,
        data: { groupId: group.id, groupName: group.name },
      };
    } catch (e: any) {
      return {
        action: 'create_group',
        message: `Expense group "${name}" is ready to be created. Head to the Expenses tab to set it up with members.`,
        data: { groupName: name },
      };
    }
  }

  private async handleSetBudget(
    raw: string,
    userId: string,
  ): Promise<{ action: string; message: string; data?: any }> {
    const categoryMatch = raw.match(/for\s+(.+?)(?:\s+when|\s+over|\s+at|$)/i);
    const categoryName = categoryMatch?.[1]?.trim() || 'Dining';
    const amountMatch = raw.match(/(\d+\.?\d*)/);
    const limit = amountMatch ? parseFloat(amountMatch[1]) : 200;

    try {
      const existingCat = await this.prisma.transactionCategory.findFirst({
        where: { userId, name: { startsWith: categoryName }, isActive: true },
      });

      const now = new Date();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const budget = await this.prisma.budget.create({
        data: {
          userId,
          lensId: await this.lensData.getActiveLens(userId),
          name: `${categoryName} Budget`,
          amount: limit,
          period: 'monthly',
          startDate: now,
          endDate: endOfMonth,
          categoryId: existingCat?.id || undefined,
        },
      });

      return {
        action: 'set_budget',
        message:
          `🔔 **Budget Alert Set**\n\n` +
          `**Category:** ${categoryName}\n` +
          `**Limit:** ₹${Number(budget.amount).toFixed(0)}\n\n` +
          "✅ You'll be notified when spending exceeds this limit.\n\n" +
          'Manage budgets in **Settings → Budgets**.',
        data: { category: categoryName, limit: Number(budget.amount), budgetId: budget.id },
      };
    } catch (e: any) {
      return {
        action: 'set_budget',
        message:
          `🔔 **Budget Alert:** ${categoryName} — ₹${limit.toFixed(0)}\n\n` +
          'Set this up in **Settings → Budgets**.',
        data: { category: categoryName, limit },
      };
    }
  }

  private async handleAttachReceipt(): Promise<{ action: string; message: string; data?: any }> {
    return {
      action: 'attach_receipt',
      message:
        '📎 **Attach Receipt**\n\n' +
        'To attach a receipt to your last expense:\n' +
        '1. Find the transaction in **Recent Transactions**\n' +
        '2. Tap on it to open details\n' +
        '3. Tap **Add Receipt**\n' +
        '4. Take a photo or upload from gallery\n\n' +
        '💡 Receipts help you track warranty info and tax deductions!',
      data: null,
    };
  }

  private async handleGeneralChat(
    userId: string,
    prompt: string,
  ): Promise<{ action: string; message: string; data?: any }> {
    const stats = await this.getMonthlyStats(userId).catch(() => null);
    const groupCount = await this.prisma.sharedGroup
      .count({ where: { createdBy: userId, status: 'ACTIVE' } })
      .catch(() => 0);
    const goalCount = await this.prisma.goal
      .count({ where: { userId, deletedAt: null } })
      .catch(() => 0);

    const hasData = stats && stats.income > 0;

    const suggestions = [
      hasData ? '📊 "Summarize my last 30 days"' : '➕ "Add expense: Coffee $4.50"',
      '📊 "Create spending groups (Food, Transport, Entertainment)"',
      '📈 "Show me where I can save money"',
      '📅 "Create group: Monthly Rent with Roommates"',
      '🔔 "Set budget alert for Dining when over $200"',
    ];

    return {
      action: 'chat',
      message:
        `🤖 **Dabbu AI**\n\n` +
        (hasData
          ? `You have **${stats!.expense > 0 ? 'spent ₹' + stats!.expense.toLocaleString('en-IN') : 'no recent expenses'}** this month${groupCount > 0 ? ` across **${groupCount} spaces**` : ''}${goalCount > 0 ? ` and **${goalCount} goals**` : ''}.\n\n`
          : `Welcome to Dabbu! I'm your financial assistant. I can help you manage your money smarter.\n\n`) +
        '**Try asking:**\n' +
        suggestions.map((s) => `  • ${s}`).join('\n'),
      data: { stats, groupCount, goalCount },
    };
  }

  private async getMonthlyStats(userId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const txns = await this.prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: monthStart },
        deletedAt: null,
        ...(await this.lensWhere(userId)),
      },
      select: { amount: true, type: true, category: { select: { name: true } } },
    });

    const income = txns
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + Number(t.amount), 0);
    const expense = txns
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + Number(t.amount), 0);
    const savings = income - expense;
    const savingsRate = income > 0 ? (savings / income) * 100 : 0;

    const byCategory: Record<string, number> = {};
    for (const t of txns) {
      if (t.type === 'expense') {
        const cat = t.category?.name || 'Other';
        byCategory[cat] = (byCategory[cat] || 0) + Number(t.amount);
      }
    }
    const topCategories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

    return { income, expense, savings, savingsRate, topCategories };
  }

  private async callLlm(prompt: string): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const body: Record<string, any> = {
          model: this.model,
          prompt,
          stream: false,
          options: { temperature: 0.3, num_predict: 1024 },
        };

        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (this.apiKey) {
          headers['Authorization'] = `Bearer ${this.apiKey}`;
        }

        const res = await fetch(`${this.baseUrl}/api/generate`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error(`Ollama returned ${res.status}: ${await res.text()}`);
        }

        const json = await res.json();
        return json.response || '';
      } catch (err: any) {
        lastError = err;
        this.logger.warn(`AI call attempt ${attempt + 1} failed: ${err.message}`);
        if (attempt < this.maxRetries) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    }

    this.logger.error(`AI call failed after ${this.maxRetries + 1} attempts`, lastError!);
    return '';
  }

  private buildPrompt(section: string, context: Record<string, any>): string {
    const sectionPrompts: Record<string, string> = {
      dashboard: `You are a financial advisor. Analyze this user's financial data and generate 2-3 concise, actionable insights.
Return ONLY a JSON array of objects with fields: title (short), message (1 sentence), severity (info/success/warning/critical).

User Data:
${JSON.stringify(context, null, 2)}`,

      transactions: `You are a spending analyst. Analyze these transactions and return 2-3 insights about spending patterns, anomalies, or optimization opportunities.
Return ONLY a JSON array of objects with fields: title (short), message (1 sentence), severity (info/success/warning/critical).

Transaction Data:
${JSON.stringify(context, null, 2)}`,

      shared_finance: `You are a group finance mediator. Analyze this shared group's expense data and return 2-3 insights about fairness, settlement patterns, or group dynamics.
Return ONLY a JSON array of objects with fields: title (short), message (1 sentence), severity (info/success/warning/critical).

Group Data:
${JSON.stringify(context, null, 2)}`,

      goals: `You are a goal planning advisor. Analyze this user's savings goals and return 2-3 insights about feasibility, progress, or optimization.
Return ONLY a JSON array of objects with fields: title (short), message (1 sentence), severity (info/success/warning/critical).

Goals Data:
${JSON.stringify(context, null, 2)}`,

      budgets: `You are a budget analyst. Analyze this user's budget data and return 2-3 insights about spending vs budget, optimization, or alerts.
Return ONLY a JSON array of objects with fields: title (short), message (1 sentence), severity (info/success/warning/critical).

Budget Data:
${JSON.stringify(context, null, 2)}`,
    };

    return sectionPrompts[section] || sectionPrompts.dashboard;
  }

  private buildNarrativePrompt(section: string, context: Record<string, any>): string {
    const base = `You are a financial analyst. Generate a natural language analysis of this user's financial data.
Return ONLY a JSON object with fields: summary (2-3 sentences), highlights (array of strings), recommendations (array of strings), riskFlags (array of strings).`;

    return `${base}

Section: ${section}
Data:
${JSON.stringify(context, null, 2)}`;
  }

  private parseInsights(response: string, section: string): AiInsight[] {
    if (!response.trim()) {
      return [];
    }

    try {
      const parsed = JSON.parse(response);
      if (Array.isArray(parsed)) {
        return parsed.map((item: any) => ({
          type: 'ai_generated',
          section,
          title: item.title || 'AI Insight',
          message: item.message || '',
          severity: ['info', 'success', 'warning', 'critical'].includes(item.severity)
            ? item.severity
            : 'info',
          actionable: item.actionable ?? false,
          actionLabel: item.actionLabel,
          source: 'ai' as const,
        }));
      }
    } catch {
      this.logger.warn('Failed to parse AI response as JSON, returning raw text');
    }

    return [
      {
        type: 'ai_generated',
        section,
        title: 'AI Analysis',
        message: response.slice(0, 200),
        severity: 'info',
        source: 'ai',
      },
    ];
  }

  private parseNarrative(response: string): AiNarrative | null {
    if (!response.trim()) {
      return null;
    }

    try {
      const cleaned = response
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      const parsed = JSON.parse(cleaned);
      return {
        summary: parsed.summary || '',
        highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
        riskFlags: Array.isArray(parsed.riskFlags) ? parsed.riskFlags : [],
      };
    } catch {
      return {
        summary: response.slice(0, 300),
        highlights: [],
        recommendations: [],
        riskFlags: [],
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // AI 2.0 — INTELLIGENCE ENGINE METHODS
  // ═══════════════════════════════════════════════════════════════

  async getLatestDna(userId: string) {
    try {
      const dna = await this.prisma.financialDna.findFirst({
        where: { userId },
        orderBy: { computedAt: 'desc' },
      });
      if (dna) {
        return dna;
      }
      return this.computeFinancialDna(userId);
    } catch {
      return this.computeFinancialDna(userId);
    }
  }

  async computeFinancialDna(userId: string) {
    try {
      const [transactions, settlements, budgets, goals] = await Promise.all([
        this.prisma.transaction.findMany({
          where: { userId, deletedAt: null, ...(await this.lensWhere(userId)) },
          take: 200,
          orderBy: { date: 'desc' },
        }),
        this.prisma.settlement.findMany({
          where: { OR: [{ fromUserId: userId }, { toUserId: userId }] },
          take: 100,
        }),
        this.prisma.budget.findMany({
          where: { userId, deletedAt: null, ...(await this.lensWhere(userId)) },
        }),
        this.prisma.goal.findMany({
          where: { userId, deletedAt: null, ...(await this.lensWhere(userId)) },
        }),
      ]);

      const income = transactions
        .filter((t) => t.type === 'income')
        .reduce((s, t) => s + Number(t.amount), 0);
      const monthlyIncome =
        income > 0 ? income / Math.max(1, Math.ceil(transactions.length / 30)) : 0;

      const result = await this.dnaEngine.generateDna({
        transactions: transactions.map((t) => ({
          id: t.id,
          amount: Number(t.amount),
          description: t.description || '',
          category: t.categoryId || 'other',
          date: t.date,
          type: t.type as any,
        })),
        settlements: settlements.map((s) => ({
          id: s.id,
          from: s.fromUserId,
          to: s.toUserId,
          amount: Number(s.amount),
          date: s.createdAt,
          status: s.status,
        })),
        budgets: budgets.map((b) => ({
          id: b.id,
          category: b.categoryId || undefined,
          amount: Number(b.amount),
          spent: Number(b.spent || 0),
          period: b.period,
        })),
        goals: goals.map((g) => ({
          id: g.id,
          targetAmount: Number(g.targetAmount),
          currentAmount: Number(g.currentAmount || 0),
          deadline: g.deadline || undefined,
        })),
        accounts: [],
        monthlyIncome,
        userId,
      });

      await this.prisma.financialDna.upsert({
        where: { userId_weekStart: { userId, weekStart: new Date(result.weekStart) } },
        update: {
          ...result,
          weekStart: new Date(result.weekStart),
          weekEnd: new Date(result.weekEnd),
        },
        create: {
          userId,
          ...result,
          weekStart: new Date(result.weekStart),
          weekEnd: new Date(result.weekEnd),
        },
      });

      return result;
    } catch (error) {
      this.logger.error(`Financial DNA computation failed: ${(error as Error).message}`);
      return null;
    }
  }

  async predictEndOfMonth(userId: string) {
    try {
      const [transactions, goals] = await Promise.all([
        this.prisma.transaction.findMany({
          where: { userId, deletedAt: null, ...(await this.lensWhere(userId)) },
          take: 200,
          orderBy: { date: 'desc' },
        }),
        this.prisma.goal.findMany({
          where: { userId, deletedAt: null, ...(await this.lensWhere(userId)) },
        }),
      ]);

      const currentBalance = 0;
      const monthlyIncome = transactions
        .filter((t) => t.type === 'income')
        .reduce((s, t) => s + Number(t.amount), 0);

      const result = this.predictionEngine.predictEndOfMonth({
        transactions: transactions.map((t) => ({
          id: t.id,
          amount: Number(t.amount),
          description: t.description || '',
          category: t.categoryId || undefined,
          date: t.date,
          type: t.type as any,
        })),
        currentBalance,
        monthlyIncome: monthlyIncome > 0 ? monthlyIncome : 0,
      });

      const predictions = [
        {
          type: 'end_of_month_balance',
          predictedValue: result.endOfMonthBalance,
          confidence: result.confidence,
          message: `Projected month-end balance: ₹${Math.round(result.endOfMonthBalance).toLocaleString('en-IN')}`,
        },
        {
          type: 'expected_expenses',
          predictedValue: result.expectedExpenses,
          confidence: result.confidence,
        },
        {
          type: 'expected_savings',
          predictedValue: result.expectedSavings,
          confidence: result.confidence,
        },
      ];

      for (const p of predictions) {
        await this.prisma.aiPrediction.create({
          data: {
            userId,
            ...p,
            currentValue: currentBalance,
            validFrom: new Date(),
            validUntil: new Date(new Date().setMonth(new Date().getMonth() + 1)),
          },
        });
      }

      for (const overrun of result.budgetOverruns) {
        await this.prisma.aiPrediction.create({
          data: {
            userId,
            type: 'budget_overrun',
            category: overrun.category,
            predictedValue: overrun.overrunAmount,
            currentValue: overrun.spentSoFar,
            confidence: overrun.probability,
            message: `You may exceed your ${overrun.category} budget in ${overrun.daysUntilOverrun} days.`,
            validFrom: new Date(),
            validUntil: new Date(new Date().setMonth(new Date().getMonth() + 1)),
          },
        });
      }

      return result;
    } catch (error) {
      this.logger.error(`Prediction failed: ${(error as Error).message}`);
      return null;
    }
  }

  async detectAnomalies(userId: string) {
    try {
      const transactions = await this.prisma.transaction.findMany({
        where: { userId, deletedAt: null, type: 'expense', ...(await this.lensWhere(userId)) },
        take: 500,
        orderBy: { date: 'desc' },
      });

      const results = this.anomalyEngine.detectAll(
        transactions.map((t) => ({
          id: t.id,
          amount: Number(t.amount),
          description: t.description || '',
          category: t.categoryId || undefined,
          date: t.date,
          type: 'expense',
        })),
      );

      for (const r of results) {
        await this.prisma.aiAnomaly.create({
          data: {
            userId,
            type: r.type,
            category: r.category,
            description: r.description,
            severity: r.severity,
            actualValue: r.actualValue,
            expectedValue: r.expectedValue,
            deviationPct: r.deviationPct,
            transactionId: r.transactionId,
          },
        });
      }

      return results;
    } catch (error) {
      this.logger.error(`Anomaly detection failed: ${(error as Error).message}`);
      return [];
    }
  }

  async findSavingsOpportunities(userId: string) {
    try {
      const transactions = await this.prisma.transaction.findMany({
        where: { userId, deletedAt: null, type: 'expense', ...(await this.lensWhere(userId)) },
        take: 500,
        orderBy: { date: 'desc' },
      });

      const results = this.savingsEngine.detectAll(
        transactions.map((t) => ({
          id: t.id,
          amount: Number(t.amount),
          description: t.description || '',
          category: t.categoryId || undefined,
          date: t.date,
          type: 'expense',
        })),
      );

      for (const r of results) {
        await this.prisma.aiRecommendation.create({
          data: {
            userId,
            type: 'savings',
            title: r.title,
            description: r.description,
            impact: r.monthlySavings,
            priority: r.monthlySavings > 1000 ? 'high' : r.monthlySavings > 500 ? 'medium' : 'low',
            category: r.category,
            actionLabel: r.actionLabel,
            actionRoute: r.actionRoute,
          },
        });
      }

      return results;
    } catch (error) {
      this.logger.error(`Savings analysis failed: ${(error as Error).message}`);
      return [];
    }
  }

  async predictGoalCompletion(userId: string, goalId: string) {
    try {
      const goal = await this.prisma.goal.findUnique({ where: { id: goalId } });
      if (!goal) {
        return null;
      }

      const savingsTx = await this.prisma.transaction.findMany({
        where: { userId, deletedAt: null, ...(await this.lensWhere(userId)) },
        take: 200,
        orderBy: { date: 'desc' },
      });

      const result = this.goalEngine.predictGoalCompletion(
        {
          id: goal.id,
          name: goal.name,
          targetAmount: Number(goal.targetAmount),
          currentAmount: Number(goal.currentAmount || 0),
          deadline: goal.deadline || undefined,
          type: goal.type,
          monthlyContribution: Number(goal.monthlyContribution || 0),
          createdAt: goal.createdAt,
        },
        savingsTx.map((t) => ({
          id: t.id,
          amount: Number(t.amount),
          category: t.categoryId || undefined,
          date: t.date,
          type: t.type,
        })),
      );

      await this.prisma.goalPrediction.upsert({
        where: { userId_goalId: { userId, goalId } },
        update: {
          successProbability: result.successProbability,
          requiredMonthlyContribution: result.requiredMonthlyContribution,
          predictedCompletionDate: result.predictedCompletionDate || undefined,
          delayRisk: result.delayRisk,
          delayMonths: result.delayMonths,
          currentPace: result.currentPace,
          improvementTip: result.improvementTip,
        },
        create: {
          userId,
          goalId,
          successProbability: result.successProbability,
          requiredMonthlyContribution: result.requiredMonthlyContribution,
          predictedCompletionDate: result.predictedCompletionDate || undefined,
          delayRisk: result.delayRisk,
          delayMonths: result.delayMonths,
          currentPace: result.currentPace,
          improvementTip: result.improvementTip,
        },
      });

      return result;
    } catch (error) {
      this.logger.error(`Goal prediction failed: ${(error as Error).message}`);
      return null;
    }
  }

  async suggestGoalRebalancing(userId: string) {
    try {
      const [goals, transactions] = await Promise.all([
        this.prisma.goal.findMany({
          where: { userId, deletedAt: null, isCompleted: false, ...(await this.lensWhere(userId)) },
        }),
        this.prisma.transaction.findMany({
          where: { userId, deletedAt: null, ...(await this.lensWhere(userId)) },
          orderBy: { date: 'desc' },
          take: 500,
        }),
      ]);

      if (goals.length < 2) {
        return { suggestions: [] };
      }

      const now = new Date();
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

      const recentTxns = transactions.filter((t) => t.date >= threeMonthsAgo);
      const monthlyIncome =
        recentTxns.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0) / 3;
      const monthlyExpense =
        recentTxns.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0) /
        3;
      const monthlySurplus = Math.max(monthlyIncome - monthlyExpense, 0);

      const currentTotalContribution = goals.reduce(
        (s, g) => s + Number(g.monthlyContribution || 0),
        0,
      );
      const availableForGoals = monthlySurplus * 0.7;

      const scored = goals
        .map((g) => {
          const progress = Number(g.currentAmount || 0) / Number(g.targetAmount || 1);
          const deadlineDays = g.deadline
            ? Math.max((g.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24), 1)
            : 365;
          const urgency = 1 / deadlineDays;
          const need = Math.max(1 - progress, 0.1);
          const typeBoost = g.type === 'emergency' ? 2 : g.type === 'retirement' ? 1.5 : 1;
          const score = urgency * need * typeBoost * 100;
          return { goal: g, score, progress, urgency, need, typeBoost };
        })
        .sort((a, b) => b.score - a.score);

      const totalScore = scored.reduce((s, x) => s + x.score, 0) || 1;
      const currentPerGoal: Record<string, number> = {};
      const suggestedPerGoal: Record<string, number> = {};
      let allocated = 0;

      scored.forEach((s) => {
        const share = Math.round((s.score / totalScore) * availableForGoals);
        const current = Number(s.goal.monthlyContribution || 0);
        currentPerGoal[s.goal.id] = current;
        suggestedPerGoal[s.goal.id] = current + Math.round(share / 100) * 100;
        allocated += suggestedPerGoal[s.goal.id] - current;
      });

      const suggestions = scored
        .filter((s) => {
          const diff = suggestedPerGoal[s.goal.id] - currentPerGoal[s.goal.id];
          return Math.abs(diff) >= 100;
        })
        .map((s) => {
          const diff = suggestedPerGoal[s.goal.id] - currentPerGoal[s.goal.id];
          const action = diff > 0 ? 'increase' : 'reduce';
          return {
            goalId: s.goal.id,
            goalName: s.goal.name,
            goalIcon: s.goal.icon || 'flag',
            goalColor: s.goal.color || '#7C3AED',
            currentContribution: currentPerGoal[s.goal.id],
            suggestedContribution: Math.max(suggestedPerGoal[s.goal.id], 0),
            diff: Math.abs(diff),
            action,
            reason:
              action === 'increase'
                ? urgencyText(s.urgency) + needText(s.need)
                : 'Contributions could be redirected to higher-priority goals',
          };
        });

      return { suggestions, monthlySurplus: Math.round(monthlySurplus), totalGoals: goals.length };
    } catch (error) {
      this.logger.error(`Goal rebalancing failed: ${(error as Error).message}`);
      return { suggestions: [] };
    }
  }

  async computeHealthScore(userId: string) {
    try {
      const [transactions, budgets, bills, goals, settlements] = await Promise.all([
        this.prisma.transaction.findMany({
          where: { userId, deletedAt: null, ...(await this.lensWhere(userId)) },
          take: 500,
          orderBy: { date: 'desc' },
        }),
        this.prisma.budget.findMany({
          where: { userId, deletedAt: null, ...(await this.lensWhere(userId)) },
        }),
        this.prisma.bill.findMany({
          where: { userId, deletedAt: null, ...(await this.lensWhere(userId)) },
        }),
        this.prisma.goal.findMany({
          where: { userId, deletedAt: null, ...(await this.lensWhere(userId)) },
        }),
        this.prisma.settlement.findMany({
          where: { OR: [{ fromUserId: userId }, { toUserId: userId }] },
        }),
      ]);

      const income = transactions
        .filter((t) => t.type === 'income')
        .reduce((s, t) => s + Number(t.amount), 0);
      const monthlyIncome =
        income > 0 ? income / Math.max(1, Math.ceil(transactions.length / 30)) : 0;

      const previousScore = await this.prisma.aiScore.findFirst({
        where: { userId, periodType: 'monthly' },
        orderBy: { computedAt: 'desc' },
      });

      const result = await this.health2Engine.calculateScore({
        transactions: transactions.map((t) => ({
          id: t.id,
          amount: Number(t.amount),
          category: t.categoryId || undefined,
          date: t.date,
          type: t.type,
        })),
        budgets: budgets.map((b) => ({
          id: b.id,
          category: b.categoryId || b.name,
          amount: Number(b.amount),
          spent: Number(b.spent || 0),
          period: b.period,
        })),
        bills: bills.map((b) => ({
          id: b.id,
          name: b.name,
          amount: Number(b.amount),
          dueDate: b.dueDate,
          isPaid: b.isPaid,
          paidDate: b.paidDate || undefined,
        })),
        goals: goals.map((g) => ({
          id: g.id,
          name: g.name,
          targetAmount: Number(g.targetAmount),
          currentAmount: Number(g.currentAmount || 0),
          deadline: g.deadline || undefined,
        })),
        settlements: settlements.map((s) => ({
          id: s.id,
          from: s.fromUserId,
          to: s.toUserId,
          amount: Number(s.amount),
          date: s.createdAt,
          status: s.status,
        })),
        accounts: [],
        monthlyIncome,
        previousScore: previousScore?.overallScore,
      });

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      await this.prisma.aiScore.upsert({
        where: {
          userId_periodType_periodStart: { userId, periodType: 'monthly', periodStart: monthStart },
        },
        update: {
          overallScore: result.overallScore,
          savingsRate: result.components.savingsRate,
          debtRatio: result.components.debtRatio,
          budgetDiscipline: result.components.budgetDiscipline,
          goalProgress: result.components.goalProgress,
          billConsistency: result.components.billConsistency,
          emergencyFund: result.components.emergencyFund,
          monthlyChange: result.monthlyChange,
          previousScore: result.previousScore,
          financialLevel: result.financialLevel,
          periodEnd: monthEnd,
        },
        create: {
          userId,
          overallScore: result.overallScore,
          savingsRate: result.components.savingsRate,
          debtRatio: result.components.debtRatio,
          budgetDiscipline: result.components.budgetDiscipline,
          goalProgress: result.components.goalProgress,
          billConsistency: result.components.billConsistency,
          emergencyFund: result.components.emergencyFund,
          monthlyChange: result.monthlyChange,
          previousScore: result.previousScore,
          financialLevel: result.financialLevel,
          periodType: 'monthly',
          periodStart: monthStart,
          periodEnd: monthEnd,
        },
      });

      return result;
    } catch (error) {
      this.logger.error(`Health score computation failed: ${(error as Error).message}`);
      return null;
    }
  }

  async generateSmartDashboard(userId: string) {
    try {
      const [insightCount, anomalyCount, recCount, bills, goals] = await Promise.all([
        this.prisma.aiInsight.count({ where: { userId, isRead: false, isDismissed: false } }),
        this.prisma.aiAnomaly.count({ where: { userId, isResolved: false } }),
        this.prisma.aiRecommendation.count({
          where: { userId, isImplemented: false, isDismissed: false },
        }),
        this.prisma.bill.findMany({
          where: { userId, deletedAt: null, isPaid: false, ...(await this.lensWhere(userId)) },
          take: 10,
        }),
        this.prisma.goal.findMany({
          where: { userId, deletedAt: null, ...(await this.lensWhere(userId)) },
          take: 10,
        }),
      ]);

      if (anomalyCount === 0) {
        await this.detectAnomalies(userId).catch(() => {});
      }
      if (recCount === 0) {
        await this.findSavingsOpportunities(userId).catch(() => {});
      }

      const [insights, anomalies, recommendations, pendingSettlements, latestScore, latestDna] =
        await Promise.all([
          this.prisma.aiInsight.findMany({
            where: { userId, isRead: false, isDismissed: false },
            take: 10,
            orderBy: { createdAt: 'desc' },
          }),
          this.prisma.aiAnomaly.findMany({
            where: { userId, isResolved: false },
            take: 5,
            orderBy: { detectedAt: 'desc' },
          }),
          this.prisma.aiRecommendation.findMany({
            where: { userId, isImplemented: false, isDismissed: false },
            take: 5,
          }),
          this.prisma.settlement.count({
            where: {
              OR: [{ fromUserId: userId }, { toUserId: userId }],
              status: { not: 'completed' },
            },
          }),
          this.prisma.aiScore.findFirst({ where: { userId }, orderBy: { computedAt: 'desc' } }),
          this.prisma.financialDna.findFirst({
            where: { userId },
            orderBy: { computedAt: 'desc' },
          }),
        ]);

      const hasSettlements = pendingSettlements > 0;
      const healthScore = latestScore?.overallScore ?? 0;

      const context = {
        userId,
        hasUpcomingBills: bills.length > 0,
        hasBudgetOverspend: insights.some((i) => i.type === 'budget_alert'),
        hasSavingsOpportunities: recommendations.length > 0,
        hasGoalMilestone: goals.some((g) => Number(g.currentAmount || 0) > 0),
        hasAnomalies: anomalies.length > 0,
        hasFamilyData: false,
        hasCoupleData: false,
        hasSettlements,
        financialDna: latestDna
          ? { spendingPersonality: latestDna.spendingPersonality || '' }
          : undefined,
        healthScore,
        dailyLoginCount: 1,
      };

      const layout = this.dashboardEngine.generateDailyDashboard(context);

      await this.prisma.dashboardAiCard.deleteMany({ where: { userId, isActive: true } });
      for (const card of layout.cards) {
        await this.prisma.dashboardAiCard.create({
          data: {
            userId,
            widgetType: card.widgetType,
            title: card.title,
            description: card.description,
            priority: card.priority,
            widgetSize: card.widgetSize,
            icon: card.icon,
            actionLabel: card.actionLabel,
            actionRoute: card.actionRoute,
            metadata: (card.metadata || undefined) as any,
          },
        });
      }

      return layout;
    } catch (error) {
      this.logger.error(`Dashboard generation failed: ${(error as Error).message}`);
      return null;
    }
  }

  async detectLifeEvents(userId: string) {
    try {
      const transactions = await this.prisma.transaction.findMany({
        where: { userId, deletedAt: null, ...(await this.lensWhere(userId)) },
        take: 500,
        orderBy: { date: 'desc' },
      });

      const results = this.lifeEventEngine.detectAll(
        transactions.map((t) => ({
          id: t.id,
          amount: Number(t.amount),
          description: t.description || '',
          category: t.categoryId || undefined,
          date: t.date,
          type: t.type,
        })),
      );

      for (const r of results) {
        const existing = await this.prisma.lifeEvent.findFirst({
          where: { userId, eventType: r.eventType, isDismissed: false },
        });
        if (!existing) {
          await this.prisma.lifeEvent.create({
            data: {
              userId,
              eventType: r.eventType,
              title: r.title,
              description: r.description,
              confidence: r.confidence,
              eventDate: r.eventDate ? new Date(r.eventDate) : undefined,
              metadata: (r.metadata || undefined) as any,
            },
          });
        }
      }

      return results;
    } catch (error) {
      this.logger.error(`Life event detection failed: ${(error as Error).message}`);
      return [];
    }
  }

  async suggestCategory(description: string, userId: string) {
    try {
      const mappings = await this.prisma.smartCategoryMapping.findMany({ where: { userId } });
      const engineMappings = mappings.map((m) => ({
        originalText: m.originalText,
        correctedCategory: m.correctedCategory,
        confidence: m.confidence,
        timesCorrected: m.timesCorrected,
        lastCorrectedAt: m.lastCorrectedAt,
        isAuto: m.isAuto,
      }));
      return this.categoryEngine.suggestCategory(description, engineMappings);
    } catch (error) {
      this.logger.error(`Category suggestion failed: ${(error as Error).message}`);
      return null;
    }
  }

  async recordCategoryCorrection(originalText: string, correctedCategory: string, userId: string) {
    try {
      const existing = await this.prisma.smartCategoryMapping.findUnique({
        where: { userId_originalText: { userId, originalText } },
      });

      const existingMappings = existing
        ? [
            {
              originalText: existing.originalText,
              correctedCategory: existing.correctedCategory,
              confidence: existing.confidence,
              timesCorrected: existing.timesCorrected,
              lastCorrectedAt: existing.lastCorrectedAt,
              isAuto: existing.isAuto,
            },
          ]
        : [];

      const result = this.categoryEngine.recordCorrection(existingMappings, {
        originalText,
        correctedCategory,
        timestamp: new Date(),
      });

      await this.prisma.smartCategoryMapping.upsert({
        where: { userId_originalText: { userId, originalText } },
        update: {
          correctedCategory: result.correctedCategory,
          confidence: result.confidence,
          timesCorrected: result.timesCorrected,
          isAuto: result.isAuto,
        },
        create: {
          userId,
          originalText,
          correctedCategory: result.correctedCategory,
          confidence: result.confidence,
          timesCorrected: result.timesCorrected,
          isAuto: result.isAuto,
        },
      });

      return result;
    } catch (error) {
      this.logger.error(`Category correction failed: ${(error as Error).message}`);
      return null;
    }
  }

  async optimizeSettlements(groupId: string) {
    try {
      const [expenses, settlements] = await Promise.all([
        this.prisma.sharedExpense.findMany({ where: { groupId }, include: { splits: true } }),
        this.prisma.settlement.findMany({ where: { groupId } }),
      ]);

      const memberIds = new Set<string>();
      expenses.forEach((e) => {
        memberIds.add(e.paidBy);
        e.splits.forEach((s) => memberIds.add(s.userId));
      });
      settlements.forEach((s) => {
        memberIds.add(s.fromUserId);
        memberIds.add(s.toUserId);
      });

      const users = await this.prisma.user.findMany({
        where: { id: { in: Array.from(memberIds) } },
        select: { id: true, firstName: true, lastName: true },
      });
      const getName = (id: string) => {
        const u = users.find((u) => u.id === id);
        return u ? `${u.firstName} ${u.lastName}`.trim() : id;
      };

      const balances = this.settlementEngine.calculateBalances(
        expenses.map((e) => ({
          paidBy: e.paidBy,
          amount: Number(e.amount),
          splits: e.splits.map((s) => ({ memberId: s.userId, amount: Number(s.amount) })),
        })),
        settlements.map((s) => ({
          from: s.fromUserId,
          to: s.toUserId,
          amount: Number(s.amount),
          status: s.status,
        })),
      );
      const result = this.settlementEngine.optimizeSettlements(balances);

      const suggestion = await this.prisma.settlementSuggestion.create({
        data: {
          groupId,
          originalTxCount: result.originalTxCount,
          optimizedTxCount: result.optimizedTxCount,
          totalAmount: result.totalAmount,
          savingsTxCount: result.savingsTxCount,
          suggestion: result.transactions.map((t) => ({
            from: t.from,
            fromName: getName(t.from),
            to: t.to,
            toName: getName(t.to),
            amount: t.amount,
          })),
        },
      });

      return suggestion;
    } catch (error) {
      this.logger.error(`Settlement optimization failed: ${(error as Error).message}`);
      return null;
    }
  }

  async checkMilestones(userId: string) {
    try {
      const [goals, transactions, settlements, streaks] = await Promise.all([
        this.prisma.goal.findMany({
          where: { userId, deletedAt: null, ...(await this.lensWhere(userId)) },
        }),
        this.prisma.transaction.findMany({
          where: { userId, deletedAt: null, ...(await this.lensWhere(userId)) },
          take: 500,
        }),
        this.prisma.settlement.findMany({
          where: { OR: [{ fromUserId: userId }, { toUserId: userId }] },
          take: 100,
        }),
        this.prisma.userStreak.findMany({ where: { userId } }),
      ]);

      const results = this.joyEngine.checkAll(
        goals.map((g) => ({
          id: g.id,
          name: g.name,
          targetAmount: Number(g.targetAmount),
          currentAmount: Number(g.currentAmount || 0),
          type: g.type,
          isCompleted: g.isCompleted || false,
          completedAt: g.completedAt || undefined,
        })),
        transactions.map((t) => ({
          id: t.id,
          amount: Number(t.amount),
          category: t.categoryId || undefined,
          date: t.date,
          type: t.type,
        })),
        settlements.map((s) => ({
          id: s.id,
          from: s.fromUserId,
          to: s.toUserId,
          amount: Number(s.amount),
          date: s.createdAt,
          status: s.status,
        })),
        streaks.map((s) => ({
          id: s.id,
          streakType: s.streakType,
          type: s.streakType,
          currentStreak: s.currentStreak || 0,
          bestStreak: s.longestStreak || 0,
          updatedAt: s.updatedAt,
        })),
      );

      for (const r of results) {
        const existing = await this.prisma.aiMilestone.findFirst({
          where: { userId, milestoneType: r.milestoneType, isAchieved: true },
        });
        if (!existing) {
          await this.prisma.aiMilestone.create({
            data: {
              userId,
              milestoneType: r.milestoneType,
              title: r.title,
              description: r.description,
              icon: r.icon,
              animation: r.animation || undefined,
              value: r.value,
              isAchieved: r.isAchieved,
              achievedAt: r.isAchieved ? new Date() : undefined,
            },
          });
        }
      }

      return results;
    } catch (error) {
      this.logger.error(`Milestone check failed: ${(error as Error).message}`);
      return [];
    }
  }

  async computeAllForUser(userId: string) {
    const [dna, health, predictions, anomalies, savings, milestones] = await Promise.all([
      this.computeFinancialDna(userId).catch(() => null),
      this.computeHealthScore(userId).catch(() => null),
      this.predictEndOfMonth(userId).catch(() => null),
      this.detectAnomalies(userId).catch(() => []),
      this.findSavingsOpportunities(userId).catch(() => []),
      this.checkMilestones(userId).catch(() => []),
    ]);
    return { dna, health, predictions, anomalies, savings, milestones };
  }

  async computeDailyForUser(userId: string) {
    const [anomalies, dashboard, milestones, feed] = await Promise.all([
      this.detectAnomalies(userId).catch(() => []),
      this.generateSmartDashboard(userId).catch(() => null),
      this.checkMilestones(userId).catch(() => []),
      this.generateTodayFeed(userId).catch(() => null),
    ]);
    return { anomalies, dashboard, milestones, feed };
  }

  async generateDailyPushNotificationsForUser(userId: string) {
    if (!this.enabled) {
      return;
    }

    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const [settings, todayTx, weekTx, monthTx, budgets, goals, anomalies, milestones] =
        await Promise.all([
          this.prisma.settings.findUnique({ where: { userId } }),
          this.prisma.transaction.aggregate({
            where: {
              userId,
              date: { gte: todayStart },
              type: 'expense',
              deletedAt: null,
              ...(await this.lensWhere(userId)),
            },
            _sum: { amount: true },
            _count: true,
          }),
          this.prisma.transaction.findMany({
            where: {
              userId,
              date: { gte: weekAgo },
              type: 'expense',
              deletedAt: null,
              ...(await this.lensWhere(userId)),
            },
            select: { amount: true, description: true, date: true },
            orderBy: { date: 'desc' },
            take: 20,
          }),
          this.prisma.transaction.aggregate({
            where: {
              userId,
              date: { gte: monthStart },
              type: 'expense',
              deletedAt: null,
              ...(await this.lensWhere(userId)),
            },
            _sum: { amount: true },
          }),
          this.prisma.budget.findMany({
            where: { userId, isActive: true, ...(await this.lensWhere(userId)) },
            select: { name: true, amount: true, spent: true },
          }),
          this.prisma.goal.findMany({
            where: { userId, deletedAt: null, ...(await this.lensWhere(userId)) },
            select: {
              id: true,
              name: true,
              targetAmount: true,
              currentAmount: true,
              deadline: true,
            },
          }),
          this.prisma.aiAnomaly.findMany({
            where: { userId, createdAt: { gte: weekAgo } },
            orderBy: { severity: 'desc' },
            take: 3,
          }),
          this.prisma.aiMilestone.findMany({
            where: { userId, createdAt: { gte: weekAgo } },
            take: 3,
          }),
        ]);

      if (settings && settings.pushNotifications === false) {
        return;
      }
      if (
        !settings &&
        todayTx._count === 0 &&
        weekTx.length === 0 &&
        budgets.length === 0 &&
        goals.length === 0
      ) {
        return;
      }

      const anomaliesSummary = anomalies.map((a) => ({
        type: a.type,
        description: a.description,
        severity: a.severity,
        actualValue: Number(a.actualValue),
        expectedValue: Number(a.expectedValue),
      }));
      const milestonesSummary = milestones.map((m) => ({
        type: m.milestoneType,
        title: m.title,
        description: m.description,
      }));

      const context = {
        todaySpent: Number(todayTx._sum.amount || 0),
        todayTxCount: todayTx._count,
        monthSpent: Number(monthTx._sum.amount || 0),
        recentTransactions: weekTx.map((t) => ({
          amount: Number(t.amount),
          description: t.description,
        })),
        budgets: budgets.map((b) => ({
          name: b.name,
          budget: Number(b.amount),
          spent: Number(b.spent),
          usagePercent:
            Number(b.amount) > 0 ? Math.round((Number(b.spent) / Number(b.amount)) * 100) : 0,
        })),
        goals: goals.map((g) => ({
          name: g.name,
          target: Number(g.targetAmount),
          saved: Number(g.currentAmount),
          progressPercent:
            Number(g.targetAmount) > 0
              ? Math.round((Number(g.currentAmount) / Number(g.targetAmount)) * 100)
              : 0,
          deadline: g.deadline?.toISOString()?.split('T')[0],
        })),
        anomalies: anomaliesSummary,
        milestones: milestonesSummary,
      };

      const prompt = `You are a friendly financial companion. Generate 1-2 short, personalized push notifications for this user based on their data.
Rules:
- Each notification must be a single sentence under 120 characters
- Mix of insights, encouragement, gentle nudges, and useful tips
- Never repeat the same type of notification daily
- Be specific using their actual numbers
- Use casual, warm tone (not robotic)
- If data is minimal, generate a single general tip

Return ONLY a JSON array of objects with fields: title (4-6 words) and message (1 sentence, under 120 chars).

User Data:
${JSON.stringify(context, null, 2)}`;

      const response = await this.callLlm(prompt);
      if (!response.trim()) {
        return;
      }

      let notifications: { title: string; message: string }[];
      try {
        const cleaned = response
          .replace(/```json\s*/g, '')
          .replace(/```\s*/g, '')
          .trim();
        notifications = JSON.parse(cleaned);
        if (!Array.isArray(notifications)) {
          notifications = [notifications];
        }
      } catch {
        this.logger.warn(`Failed to parse AI push notification response for user ${userId}`);
        return;
      }

      for (const n of notifications) {
        if (!n.title || !n.message) {
          continue;
        }
        this.notificationService
          .sendPush(userId, n.title.trim(), n.message.trim(), {
            type: 'ai_insight',
            source: 'ai_daily',
          })
          .catch((err) => this.logger.error(`Push failed for AI notification: ${err.message}`));
      }
    } catch (err: any) {
      this.logger.error(`AI push notifications failed for user ${userId}: ${err.message}`);
    }
  }

  async computeWeeklyForUser(userId: string) {
    const [dna, predictions, savings, lifeEvents] = await Promise.all([
      this.computeFinancialDna(userId).catch(() => null),
      this.predictEndOfMonth(userId).catch(() => null),
      this.findSavingsOpportunities(userId).catch(() => []),
      this.detectLifeEvents(userId).catch(() => []),
    ]);
    return { dna, predictions, savings, lifeEvents };
  }

  async computeMonthlyForUser(userId: string) {
    const [health, goals] = await Promise.all([
      this.computeHealthScore(userId).catch(() => null),
      Promise.all(
        (
          await this.prisma.goal.findMany({
            where: { userId, deletedAt: null, ...(await this.lensWhere(userId)) },
            select: { id: true },
          })
        ).map((g) => this.predictGoalCompletion(userId, g.id).catch(() => null)),
      ).catch(() => []),
    ]);
    return { health, goals };
  }

  // ═══════════════════════════════════════════════════════════════
  // AI TODAY FEED
  // ═══════════════════════════════════════════════════════════════

  async generateTodayFeed(userId: string) {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      const [
        transactions,
        budgets,
        goals,
        bills,
        precomputedAnomalies,
        precomputedPredictions,
        precomputedSavings,
        goalPredictions,
        settlementOpts,
        milestones,
        lifeEvents,
      ] = await Promise.all([
        this.prisma.transaction.findMany({
          where: {
            userId,
            deletedAt: null,
            date: { gte: ninetyDaysAgo },
            ...(await this.lensWhere(userId)),
          },
          take: 2000,
        }),
        this.prisma.budget.findMany({
          where: { userId, deletedAt: null, ...(await this.lensWhere(userId)) },
        }),
        this.prisma.goal.findMany({
          where: { userId, deletedAt: null, ...(await this.lensWhere(userId)) },
        }),
        this.prisma.bill
          .findMany({ where: { userId, deletedAt: null, ...(await this.lensWhere(userId)) } })
          .catch(() => []),
        this.prisma.aiAnomaly.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
        this.prisma.aiPrediction.findMany({
          where: { userId, status: { not: 'completed' } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
        this.prisma.aiRecommendation.findMany({
          where: { userId, isDismissed: false },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
        this.prisma.goalPrediction
          .findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 10 })
          .catch(() => []),
        this.prisma.settlementSuggestion
          .findMany({ orderBy: { createdAt: 'desc' }, take: 5 })
          .catch(() => []),
        this.prisma.aiMilestone.findMany({
          where: { userId, isAchieved: true },
          orderBy: { achievedAt: 'desc' },
          take: 10,
        }),
        this.prisma.lifeEvent
          .findMany({ where: { userId }, orderBy: { eventDate: 'desc' }, take: 10 })
          .catch(() => []),
      ]);

      const [coupleIntel, familyIntel] = await Promise.all([
        this.prisma.coupleIntelligence
          .findFirst({
            where: { coupleProfile: { OR: [{ partner1Id: userId }, { partner2Id: userId }] } },
            orderBy: { computedAt: 'desc' },
          })
          .catch(() => null),
        this.prisma.familyIntelligence
          .findFirst({
            where: { family: { members: { some: { userId } } } },
            orderBy: { computedAt: 'desc' },
          })
          .catch(() => null),
      ]);

      const rawTx = transactions.map((t) => ({
        id: t.id,
        amount: Number(t.amount),
        category: t.categoryId || undefined,
        description: t.description || undefined,
        date: t.date,
        type: t.type as 'income' | 'expense',
        merchantName: t.description || undefined,
      }));
      const rawBudgets = budgets.map((b) => ({
        id: b.id,
        name: b.name,
        amount: Number(b.amount),
        spent: Number(b.spent || 0),
        category: b.categoryId || undefined,
        periodStart: b.startDate,
        periodEnd: b.endDate,
      }));
      const rawGoals = goals.map((g) => ({
        id: g.id,
        name: g.name,
        targetAmount: Number(g.targetAmount),
        currentAmount: Number(g.currentAmount || 0),
        deadline: g.deadline || undefined,
        type: g.type,
        isCompleted: g.isCompleted || false,
      }));
      const rawBills = (bills || []).map((b: any) => ({
        id: b.id,
        name: b.name,
        amount: Number(b.amount),
        dueDate: b.dueDate,
        isPaid: b.isPaid || false,
        category: b.category || undefined,
      }));

      const settlements = await this.prisma.settlement.findMany({
        where: { OR: [{ fromUserId: userId }, { toUserId: userId }] },
        take: 100,
      });
      const rawSettlements = settlements.map((s) => ({
        id: s.id,
        from: s.fromUserId,
        to: s.toUserId,
        amount: Number(s.amount),
        date: s.createdAt,
        status: s.status,
      }));

      const feedCards = this.feedEngine.generate({
        userId,
        transactions: rawTx,
        budgets: rawBudgets,
        goals: rawGoals,
        settlements: rawSettlements,
        accounts: [],
        groupExpenses: [],
        subscriptions: [],
        bills: rawBills,
        precomputed: {
          anomalies: precomputedAnomalies.map((a) => ({
            id: a.id,
            type: a.type,
            category: a.category,
            description: a.description,
            severity: a.severity,
            actualValue: Number(a.actualValue),
            expectedValue: Number(a.expectedValue),
            deviationPct: Number(a.deviationPct),
            transactionId: a.transactionId,
          })),
          predictions: precomputedPredictions.map((p) => ({
            id: p.id,
            type: p.type,
            message: p.message,
            predictedValue: Number(p.predictedValue),
            currentValue: Number(p.currentValue),
            confidence: p.confidence,
            status: p.status,
          })),
          savingsOpportunities: precomputedSavings.map((s) => ({
            id: s.id,
            type: s.type,
            title: s.title,
            description: s.description,
            monthlySavings: Number(s.impact || 0),
            confidenceScore: s.priority === 'high' ? 85 : 70,
            actionType: 'view_savings',
            actionPayload: { recommendationId: s.id },
          })),
          goalPredictions: goalPredictions.map((gp) => ({
            goalId: gp.goalId,
            delayRisk: gp.delayRisk,
            delayMonths: gp.delayMonths,
            improvementTip: gp.improvementTip,
            successProbability: gp.successProbability,
            requiredMonthlyContribution: gp.requiredMonthlyContribution,
          })),
          settlementOptimizations: settlementOpts.map((so) => ({
            groupId: so.groupId,
            originalTxCount: so.originalTxCount,
            optimizedTxCount: so.optimizedTxCount,
            totalAmount: Number(so.totalAmount || 0),
          })),
          coupleIntelligence: coupleIntel
            ? {
                healthScore: coupleIntel.compatibilityScore,
                monthlyChange: 0,
                topImprovement:
                  (coupleIntel.recommendations as any[])?.[0]?.toString() || undefined,
              }
            : undefined,
          familyIntelligence: familyIntel
            ? {
                healthScore: familyIntel.healthScore,
                topImprovement: undefined,
              }
            : undefined,
          milestones: milestones.map((m) => ({
            id: m.id,
            title: m.title,
            description: m.description,
            milestoneType: m.milestoneType,
            isAchieved: m.isAchieved,
            achievedAt: m.achievedAt,
            value: m.value,
          })),
          lifeEvents: lifeEvents.map((e) => ({
            id: e.id,
            eventType: e.eventType,
            title: e.title,
            description: e.description,
            confidence: e.confidence,
            eventDate: e.eventDate,
          })),
        },
      });

      const existingCards = await this.prisma.aiFeedCard.findMany({
        where: { userId, createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
        select: { id: true },
      });

      if (existingCards.length > 0) {
        await this.prisma.aiFeedCard.deleteMany({
          where: { id: { in: existingCards.map((c) => c.id) } },
        });
      }

      if (feedCards.length > 0) {
        await this.prisma.aiFeedCard.createMany({
          data: feedCards.map((card) => ({
            userId,
            type: card.type,
            priority: card.priority,
            title: card.title,
            message: card.message,
            impactValue: card.impactValue || null,
            confidenceScore: card.confidenceScore || null,
            category: card.category,
            actionType: card.actionType || null,
            actionPayload: (card.actionPayload || null) as any,
            metadata: (card.metadata || null) as any,
            expiresAt: card.expiresAt || new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          })),
        });
      }

      this.logger.log(`Generated ${feedCards.length} feed cards for user ${userId}`);
      return { count: feedCards.length };
    } catch (error) {
      this.logger.error(`Feed generation failed for user ${userId}: ${(error as Error).message}`);
      return null;
    }
  }

  async getTodayFeed(userId: string) {
    try {
      const cards = await this.prisma.aiFeedCard.findMany({
        where: { userId, isDismissed: false },
        orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
        take: 50,
      });
      return {
        userId,
        generatedAt: new Date().toISOString(),
        feed: cards.map((c) => ({
          id: c.id,
          userId: c.userId,
          type: c.type,
          priority: c.priority,
          title: c.title,
          message: c.message,
          impactValue: c.impactValue,
          confidenceScore: c.confidenceScore,
          category: c.category,
          actionType: c.actionType,
          actionPayload: c.actionPayload as Record<string, any> | null,
          metadata: c.metadata as Record<string, any> | null,
          isRead: c.isRead,
          isDismissed: c.isDismissed,
          createdAt: c.createdAt.toISOString(),
          expiresAt: c.expiresAt?.toISOString() || null,
          readAt: c.readAt?.toISOString() || null,
        })),
      };
    } catch (error) {
      this.logger.error(`Get today feed failed: ${(error as Error).message}`);
      return { userId, generatedAt: new Date().toISOString(), feed: [] };
    }
  }

  async getFeedSummary(userId: string) {
    try {
      const cards = await this.prisma.aiFeedCard.findMany({
        where: { userId, isDismissed: false },
        select: { type: true, priority: true, impactValue: true },
      });

      const totalInsightsToday = cards.length;
      const riskAlerts = cards.filter(
        (c) => c.priority === 'critical' || c.priority === 'high',
      ).length;
      const savingsPotential = cards
        .filter((c) => c.type === 'savings_opportunity' && c.impactValue)
        .reduce((s, c) => s + Number(c.impactValue || 0), 0);
      const goalUpdates = cards.filter((c) => c.type === 'goal_update').length;

      const priorityOrder = ['critical', 'high', 'medium', 'low'] as const;
      let topPriority: string | null = null;
      for (const p of priorityOrder) {
        if (cards.some((c) => c.priority === p)) {
          const match = cards.find((c) => c.priority === p);
          topPriority = match?.type || null;
          break;
        }
      }

      return { totalInsightsToday, savingsPotential, riskAlerts, goalUpdates, topPriority };
    } catch (error) {
      this.logger.error(`Feed summary failed: ${(error as Error).message}`);
      return {
        totalInsightsToday: 0,
        savingsPotential: 0,
        riskAlerts: 0,
        goalUpdates: 0,
        topPriority: null,
      };
    }
  }

  async markFeedCardRead(cardId: string, userId: string) {
    try {
      await this.prisma.aiFeedCard.updateMany({
        where: { id: cardId, userId },
        data: { isRead: true, readAt: new Date() },
      });
      return { success: true };
    } catch (error) {
      this.logger.error(`Mark feed card read failed: ${(error as Error).message}`);
      return { success: false };
    }
  }

  async markFeedCardDismissed(cardId: string, userId: string) {
    try {
      await this.prisma.aiFeedCard.updateMany({
        where: { id: cardId, userId },
        data: { isDismissed: true },
      });
      return { success: true };
    } catch (error) {
      this.logger.error(`Mark feed card dismissed failed: ${(error as Error).message}`);
      return { success: false };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SMART OCR + PREMIUM AI FEATURES
  // ═══════════════════════════════════════════════════════════════

  async analyzeReceiptOcr(rawText: string, merchantHint?: string): Promise<any> {
    try {
      const aiGenerate = async (prompt: string) => {
        const response = await this.callLlm(prompt);
        return response;
      };

      const result = await this.ocrEngine.analyzeReceiptOcr({
        rawText,
        merchantHint,
        aiEnabled: this.enabled,
        aiGenerate: this.enabled ? aiGenerate : undefined,
      });

      const autoCreate = this.ocrEngine.prepareAutoCreate(result);

      return { extracted: result, autoCreate };
    } catch (error) {
      this.logger.error(`OCR analysis failed: ${(error as Error).message}`);
      return null;
    }
  }

  async analyzeInvestmentHealth(userId: string) {
    try {
      const investments = await this.prisma.investment.findMany({
        where: { userId, deletedAt: null },
      });

      const result = this.investHealthEngine.analyzePortfolio(
        investments.map((i) => ({
          id: i.id,
          name: i.name,
          symbol: i.symbol || undefined,
          type: i.type as any,
          quantity: Number(i.quantity),
          buyPrice: Number(i.buyPrice),
          currentPrice: Number(i.currentPrice || i.buyPrice),
          buyDate: i.createdAt,
        })),
      );

      return result;
    } catch (error) {
      this.logger.error(`Investment health analysis failed: ${(error as Error).message}`);
      return null;
    }
  }

  async projectRetirement(
    userId: string,
    params: {
      currentAge: number;
      retirementAge: number;
      lifeExpectancy: number;
      monthlyContribution: number;
      annualReturnRate: number;
      monthlyExpensesInRetirement: number;
    },
  ) {
    try {
      const currentSavings = 0;

      const result = this.retirementEngine.projectRetirement({
        ...params,
        currentSavings,
        inflationRate: 0.06,
      });

      return result;
    } catch (error) {
      this.logger.error(`Retirement projection failed: ${(error as Error).message}`);
      return null;
    }
  }

  async forecastFamilyWealth(
    userId: string,
    params: {
      members: { name: string; age: number; annualIncome: number }[];
      totalLiabilities: number;
      monthlySavings: number;
      annualReturnRate: number;
      children: { age: number; educationCost: number; educationYear: number }[];
      majorExpenses: { year: number; amount: number; description: string }[];
    },
  ) {
    try {
      const totalAssets = 0;

      const result = this.wealthForecastEngine.forecastWealth({
        ...params,
        totalAssets,
      });

      return result;
    } catch (error) {
      this.logger.error(`Wealth forecast failed: ${(error as Error).message}`);
      return null;
    }
  }

  async calculateTaxEstimate(
    userId: string,
    params: {
      annualIncome: number;
      otherIncome: number;
      regime: 'old' | 'new';
      sections?: {
        section80C?: any;
        section80D?: number;
        section80G?: number;
        hraExemption?: number;
        homeLoanInterest?: number;
        npsContribution?: number;
      };
      tdsDeducted?: number;
    },
  ) {
    try {
      const transactions = await this.prisma.transaction.findMany({
        where: { userId, deletedAt: null, type: 'expense', ...(await this.lensWhere(userId)) },
        take: 500,
      });

      const result = this.taxAssistantEngine.calculateTax({
        annualIncome: params.annualIncome,
        otherIncome: params.otherIncome || 0,
        sections: {
          section80C: params.sections?.section80C || {
            lifeInsurance: 0,
            ppf: 0,
            epf: 0,
            elss: 0,
            nsc: 0,
            tuitionFees: 0,
            fixedDeposits: 0,
            other: 0,
          },
          section80D: params.sections?.section80D || 0,
          section80G: params.sections?.section80G || 0,
          hraExemption: params.sections?.hraExemption || 0,
          homeLoanInterest: params.sections?.homeLoanInterest || 0,
          standardDeduction: 50000,
          npsContribution: params.sections?.npsContribution || 0,
        },
        tdsDeducted: params.tdsDeducted || 0,
        regime: params.regime,
        transactions: transactions.map((t) => ({
          id: t.id,
          amount: Number(t.amount),
          description: t.description || '',
          category: t.categoryId || undefined,
          date: t.date,
          type: t.type as any,
        })),
      });

      return result;
    } catch (error) {
      this.logger.error(`Tax calculation failed: ${(error as Error).message}`);
      return null;
    }
  }

  async generateMonthlyReview(userId: string) {
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      const [transactions, budgets, goals, bills, investments] = await Promise.all([
        this.prisma.transaction.findMany({
          where: {
            userId,
            deletedAt: null,
            date: { gte: monthStart },
            ...(await this.lensWhere(userId)),
          },
          take: 500,
        }),
        this.prisma.budget.findMany({
          where: { userId, deletedAt: null, ...(await this.lensWhere(userId)) },
        }),
        this.prisma.goal.findMany({
          where: { userId, deletedAt: null, ...(await this.lensWhere(userId)) },
        }),
        this.prisma.bill.findMany({
          where: { userId, deletedAt: null, ...(await this.lensWhere(userId)) },
        }),
        this.prisma.investment.findMany({ where: { userId, deletedAt: null } }),
      ]);

      const prevTransactions = await this.prisma.transaction.findMany({
        where: {
          userId,
          deletedAt: null,
          date: { gte: prevMonthStart, lt: monthStart },
          ...(await this.lensWhere(userId)),
        },
        take: 500,
      });

      const prevExpenses = prevTransactions
        .filter((t) => t.type === 'expense')
        .reduce((s, t) => s + Number(t.amount), 0);
      const prevIncome = prevTransactions
        .filter((t) => t.type === 'income')
        .reduce((s, t) => s + Number(t.amount), 0);
      const prevSavingsRate = prevIncome > 0 ? ((prevIncome - prevExpenses) / prevIncome) * 100 : 0;

      const healthScore = await this.prisma.aiScore.findFirst({
        where: { userId, periodType: 'monthly' },
        orderBy: { computedAt: 'desc' },
      });

      const result = await this.monthlyReviewEngine.generateMonthlyReview({
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        transactions: transactions.map((t) => ({
          id: t.id,
          amount: Number(t.amount),
          description: t.description || '',
          category: t.categoryId || undefined,
          date: t.date,
          type: t.type as any,
        })),
        budgets: budgets.map((b) => ({
          id: b.id,
          name: b.name,
          amount: Number(b.amount),
          spent: Number(b.spent || 0),
          category: b.categoryId || undefined,
        })),
        goals: goals.map((g) => ({
          id: g.id,
          name: g.name,
          targetAmount: Number(g.targetAmount),
          currentAmount: Number(g.currentAmount || 0),
          deadline: g.deadline || undefined,
        })),
        bills: bills.map((b) => ({
          id: b.id,
          name: b.name,
          amount: Number(b.amount),
          dueDate: b.dueDate,
          isPaid: b.isPaid,
        })),
        investments: investments.map((i) => ({
          id: i.id,
          name: i.name,
          type: i.type,
          buyPrice: Number(i.buyPrice),
          currentPrice: Number(i.currentPrice || i.buyPrice),
          quantity: Number(i.quantity),
        })),
        previousMonthSavingsRate: prevSavingsRate,
        previousMonthExpenses: prevExpenses,
        healthScore: healthScore
          ? {
              current: healthScore.overallScore,
              change: healthScore.monthlyChange,
              level: healthScore.financialLevel,
            }
          : undefined,
      });

      return result;
    } catch (error) {
      this.logger.error(`Monthly review generation failed: ${(error as Error).message}`);
      return null;
    }
  }

  async getCoupleIntelligence(userId: string, groupId: string): Promise<any> {
    try {
      // Verify membership
      const member = await this.prisma.sharedGroupMember.findUnique({
        where: { groupId_userId: { groupId, userId } },
      });
      if (!member || !member.isActive) {
        return null;
      }

      const intel = await this.prisma.coupleIntelligence.findFirst({
        where: { coupleProfile: { groupId } },
        orderBy: { computedAt: 'desc' },
      });
      if (!intel) {
        return null;
      }

      const profile = await this.prisma.coupleFinanceProfile.findUnique({
        where: { groupId },
        select: { partner1Id: true, partner2Id: true, splitRatio: true, contributionType: true },
      });

      return {
        compatibilityScore: intel.compatibilityScore,
        spendingAlignment: intel.spendingAlignment,
        savingsAlignment: intel.savingsAlignment,
        financialDiscipline: intel.financialDiscipline,
        sharedGoalAlignment: intel.sharedGoalAlignment,
        spendingDifferences: intel.spendingDifferences,
        insights: intel.insights,
        recommendations: intel.recommendations,
        monthlyReport: intel.monthlyReport,
        computedAt: intel.computedAt,
        profile,
      };
    } catch (error) {
      this.logger.error(`Couple intelligence fetch failed: ${(error as Error).message}`);
      return null;
    }
  }

  async getFamilyIntelligence(userId: string, familyId: string): Promise<any> {
    try {
      const member = await this.prisma.familyMember.findFirst({
        where: { familyId, userId },
      });
      if (!member) {
        return null;
      }

      const intel = await this.prisma.familyIntelligence.findFirst({
        where: { familyId },
        orderBy: { computedAt: 'desc' },
      });
      if (!intel) {
        return null;
      }

      return {
        savingsRate: intel.savingsRate,
        sharedBillScore: intel.sharedBillScore,
        emergencyFundMonths: intel.emergencyFundMonths,
        debtPressureScore: intel.debtPressureScore,
        healthScore: intel.healthScore,
        monthlyChange: intel.monthlyChange,
        insights: intel.insights,
        recommendations: intel.recommendations,
        computedAt: intel.computedAt,
      };
    } catch (error) {
      this.logger.error(`Family intelligence fetch failed: ${(error as Error).message}`);
      return null;
    }
  }

  async getReview(userId: string, spaceId?: string) {
    const where: any = { userId };
    if (spaceId) {
      where.spaceId = spaceId;
    }
    const existing = await this.prisma.aiReview.findFirst({
      where,
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      return existing;
    }
    const [income, expense] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: {
          userId,
          type: 'income',
          spaceId: spaceId || null,
          date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          ...(await this.lensWhere(userId)),
        },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          userId,
          type: 'expense',
          spaceId: spaceId || null,
          date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          ...(await this.lensWhere(userId)),
        },
        _sum: { amount: true },
      }),
    ]);
    const totalIncome = Number(income._sum.amount || 0);
    const totalExpense = Number(expense._sum.amount || 0);
    const savingsRate =
      totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0;
    const score = Math.min(100, Math.max(0, Math.round(50 + savingsRate * 0.5)));
    const review = await this.prisma.aiReview.create({
      data: {
        userId,
        spaceId: spaceId || null,
        insight: `Your savings rate is ${savingsRate}% this month. ${savingsRate > 20 ? 'Great job maintaining healthy savings!' : savingsRate > 10 ? 'You are saving at a moderate rate.' : 'Consider increasing your savings rate.'}`,
        prediction: `Projected savings for next month: ${Math.round(totalIncome * (savingsRate / 100))} based on current trends.`,
        score,
      },
    });
    return review;
  }

  // ───── V3 Contextual AI ─────

  async getContextualInsight(userId: string, screen: string, context?: Record<string, any>) {
    const cutoff = new Date(Date.now() - 90 * 86400000);
    const [recentTxns, monthlyStats] = await Promise.all([
      this.prisma.transaction.findMany({
        where: {
          userId,
          date: { gte: cutoff },
          deletedAt: null,
          ...(await this.lensWhere(userId)),
        },
        orderBy: { date: 'desc' },
        take: 1000,
        include: { category: { select: { name: true } } },
      }),
      this.prisma.transaction.groupBy({
        by: ['type'],
        where: {
          userId,
          date: { gte: cutoff },
          deletedAt: null,
          ...(await this.lensWhere(userId)),
        },
        _sum: { amount: true },
      }),
    ]);

    const totalIncome = monthlyStats.find((s) => s.type === 'income')?._sum.amount
      ? Number(monthlyStats.find((s) => s.type === 'income')!._sum.amount)
      : 0;
    const totalExpense = monthlyStats.find((s) => s.type === 'expense')?._sum.amount
      ? Number(monthlyStats.find((s) => s.type === 'expense')!._sum.amount)
      : 0;
    const balance = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? Math.round((balance / totalIncome) * 100) : 0;

    let insight = '';

    if (screen === 'dashboard' || screen === 'home') {
      if (recentTxns.length === 0) {
        insight = 'Start tracking your expenses to get personalized financial insights.';
      } else if (balance < 0) {
        insight = `You spent ₹${Math.round(Math.abs(balance))} more than you earned this period. Try reducing discretionary spending.`;
      } else if (savingsRate > 20) {
        insight = `Great job! You saved ${savingsRate}% of your income. Keep it up!`;
      } else if (savingsRate > 10) {
        insight = `You saved ${savingsRate}% this period. Aim for 20% to build a stronger cushion.`;
      } else {
        insight = `Your savings rate is ${savingsRate}%. Try to save at least 20% of income.`;
      }

      const topCategory = recentTxns
        .filter((t) => t.type === 'expense' && t.category?.name)
        .reduce<Record<string, number>>((acc, t) => {
          const name = t.category!.name;
          acc[name] = (acc[name] || 0) + Number(t.amount);
          return acc;
        }, {});
      const topCat = Object.entries(topCategory).sort(([, a], [, b]) => b - a)[0];
      if (topCat) {
        insight += ` Your top expense category is ${topCat[0]} (₹${Math.round(topCat[1])}).`;
      }
    } else if (screen === 'wallet' || screen === 'transactions') {
      const largeTxns = recentTxns.filter((t) => Number(t.amount) > 10000);
      if (largeTxns.length > 0) {
        insight = `You have ${largeTxns.length} transaction(s) over ₹10,000. Review for potential savings.`;
      } else {
        insight = 'All clear — no unusually large transactions detected.';
      }
    } else if (screen === 'goals') {
      insight = 'Set specific savings targets to make progress visible and stay motivated.';
    } else {
      insight = 'Track your spending patterns to discover opportunities to save more.';
    }

    return {
      screen,
      insight,
      transactionCount: recentTxns.length,
      savingsRate,
      totalIncome: Math.round(totalIncome),
      totalExpense: Math.round(totalExpense),
    };
  }

  async getContextualForecast(userId: string, goalId?: string, planId?: string, months?: number) {
    const m = months || 3;
    const cutoff = new Date(Date.now() - 90 * 86400000);

    const [incomeAvg, expenseAvg, goals] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: {
          userId,
          type: 'income',
          date: { gte: cutoff },
          deletedAt: null,
          ...(await this.lensWhere(userId)),
        },
        _avg: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          userId,
          type: 'expense',
          date: { gte: cutoff },
          deletedAt: null,
          ...(await this.lensWhere(userId)),
        },
        _avg: { amount: true },
      }),
      goalId
        ? this.prisma.goal.findFirst({ where: { id: goalId, userId } })
        : this.prisma.goal.findMany({
            where: { userId, deletedAt: null, ...(await this.lensWhere(userId)) },
          }),
    ]);

    const avgIncome = Number(incomeAvg._avg.amount || 0);
    const avgExpense = Number(expenseAvg._avg.amount || 0);
    const monthlySavings = avgIncome - avgExpense;

    const projectedIncome = avgIncome * m;
    const projectedExpense = avgExpense * m;
    const projectedSavings = monthlySavings * m;

    const prediction = {
      monthlyAvgIncome: Math.round(avgIncome),
      monthlyAvgExpense: Math.round(avgExpense),
      monthlySavings: Math.round(Math.max(0, monthlySavings)),
      projectedIncome: Math.round(projectedIncome),
      projectedExpense: Math.round(projectedExpense),
      projectedSavings: Math.round(Math.max(0, projectedSavings)),
      savingsRate: avgIncome > 0 ? Math.round((monthlySavings / avgIncome) * 100) : 0,
      monthsProjected: m,
      goalImpact: null as any,
    };

    if (goalId && goals && !Array.isArray(goals)) {
      const target = Number(goals.targetAmount);
      const current = Number(goals.currentAmount);
      const remaining = target - current;
      const monthsToGoal = monthlySavings > 0 ? Math.ceil(remaining / monthlySavings) : null;
      prediction.goalImpact = {
        goalName: goals.name,
        target: Math.round(target),
        current: Math.round(current),
        remaining: Math.round(remaining),
        monthsToGoal,
        onTrack: monthsToGoal !== null && monthsToGoal <= m,
      };
    }

    return prediction;
  }

  async getContextualRebalance(userId: string, targetCategory?: string, monthlyBudget?: number) {
    const cutoff = new Date(Date.now() - 90 * 86400000);

    const categorySpending = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        type: 'expense',
        date: { gte: cutoff },
        deletedAt: null,
        ...(await this.lensWhere(userId)),
      },
      _sum: { amount: true },
    });

    const totalSpent = categorySpending.reduce((s, c) => s + Number(c._sum.amount || 0), 0);
    const budget = monthlyBudget || Math.round(totalSpent / 3);

    const categories = await this.prisma.transactionCategory.findMany({
      where: { userId, isActive: true, transactionType: 'expense' },
      select: { id: true, name: true },
    });

    const catMap = new Map(categories.map((c) => [c.id, c.name]));

    const currentSplit = categorySpending
      .map((c) => ({
        categoryId: c.categoryId,
        categoryName: c.categoryId ? catMap.get(c.categoryId) || 'Unknown' : 'Uncategorized',
        current: Math.round(Number(c._sum.amount || 0) / 3),
        percentage:
          totalSpent > 0 ? Math.round((Number(c._sum.amount || 0) / totalSpent) * 100) : 0,
      }))
      .sort((a, b) => b.current - a.current);

    const suggestions: {
      categoryId: string | null;
      categoryName: string;
      current: number;
      suggested: number;
      change: number;
    }[] = [];

    if (targetCategory) {
      const target = currentSplit.find(
        (c) => c.categoryName.toLowerCase() === targetCategory.toLowerCase(),
      );
      if (target) {
        const maxRecommended = Math.round(budget * 0.5);
        if (target.current > maxRecommended) {
          suggestions.push({
            categoryId: target.categoryId,
            categoryName: target.categoryName,
            current: target.current,
            suggested: maxRecommended,
            change: maxRecommended - target.current,
          });
        }
      }
    }

    if (suggestions.length === 0) {
      for (const cat of currentSplit) {
        if (cat.percentage > 40) {
          const maxRecommended = Math.round(budget * 0.35);
          suggestions.push({
            categoryId: cat.categoryId,
            categoryName: cat.categoryName,
            current: cat.current,
            suggested: maxRecommended,
            change: maxRecommended - cat.current,
          });
        }
      }
    }

    return {
      monthlyBudget: budget,
      currentSpending: currentSplit,
      suggestions,
      totalMonthlySpent: Math.round(totalSpent / 3),
      message:
        suggestions.length > 0
          ? `Consider reducing ${suggestions[0].categoryName} by ₹${Math.abs(suggestions[0].change)}/mo`
          : 'Your spending is well-balanced across categories.',
    };
  }

  async getContextualCategorize(userId: string, description: string, amount?: number) {
    if (!description || description.trim().length === 0) {
      return { category: 'Other', confidence: 0, description };
    }

    const desc = description.toLowerCase();

    const keywordMap: [string, string, number][] = [
      ['grocery', 'Groceries', 0.85],
      ['vegetable', 'Groceries', 0.8],
      ['fruit', 'Groceries', 0.8],
      ['restaurant', 'Food & Dining', 0.9],
      ['food', 'Food & Dining', 0.7],
      ['pizza', 'Food & Dining', 0.9],
      ['lunch', 'Food & Dining', 0.85],
      ['dinner', 'Food & Dining', 0.85],
      ['swiggy', 'Food & Dining', 0.9],
      ['zomato', 'Food & Dining', 0.9],
      ['uber', 'Transport', 0.85],
      ['ola', 'Transport', 0.85],
      ['fuel', 'Transport', 0.9],
      ['petrol', 'Transport', 0.95],
      ['diesel', 'Transport', 0.95],
      ['metro', 'Transport', 0.8],
      ['cab', 'Transport', 0.8],
      ['bus', 'Transport', 0.75],
      ['train', 'Travel', 0.75],
      ['flight', 'Travel', 0.9],
      ['hotel', 'Travel', 0.85],
      ['rent', 'Rent', 0.95],
      ['electricity', 'Bills & Utilities', 0.9],
      ['water', 'Bills & Utilities', 0.85],
      ['wifi', 'Bills & Utilities', 0.85],
      ['internet', 'Bills & Utilities', 0.85],
      ['mobile', 'Bills & Utilities', 0.8],
      ['phone', 'Bills & Utilities', 0.7],
      ['bill', 'Bills & Utilities', 0.6],
      ['movie', 'Entertainment', 0.9],
      ['netflix', 'Entertainment', 0.95],
      ['amazon prime', 'Entertainment', 0.9],
      ['spotify', 'Entertainment', 0.9],
      ['game', 'Entertainment', 0.7],
      ['salary', 'Salary', 0.95],
      ['freelance', 'Freelance', 0.9],
      ['doctor', 'Health & Fitness', 0.85],
      ['hospital', 'Health & Fitness', 0.9],
      ['medicine', 'Health & Fitness', 0.85],
      ['pharmacy', 'Health & Fitness', 0.85],
      ['gym', 'Health & Fitness', 0.85],
      ['course', 'Education', 0.85],
      ['university', 'Education', 0.9],
      ['tuition', 'Education', 0.9],
      ['book', 'Education', 0.6],
      ['clothing', 'Shopping', 0.8],
      ['amazon', 'Shopping', 0.7],
      ['flipkart', 'Shopping', 0.75],
      ['myntra', 'Shopping', 0.85],
      ['shoe', 'Shopping', 0.7],
      ['gift', 'Gift', 0.85],
      ['donation', 'Gift', 0.8],
      ['insurance', 'Insurance', 0.9],
      ['investment', 'Investments', 0.9],
      ['sip', 'Investments', 0.95],
      ['mutual fund', 'Investments', 0.95],
      ['stock', 'Investments', 0.9],
    ];

    let bestMatch: { category: string; confidence: number; matchedKeyword: string } | null = null;

    for (const [keyword, category, confidence] of keywordMap) {
      if (desc.includes(keyword)) {
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = { category, confidence, matchedKeyword: keyword };
        }
      }
    }

    if (bestMatch) {
      return {
        category: bestMatch.category,
        confidence: bestMatch.confidence,
        matchedKeyword: bestMatch.matchedKeyword,
        description,
      };
    }

    const userCategories = await this.prisma.transactionCategory.findMany({
      where: { userId, isActive: true },
      select: { name: true },
    });

    for (const cat of userCategories) {
      const catWords = cat.name.toLowerCase().split(/[\s&]+/);
      for (const word of catWords) {
        if (word.length > 3 && desc.includes(word)) {
          return {
            category: cat.name,
            confidence: 0.6,
            matchedKeyword: word,
            description,
          };
        }
      }
    }

    return { category: 'Other', confidence: 0.3, description };
  }
}

function urgencyText(urgency: number): string {
  if (urgency > 0.05) {
    return 'Your deadline is approaching fast';
  }
  if (urgency > 0.02) {
    return 'This goal needs more consistent funding';
  }
  return 'More contributions will help reach this sooner';
}

function needText(need: number): string {
  if (need > 0.5) {
    return ' and there is still a long way to go';
  }
  if (need > 0.2) {
    return ' and additional funds will ensure timely completion';
  }
  return ' to maintain momentum';
}

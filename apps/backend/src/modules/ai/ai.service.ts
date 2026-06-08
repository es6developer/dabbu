import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';

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

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const aiConfig = this.config.get('ai');
    this.enabled = aiConfig?.enabled ?? false;
    this.baseUrl = aiConfig?.baseUrl || 'http://localhost:11434';
    this.model = aiConfig?.model || 'llama3.2';
    this.apiKey = aiConfig?.apiKey || '';
    this.timeout = aiConfig?.timeout || 30000;
    this.maxRetries = aiConfig?.maxRetries || 2;
  }

  isEnabled(): boolean {
    return this.enabled;
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

  clearCache() {
    this.insightCache.clear();
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
}

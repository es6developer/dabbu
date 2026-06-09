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

  async processChat(
    userId: string,
    prompt: string,
  ): Promise<{ action: string; message: string; data?: any }> {
    const p = prompt.toLowerCase().trim();

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
    // Requires "group" without "spend" so "Create spending groups" doesn't match
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
      return this.handleAddExpense(prompt, userId);
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
      return this.handleSummarize(userId);
    }

    // ── Fallback: context-aware chat response ─────────────────────
    return this.handleGeneralChat(userId, p);
  }

  private async handleSummarize(
    userId: string,
  ): Promise<{ action: string; message: string; data?: any }> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [txns, stats] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { userId, date: { gte: thirtyDaysAgo }, deletedAt: null },
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
      const group = await this.prisma.sharedGroup.create({
        data: {
          name,
          type: 'friends',
          createdBy: userId,
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
          amount,
          type: 'expense',
          description: description || 'AI added expense',
          date: new Date(),
          categoryId: category?.id || undefined,
        },
      });

      return {
        action: 'add_expense',
        message: `➕ **Added Expense**\n\n**Amount:** ₹${Number(tx.amount).toFixed(2)}\n**Description:** ${tx.description || 'Expense'}\n\n✅ Recorded successfully!`,
        data: { amount: Number(tx.amount), description: tx.description || 'Expense' },
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
      const group = await this.prisma.expenseGroup.create({
        data: {
          name,
          description: `Created by Dabbu AI from: "${raw.slice(0, 100)}"`,
          createdBy: userId,
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
      where: { userId, date: { gte: monthStart }, deletedAt: null },
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
}

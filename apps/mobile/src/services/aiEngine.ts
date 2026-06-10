import { AIResponse, ExtractedEntities } from '../types';
import { api } from './api';
import {
  getConversation,
  setConversation,
  clearConversation,
  cancelResponse,
  askResponse,
  messageResponse,
} from './conversationManager';

// ── API helpers ────────────────────────────────────────────────

async function apiGet<T>(path: string): Promise<T> {
  try {
    const res = await api.get<any>(path);
    const data = res?.data !== undefined ? res.data : res;
    return (data?.data ?? data ?? []) as T;
  } catch {
    return [] as unknown as T;
  }
}

async function apiPost<T>(path: string, body?: any): Promise<T | null> {
  try {
    const res = await api.post<any>(path, body);
    const data = res?.data !== undefined ? res.data : res;
    return (data?.data ?? data ?? null) as T | null;
  } catch {
    return null;
  }
}

async function apiPatch<T>(path: string, body?: any): Promise<T | null> {
  try {
    const res = await api.patch<any>(path, body);
    const data = res?.data !== undefined ? res.data : res;
    return (data?.data ?? data ?? null) as T | null;
  } catch {
    return null;
  }
}

async function apiDelete(path: string): Promise<boolean> {
  try {
    await api.delete(path);
    return true;
  } catch {
    return false;
  }
}

// ── Data fetchers ──────────────────────────────────────────────

async function fetchTransactions(days = 30): Promise<any[]> {
  return apiGet<any[]>(`/transactions?days=${days}&limit=100`);
}

async function fetchTransactionStats(): Promise<any> {
  try {
    const res = await api.get<any>('/transactions/stats');
    const data = res?.data !== undefined ? res.data : res;
    return data?.data ?? data ?? null;
  } catch {
    return null;
  }
}

async function fetchCategorySummary(days = 30): Promise<any[]> {
  return apiGet<any[]>(`/transactions/categories-summary?days=${days}`);
}

async function fetchMonthlySummary(): Promise<any[]> {
  return apiGet<any[]>('/transactions/monthly-summary');
}

async function fetchCircles(): Promise<any[]> {
  return apiGet<any[]>('/expense-groups');
}

async function fetchSpaces(): Promise<any[]> {
  return apiGet<any[]>('/shared-finance/groups');
}

// ── Format helpers ─────────────────────────────────────────────

function fmtINR(n: number): string {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function fmtDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch {
    return dateStr;
  }
}

// ── Intent detection ───────────────────────────────────────────

const PATTERNS: Record<string, RegExp> = {
  greeting: /^(hi|hello|hey|howdy|good\s*(morning|afternoon|evening)|sup|yo)\b/i,
  help: /\b(help|what can you do|commands|guide|tutorial)\b/i,
  add_expense: /\b(add|new|log|record|track|spend|paid)\s+.*(expense|₹|\$|rs|\d+)/i,
  create_circle: /\b(create|new|make|start)\s+.*\b(circle|group)\b/i,
  create_space: /\b(create|new|make|start)\s+.*\b(space|fund)\b/i,
  summarize:
    /\b(summar|summary|overview|report|breakdown|recap|how much did i|total|show me my)\b/i,
  query_category:
    /\b(food|transport|shopping|bills|entertainment|health|grocer|dining|fuel|rent|utility)\b.*\b(expense|spend|cost|total)\b|\bhow much\s+on\s+(food|transport|shopping|bills|entertainment|health)\b/i,
  query_circle:
    /\b(circle|group)\b.*\b(spend|total|expense|cost|show)\b|\bhow much.*(circle|group)\b/i,
  query_budget: /\b(budget|limit|alert|remaining)\b|\bhow much.*budget\b/i,
  compare_months:
    /\b(compare|vs|versus|difference|changed|last month|this month)\b.*\b(month|last|previous)\b|\bmonth over month|trend\b/i,
  top_expenses: /\b(top|biggest|largest|highest|most expensive)\b/i,
  savings_analysis:
    /\b(save|saving|savings|reduce|cut|tip|advice|where can i|how can i|cut spending)\b/i,
  set_budget: /\b(set|create|add)\s+.*\b(budget|limit)\b|\bbudget\s+(for|of)\s+/i,
  delete_expense: /\b(delete|remove|cancel|erase|undo)\s+.*\b(expense|transaction)\b/i,
  rename_circle: /\b(rename|change name|update name)\s+.*\b(circle|group)\b/i,
};

const CATEGORY_MAP: Record<string, string> = {
  food: 'Food',
  restaurant: 'Food',
  dining: 'Food',
  dinner: 'Food',
  lunch: 'Food',
  breakfast: 'Food',
  groceries: 'Food',
  grocery: 'Food',
  snack: 'Food',
  coffee: 'Food',
  transport: 'Transport',
  fuel: 'Transport',
  gas: 'Transport',
  petrol: 'Transport',
  cab: 'Transport',
  uber: 'Transport',
  bus: 'Transport',
  shopping: 'Shopping',
  clothes: 'Shopping',
  bills: 'Bills',
  rent: 'Bills',
  utilities: 'Bills',
  electricity: 'Bills',
  internet: 'Bills',
  phone: 'Bills',
  entertainment: 'Entertainment',
  movie: 'Entertainment',
  streaming: 'Entertainment',
  health: 'Health',
  medical: 'Health',
  gym: 'Health',
  education: 'Education',
  books: 'Education',
};

function detectIntent(input: string): { type: string; confidence: number } {
  const text = input.trim().toLowerCase();
  if (/^(hi|hello|hey|howdy)\b/.test(text)) {
    return { type: 'greeting', confidence: 0.95 };
  }
  if (/^(cancel|never mind|forget it|stop|go back|none)$/.test(text)) {
    return { type: 'help', confidence: 1 };
  }

  const scores: { type: string; confidence: number }[] = [];
  for (const [type, pattern] of Object.entries(PATTERNS)) {
    const match = text.match(pattern);
    if (match) {
      scores.push({ type, confidence: match[0].length / Math.max(text.length, 1) + 0.5 });
    }
  }
  scores.sort((a, b) => b.confidence - a.confidence);
  return scores.length > 0 && scores[0].confidence > 0.3
    ? scores[0]
    : { type: 'unknown', confidence: 0 };
}

function extractEntities(input: string): ExtractedEntities {
  const text = input.trim();
  const entities: ExtractedEntities = {};

  const amt = text.match(
    /(?:₹|\$|Rs\.?\s*)?(\d+(?:\.\d{1,2})?)\s*(?:dollars?|rupees?|usd|inr)?\b/i,
  );
  if (amt) {
    entities.amount = parseFloat(amt[1]);
  }

  const forMatch = text.match(/(?:for|on)\s+(.+?)(?:\s+(?:in|to|at|circle|space|group)\s|$)/i);
  const descMatch = text.match(
    /(?:add\s+(?:expense\s+)?(?::)?\s*)(.+?)(?:\s+(?:in|to|for|at|circle|space|group))?(?:\s+\d+|$)/i,
  );
  const desc = forMatch?.[1] || descMatch?.[1];
  if (desc) {
    entities.description = desc
      .trim()
      .replace(/\s+\d+\.?\d*$/, '')
      .trim();
  }

  for (const [kw, cat] of Object.entries(CATEGORY_MAP)) {
    if (new RegExp(`\\b${kw}\\b`, 'i').test(text)) {
      entities.category = cat;
      break;
    }
  }

  const timeMap: Record<string, ExtractedEntities['timeRange']> = {
    today: 'today',
    yesterday: 'yesterday',
    'this week': 'this_week',
    'last week': 'last_week',
    'this month': 'this_month',
    'last month': 'last_month',
    '30 days': 'last_30_days',
    'last 30': 'last_30_days',
  };
  for (const [phrase, range] of Object.entries(timeMap)) {
    if (text.includes(phrase)) {
      entities.timeRange = range;
      break;
    }
  }

  const nameMatch = text.match(/(?:called|named)\s*["""]?(.+?)["""]?(?:\s+with|\s+for|\s*$)/i);
  const quoteMatch = text.match(/["""](.+?)["""]/);
  if (nameMatch) {
    entities.name = nameMatch[1].trim();
  }
  if (quoteMatch && !entities.name) {
    entities.name = quoteMatch[1].trim();
  }

  const circleMatch = text.match(
    /(?:circle|group)\s+(?:called|named)?\s*["""]?(.+?)["""]?(?:\s+with|\s*$)/i,
  );
  if (circleMatch) {
    entities.circleName = circleMatch[1].trim();
  }
  const spaceMatch = text.match(/space\s+(?:called|named)?\s*["""]?(.+?)["""]?(?:\s+with|\s*$)/i);
  if (spaceMatch) {
    entities.spaceName = spaceMatch[1].trim();
  }

  const withMatch = text.match(/with\s+(.+?)(?:\s+and\s+|$)/i);
  if (withMatch) {
    const m = withMatch[1]
      .split(/[,&]+/)
      .map((s) => s.trim().replace(/^and\s+/i, ''))
      .filter(Boolean);
    if (m.length > 0 && !/^(me|my|myself|us|our)$/i.test(m[0])) {
      entities.memberNames = m;
    }
  }

  const limitMatch = text.match(/(?:top|last)\s+(\d+)/i);
  if (limitMatch) {
    entities.limit = parseInt(limitMatch[1], 10);
  }

  const renameMatch = text.match(
    /(?:rename|change name of|update name of)\s+["""]?(.+?)["""]?\s+(?:to|as)\s+["""]?(.+?)["""]?$/i,
  );
  if (renameMatch) {
    entities.oldName = renameMatch[1].trim();
    entities.newName = renameMatch[2].trim();
  }

  return entities;
}

// ── Handlers ───────────────────────────────────────────────────

function handleGreeting(): AIResponse {
  return messageResponse(
    "Hello! I'm your Dabbu finance assistant. I can help you track and manage your money.\n\n" +
      'Try asking me:\n' +
      '• "How much did I spend last month?"\n' +
      '• "Add ₹500 for dinner"\n' +
      '• "Show my Weekend Trip circle"\n' +
      '• "Where can I save money?"',
  );
}

function handleHelp(): AIResponse {
  return messageResponse(
    '🤖 **Dabbu AI Commands**\n\n' +
      '**📊 Queries**\n' +
      '• "How much did I spend last month?"\n' +
      '• "Show my food expenses"\n' +
      '• "Show my top 5 expenses"\n' +
      '• "Compare this month vs last month"\n\n' +
      '**➕ Add**\n' +
      '• "Add ₹500 for dinner"\n' +
      '• "Add ₹200 for Uber"\n\n' +
      '**🔄 Create**\n' +
      '• "Create a circle called Weekend Trip with Mike and Sarah"\n' +
      '• "Create a space called Emergency Fund"\n\n' +
      '**💡 Insights**\n' +
      '• "Where can I save money?"\n' +
      '• "Show my budgets"',
  );
}

async function handleAddExpense(userId: string, input: string): Promise<AIResponse> {
  const entities = extractEntities(input);
  if (!entities.amount) {
    return askResponse('How much was the expense?', 'amount', []);
  }

  const lower = input.toLowerCase();
  const hasDest = /\b(personal|circle|space|group)\b/i.test(lower);

  if (!hasDest) {
    setConversation(userId, 'ask_expense_destination', 'add_expense', {
      amount: entities.amount,
      description: entities.description || 'Expense',
      raw: input,
      category: entities.category,
    });
    return askResponse(
      `Where should **${fmtINR(entities.amount)}** for **${entities.description || 'Expense'}** go?`,
      'destination',
      ['Personal', 'Circle'],
    );
  }

  if (/\b(circle|group)\b/i.test(lower)) {
    const circles = await fetchCircles();
    if (!Array.isArray(circles) || circles.length === 0) {
      setConversation(userId, 'ask_expense_destination', 'add_expense', {
        amount: entities.amount,
        description: entities.description || 'Expense',
        raw: input,
      });
      return askResponse("You don't have any circles. Where should this go?", 'destination', [
        'Personal',
      ]);
    }
    setConversation(
      userId,
      'ask_expense_circle',
      'add_expense',
      {
        amount: entities.amount,
        description: entities.description || 'Expense',
        raw: input,
        category: entities.category,
      },
      { circles },
    );
    return askResponse(
      'Which circle?',
      'circle',
      circles.map((c: any) => c.name),
    );
  }

  // Personal expense
  const tx = await apiPost<any>('/transactions', {
    amount: entities.amount,
    type: 'expense',
    description: entities.description || 'Expense',
    category: entities.category || undefined,
    date: new Date().toISOString().split('T')[0],
  });
  const t = tx || entities;
  return messageResponse(
    `✅ **Added** ${fmtINR(entities.amount)} for **${entities.description || 'Expense'}**`,
    { amount: t.amount || entities.amount, description: t.description || entities.description },
  );
}

async function handleCreateCircle(userId: string, input: string): Promise<AIResponse> {
  const entities = extractEntities(input);
  const name = entities.circleName || entities.name;
  if (!name) {
    setConversation(userId, 'ask_circle_name', 'create_circle', { raw: input });
    return askResponse('What should the circle be called?', 'circleName', []);
  }
  const group = await apiPost<any>('/expense-groups', {
    name,
    description: `Created by Dabbu AI`,
  });
  const members = entities.memberNames || [];
  if (group?.id && members.length > 0) {
    for (const member of members) {
      await apiPost(`/expense-groups/${group.id}/members`, { name: member }).catch(() => {});
    }
  }
  const msg = `✅ **Circle "${name}" created!**${members.length > 0 ? `\n👥 Members: You, ${members.join(', ')}` : ''}`;
  return messageResponse(msg, { groupId: group?.id, groupName: name });
}

async function handleCreateSpace(userId: string, input: string): Promise<AIResponse> {
  const entities = extractEntities(input);
  const name = entities.spaceName || entities.name;
  if (!name) {
    setConversation(userId, 'ask_space_name', 'create_space', { raw: input });
    return askResponse('What should the space be called?', 'spaceName', []);
  }
  const group = await apiPost<any>('/shared-finance/groups', { name, type: 'friends' });
  const msg = `✅ **Space "${name}" created!**`;
  return messageResponse(msg, { groupId: group?.id, groupName: name });
}

async function personalSummary(): Promise<AIResponse> {
  const [txns, cats] = await Promise.all([fetchTransactions(30), fetchCategorySummary(30)]);
  const list = Array.isArray(txns) ? txns : [];
  const total = list
    .filter((t: any) => t.type === 'expense')
    .reduce((s: number, t: any) => s + Number(t.amount), 0);
  const catList = Array.isArray(cats) ? cats : [];
  const topCats = catList.slice(0, 5);
  const highest =
    list.length > 0
      ? list
          .filter((t: any) => t.type === 'expense')
          .sort((a: any, b: any) => Number(b.amount) - Number(a.amount))[0]
      : null;

  const lines: string[] = ['📊 **Last 30 Days Summary**'];
  lines.push(`\n💰 **Total spent:** ${fmtINR(total)}`);
  lines.push(`📝 **Transactions:** ${list.length}`);
  if (topCats.length > 0) {
    lines.push('\n**By category:**');
    for (const c of topCats) {
      const amt = Number(c.total || c.amount || 0);
      const pct = total > 0 ? ((amt / total) * 100).toFixed(0) : '0';
      lines.push(`  • ${c.category || c.name}: ${fmtINR(amt)} (${pct}%)`);
    }
  }
  if (highest) {
    lines.push(
      `\n🏆 **Highest:** ${fmtINR(Number(highest.amount))} — ${highest.description || 'Expense'} (${highest.date ? fmtDate(highest.date) : ''})`,
    );
  }
  return messageResponse(lines.join('\n'), { total, categories: topCats, count: list.length });
}

async function circleSummary(circleName?: string): Promise<AIResponse> {
  const circles = await fetchCircles();
  const list = Array.isArray(circles) ? circles : [];
  if (list.length === 0) {
    return messageResponse("You don't have any circles yet.");
  }
  if (!circleName) {
    return askResponse(
      'Which circle?',
      'circle',
      list.map((c: any) => c.name),
    );
  }

  const match = list.find((c: any) => c.name.toLowerCase().includes(circleName.toLowerCase()));
  if (!match) {
    return messageResponse(`Couldn't find "${circleName}".`);
  }

  const txns = await fetchTransactionsForCircle(match.id);
  const total = txns.reduce((s: number, t: any) => s + Number(t.amount), 0);
  const lines: string[] = [`📊 **${match.name}**`];
  lines.push(`\n💰 **Total:** ${fmtINR(total)}`);
  if (txns.length > 0) {
    lines.push('\n**Recent:**');
    for (const t of txns.slice(0, 5)) {
      lines.push(
        `  • ${fmtINR(Number(t.amount))} — ${t.description || 'Expense'}${t.date ? ` (${fmtDate(t.date)})` : ''}`,
      );
    }
  }
  return messageResponse(lines.join('\n'), {
    total,
    circleName: match.name,
    expenses: txns.slice(0, 5),
  });
}

async function fetchTransactionsForCircle(circleId: string): Promise<any[]> {
  return apiGet<any[]>(`/transactions?expenseGroupId=${circleId}&limit=50`);
}

async function handleQuery(entities: ExtractedEntities): Promise<AIResponse> {
  if (entities.category) {
    const cats = await fetchCategorySummary(30);
    const catList = Array.isArray(cats) ? cats : [];
    const match = catList.find(
      (c: any) => (c.category || c.name || '').toLowerCase() === entities.category!.toLowerCase(),
    );
    if (match) {
      return messageResponse(
        `📊 **${entities.category} Expenses**\n\n` +
          `**Total:** ${fmtINR(Number(match.total || match.amount || 0))}\n` +
          `**Transactions:** ${match.count || match._count || 'N/A'}`,
        { category: entities.category, total: match.total, count: match.count },
      );
    }
    return messageResponse(`No expenses found for **${entities.category}**.`);
  }
  if (entities.circleName) {
    return circleSummary(entities.circleName);
  }
  return personalSummary();
}

async function handleTopExpenses(limit: number = 5): Promise<AIResponse> {
  const txns = await fetchTransactions(90);
  const list = Array.isArray(txns)
    ? txns
        .filter((t: any) => t.type === 'expense')
        .sort((a: any, b: any) => Number(b.amount) - Number(a.amount))
        .slice(0, limit)
    : [];
  if (list.length === 0) {
    return messageResponse('No expenses found.');
  }
  const lines: string[] = [`🏆 **Top ${limit} Expenses**\n`];
  for (let i = 0; i < list.length; i++) {
    lines.push(
      `${i + 1}. ${fmtINR(Number(list[i].amount))} — ${list[i].description || 'Expense'}${list[i].date ? ` (${fmtDate(list[i].date)})` : ''}`,
    );
  }
  return messageResponse(lines.join('\n'), { expenses: list });
}

async function handleComparison(): Promise<AIResponse> {
  const months = await fetchMonthlySummary();
  const list = Array.isArray(months) ? months : [];
  if (list.length < 2) {
    return messageResponse('Need at least 2 months of data for comparison.');
  }
  const cur = list[list.length - 1] || { income: 0, expense: 0 };
  const prev = list[list.length - 2] || { income: 0, expense: 0 };
  const cExp = Number(cur.expense || 0);
  const pExp = Number(prev.expense || 0);
  const diff = cExp - pExp;
  const pct = pExp > 0 ? ((diff / pExp) * 100).toFixed(0) : '0';
  const dir = diff > 0 ? '⬆️ increased' : '⬇️ decreased';
  return messageResponse(
    `📊 **Month over Month Comparison**\n\n` +
      `**Last month:** ${fmtINR(pExp)}\n**This month:** ${fmtINR(cExp)}\n\n` +
      `Spending ${dir} by ${fmtINR(Math.abs(diff))} (${Math.abs(Number(pct))}%)${Number(pct) > 0 ? ' ⚠️' : ' ✅'}`,
    { current: cExp, previous: pExp, change: diff },
  );
}

async function handleSavings(): Promise<AIResponse> {
  const [stats, cats] = await Promise.all([fetchTransactionStats(), fetchCategorySummary(30)]);
  const catList = Array.isArray(cats) ? cats : [];
  const top3 = catList.slice(0, 3);
  const total = top3.reduce((s: number, c: any) => s + Number(c.total || c.amount || 0), 0);

  if (catList.length === 0) {
    return messageResponse('Not enough data yet. Start tracking expenses!');
  }

  const lines: string[] = ['💡 **Spending Insights**'];
  lines.push('\n**Top spending categories:**');
  for (const c of top3) {
    const amt = Number(c.total || c.amount || 0);
    const pct = total > 0 ? ((amt / total) * 100).toFixed(0) : '0';
    lines.push(`  • ${c.category || c.name}: ${fmtINR(amt)} (${pct}%)`);
  }
  if (top3.length > 0) {
    const biggest = top3[0];
    const potential = Math.round(Number(biggest.total || biggest.amount || 0) * 0.2);
    lines.push(
      `\n💡 **Tip:** Cutting 20% of ${biggest.category || biggest.name} could save **${fmtINR(potential)}/month**.`,
    );
  }
  return messageResponse(lines.join('\n'), { breakdown: top3, total });
}

// ── Conversation Step Router ───────────────────────────────────

export async function handleConversationStep(
  userId: string,
  input: string,
  step: string,
  state: any,
): Promise<AIResponse> {
  const lower = input.trim().toLowerCase();

  switch (step) {
    case 'ask_expense_destination': {
      if (lower.includes('personal') || lower.includes('my')) {
        clearConversation(userId);
        const tx = await apiPost<any>('/transactions', {
          amount: state.context.amount,
          type: 'expense',
          description: state.context.description || 'Expense',
          date: new Date().toISOString().split('T')[0],
        });
        return messageResponse(
          `✅ **Added** ${fmtINR(state.context.amount)} for **${state.context.description || 'Expense'}** (Personal)`,
          { amount: state.context.amount, description: state.context.description },
        );
      }
      if (lower.includes('circle') || lower.includes('group')) {
        const circles = await fetchCircles();
        const cl = Array.isArray(circles) ? circles : [];
        if (cl.length === 0) {
          clearConversation(userId);
          return messageResponse("You don't have any circles.");
        }
        setConversation(userId, 'ask_expense_circle', 'add_expense', state.context, {
          circles: cl,
        });
        return askResponse(
          'Which circle?',
          'circle',
          cl.map((c: any) => c.name),
        );
      }
      return askResponse('Pick Personal or Circle.', 'destination', ['Personal', 'Circle']);
    }

    case 'ask_expense_circle': {
      const circles: any[] = state.data?.circles || [];
      const match = circles.find((c: any) => c.name.toLowerCase().includes(lower));
      if (!match) {
        return askResponse(
          'Pick one:',
          'circle',
          circles.map((c: any) => c.name),
        );
      }
      clearConversation(userId);
      const tx = await apiPost<any>('/transactions', {
        amount: state.context.amount,
        type: 'expense',
        description: state.context.description || 'Expense',
        expenseGroupId: match.id,
        date: new Date().toISOString().split('T')[0],
      });
      return messageResponse(
        `✅ **${fmtINR(state.context.amount)}** for **${state.context.description || 'Expense'}** added to **${match.name}** ✅`,
        { amount: state.context.amount, description: state.context.description, groupId: match.id },
      );
    }

    case 'ask_summary_scope': {
      if (lower.includes('personal')) {
        clearConversation(userId);
        return personalSummary();
      }
      if (lower.includes('circle')) {
        const circles = await fetchCircles();
        const cl = Array.isArray(circles) ? circles : [];
        if (cl.length === 0) {
          clearConversation(userId);
          return messageResponse('No circles yet.');
        }
        setConversation(userId, 'ask_summary_circle', 'summarize', {}, { circles: cl });
        return askResponse(
          'Which circle?',
          'circle',
          cl.map((c: any) => c.name),
        );
      }
      if (lower.includes('space')) {
        const spaces = await fetchSpaces();
        const sl = Array.isArray(spaces) ? spaces : [];
        if (sl.length === 0) {
          clearConversation(userId);
          return messageResponse('No spaces yet.');
        }
        setConversation(userId, 'ask_summary_space', 'summarize', {}, { spaces: sl });
        return askResponse(
          'Which space?',
          'space',
          sl.map((s: any) => s.name),
        );
      }
      if (lower.includes('all')) {
        clearConversation(userId);
        const p = await personalSummary();
        return messageResponse(p.message + '\n\nCheck your circles and spaces for more.', p.data);
      }
      return askResponse('Pick Personal, Circle, Space, or All.', 'scope', [
        'Personal',
        'Circle',
        'Space',
        'All',
      ]);
    }

    case 'ask_summary_circle': {
      const cl: any[] = state.data?.circles || [];
      const m = cl.find((c: any) => c.name.toLowerCase().includes(lower));
      if (!m) {
        return askResponse(
          'Pick one:',
          'circle',
          cl.map((c: any) => c.name),
        );
      }
      clearConversation(userId);
      return circleSummary(m.name);
    }

    case 'ask_summary_space': {
      const sl: any[] = state.data?.spaces || [];
      const sm = sl.find((s: any) => s.name.toLowerCase().includes(lower));
      if (!sm) {
        return askResponse(
          'Pick one:',
          'space',
          sl.map((s: any) => s.name),
        );
      }
      clearConversation(userId);
      const lines: string[] = [`📊 **${sm.name}**`];
      lines.push(
        `\n💰 **Budget:** ${sm.monthlyBudget ? fmtINR(Number(sm.monthlyBudget)) + '/month' : 'Not set'}`,
      );
      lines.push(`👥 **Members:** ${sm._count?.members || sm.members?.length || 1}`);
      return messageResponse(lines.join('\n'), { spaceName: sm.name });
    }

    case 'ask_circle_name': {
      const name = input.trim();
      if (name.length < 2) {
        return askResponse('Enter a name (min 2 chars).', 'circleName', []);
      }
      clearConversation(userId);
      return handleCreateCircle(userId, `Create circle called ${name}`);
    }

    case 'ask_space_name': {
      const name = input.trim();
      if (name.length < 2) {
        return askResponse('Enter a name (min 2 chars).', 'spaceName', []);
      }
      clearConversation(userId);
      return handleCreateSpace(userId, `Create space called ${name}`);
    }

    default:
      clearConversation(userId);
      return messageResponse("Let's start fresh. How can I help?");
  }
}

// ── Main entry point ───────────────────────────────────────────

export async function processAIChat(userId: string, input: string): Promise<AIResponse> {
  const cleaned = input.trim();
  if (!cleaned) {
    return messageResponse('Please say something!');
  }

  const state = getConversation(userId);
  if (state) {
    if (/^(cancel|never mind|forget it|stop|go back|none)$/i.test(cleaned)) {
      clearConversation(userId);
      return cancelResponse();
    }
    return handleConversationStep(userId, cleaned, state.step, state);
  }

  if (/^(cancel|never mind|forget it|stop|go back)$/i.test(cleaned)) {
    return cancelResponse();
  }

  const intent = detectIntent(cleaned);
  const entities = extractEntities(cleaned);

  if (intent.type === 'greeting') {
    return handleGreeting();
  }
  if (intent.type === 'help') {
    return handleHelp();
  }

  switch (intent.type) {
    case 'add_expense':
      return handleAddExpense(userId, cleaned);
    case 'create_circle':
      return handleCreateCircle(userId, cleaned);
    case 'create_space':
      return handleCreateSpace(userId, cleaned);
    case 'summarize': {
      setConversation(userId, 'ask_summary_scope', 'summarize');
      return askResponse('Which scope?', 'scope', ['Personal', 'Circle', 'Space', 'All']);
    }
    case 'query_category':
    case 'query_circle':
      return handleQuery(entities);
    case 'top_expenses':
      return handleTopExpenses(entities.limit || 5);
    case 'compare_months':
      return handleComparison();
    case 'savings_analysis':
      return handleSavings();
    case 'query_budget':
      return messageResponse(
        "You can check budgets in Settings > Budgets. Say 'Help' for all commands.",
      );
    case 'set_budget':
      return messageResponse('Use the Expenses tab to set budgets, or say Help for all commands.');
    case 'delete_expense':
      return messageResponse(
        'Delete expenses from the transaction list. Say Help for all commands.',
      );
    case 'rename_circle':
      return messageResponse('Rename circles from the Expenses > Circles section.');
    default:
      return messageResponse(
        "I'm not sure how to help with that.\n\nTry:\n" +
          '• "How much did I spend last month?"\n' +
          '• "Add ₹500 for dinner"\n' +
          '• "Show my top expenses"\n' +
          '• "Help" for all commands',
      );
  }
}

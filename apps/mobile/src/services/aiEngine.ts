import { ExtractedEntities, AIResponse, PersonalExpense, Expense } from '../types';
import {
  getAllCircles, getAllSpaces, getExpenses, getPersonalExpenses, getBudgets,
  addExpense, addPersonalExpense, addCircle, addSpace, addBudget,
  updateCircle, updateBudget, deleteExpense, getCategoryBreakdown,
  getSpendingByTimeRange, getTopExpenses, getMonthlyComparison,
  getCircleExpenses, getAllGroups, addGroup,
} from './database';
import {
  getConversation, setConversation, clearConversation,
  cancelResponse, askResponse, messageResponse,
} from './conversationManager';

// ── Intent patterns ──────────────────────────────────────────
const PATTERNS: Record<string, RegExp> = {
  greeting: /^(hi|hello|hey|howdy|good\s*(morning|afternoon|evening)|sup|yo)\b/i,
  help: /\b(help|what can you do|commands|guide|tutorial)\b/i,
  add_expense: /\b(add|new|log|record|track|spend|paid)\s+.*(expense|₹|\$|rs|\d+)/i,
  create_circle: /\b(create|new|make|start)\s+.*\b(circle|group)\b/i,
  create_space: /\b(create|new|make|start)\s+.*\b(space|fund)\b/i,
  summarize: /\b(summar|summary|overview|report|breakdown|recap|how much did i|total|show me my)\b/i,
  query_spending: /\b(how much|total|spend|spent|show|list|find|get|what is)\b.*\b(on|in|for|this|last|my)\b|\b(expense|spending)\b/i,
  query_category: /\b(food|transport|shopping|bills|entertainment|health|grocer|dining|fuel|rent|utility)\b.*\b(expense|spend|cost|total)\b|\bhow much\s+on\s+(food|transport|shopping|bills|entertainment|health)\b/i,
  query_circle: /\b(circle|group)\b.*\b(spend|total|expense|cost|show|list)\b|\bhow much.*(circle|group)\b/i,
  query_space: /\b(space|fund)\b.*\b(spend|total|goal|progress|savings)\b/i,
  query_budget: /\b(budget|limit|alert|remaining)\b|\bhow much.*budget\b/i,
  compare_months: /\b(compare|vs|versus|difference|changed|last month|this month)\b.*\b(month|last|previous)\b|\bmonth over month|monthly comparison|trend\b/i,
  top_expenses: /\b(top|biggest|largest|highest|most expensive)\b/i,
  savings_analysis: /\b(save|saving|savings|reduce|cut|tip|advice|where can i|how can i|cut spending)\b/i,
  set_budget: /\b(set|create|add)\s+.*\b(budget|limit)\b|\bbudget\s+(for|of)\s+/i,
  update_budget: /\b(change|update|edit|increase|decrease|modify)\s+.*\b(budget|limit)\b/i,
  delete_expense: /\b(delete|remove|cancel|erase|undo)\s+.*\b(expense|transaction)\b/i,
  rename_circle: /\b(rename|change name|update name)\s+.*\b(circle|group)\b/i,
  add_member: /\b(add|invite|include)\s+.*\b(to|in)\s+(circle|group)\b/i,
};

// ── Entity extraction ────────────────────────────────────────
const CATEGORY_MAP: Record<string, string> = {
  food: 'Food', restaurant: 'Food', dining: 'Food', dinner: 'Food', lunch: 'Food',
  breakfast: 'Food', groceries: 'Food', grocery: 'Food', snack: 'Food', coffee: 'Food',
  transport: 'Transport', transportation: 'Transport', fuel: 'Transport', gas: 'Transport',
  petrol: 'Transport', cab: 'Transport', uber: 'Transport', bus: 'Transport', train: 'Transport',
  shopping: 'Shopping', clothes: 'Shopping', apparel: 'Shopping', electronics: 'Shopping',
  bills: 'Bills', rent: 'Bills', utilities: 'Bills', electricity: 'Bills', water: 'Bills',
  internet: 'Bills', phone: 'Bills', subscription: 'Bills',
  entertainment: 'Entertainment', movie: 'Entertainment', movies: 'Entertainment',
  game: 'Entertainment', gaming: 'Entertainment', music: 'Entertainment', streaming: 'Entertainment',
  health: 'Health', medical: 'Health', doctor: 'Health', medicine: 'Health', gym: 'Health', fitness: 'Health',
  education: 'Education', course: 'Education', books: 'Education', tuition: 'Education',
};

const TIME_MAP: Record<string, ExtractedEntities['timeRange']> = {
  today: 'today', yesterday: 'yesterday',
  'this week': 'this_week', 'last week': 'last_week',
  'this month': 'this_month', 'last month': 'last_month',
  '7 days': 'last_7_days', 'last 7': 'last_7_days',
  '30 days': 'last_30_days', 'last 30': 'last_30_days', 'past month': 'last_30_days',
};

export function detectIntent(input: string): { type: string; confidence: number } {
  const text = input.trim().toLowerCase();
  if (/^(hi|hello|hey|howdy)\b/.test(text)) return { type: 'greeting', confidence: 0.95 };
  if (/^(cancel|never mind|forget it|stop|go back|none)$/.test(text)) return { type: 'help', confidence: 1 };

  const scores: { type: string; confidence: number }[] = [];
  for (const [type, pattern] of Object.entries(PATTERNS)) {
    const match = text.match(pattern);
    if (match) scores.push({ type, confidence: match[0].length / Math.max(text.length, 1) + 0.5 });
  }
  scores.sort((a, b) => b.confidence - a.confidence);
  return scores.length > 0 && scores[0].confidence > 0.3 ? scores[0] : { type: 'unknown', confidence: 0 };
}

export function extractEntities(input: string): ExtractedEntities {
  const text = input.trim();
  const entities: ExtractedEntities = {};

  // Amount
  const amt = text.match(/(?:₹|\$|Rs\.?\s*)?(\d+(?:\.\d{1,2})?)\s*(?:dollars?|rupees?|usd|inr)?\b/i);
  if (amt) {
    entities.amount = parseFloat(amt[1]);
    entities.currency = /[$]/.test(amt[0]) || /dollar/i.test(amt[0]) ? 'USD' : 'INR';
  }

  // Description (after "for", after "add")
  const forMatch = text.match(/(?:for|on)\s+(.+?)(?:\s+(?:in|to|at|circle|space|group)\s|$)/i);
  const descMatch = text.match(/(?:add\s+(?:expense\s+)?(?::)?\s*)(.+?)(?:\s+(?:in|to|for|at|circle|space|group))?(?:\s+\d+|$)/i);
  const desc = forMatch?.[1] || descMatch?.[1];
  if (desc) entities.description = desc.trim().replace(/\s+\d+\.?\d*$/, '').trim();

  // Category
  for (const [kw, cat] of Object.entries(CATEGORY_MAP)) {
    if (new RegExp(`\\b${kw}\\b`, 'i').test(text)) { entities.category = cat; break; }
  }

  // Time range
  for (const [phrase, range] of Object.entries(TIME_MAP)) {
    if (text.includes(phrase)) { entities.timeRange = range; break; }
  }

  // Names in quotes or after "called"/"named"
  const nameMatch = text.match(/(?:called|named)\s*["""]?(.+?)["""]?(?:\s+with|\s+for|\s*$)/i);
  const quoteMatch = text.match(/["""](.+?)["""]/);
  if (nameMatch) entities.name = nameMatch[1].trim();
  if (quoteMatch && !entities.name) entities.name = quoteMatch[1].trim();

  // Circle/Space name patterns
  const circleMatch = text.match(/(?:circle|group)\s+(?:called|named)?\s*["""]?(.+?)["""]?(?:\s+with|\s*$)/i);
  if (circleMatch) entities.circleName = circleMatch[1].trim();
  const spaceMatch = text.match(/space\s+(?:called|named)?\s*["""]?(.+?)["""]?(?:\s+with|\s*$)/i);
  if (spaceMatch) entities.spaceName = spaceMatch[1].trim();

  // Members after "with"
  const withMatch = text.match(/with\s+(.+?)(?:\s+and\s+|$)/i);
  if (withMatch) {
    const members = withMatch[1].split(/[,&]+/).map((m) => m.trim().replace(/^and\s+/i, '')).filter(Boolean);
    if (members.length > 0 && !/^(me|my|myself|us|our)$/i.test(members[0])) entities.memberNames = members;
  }

  // Limit for top N
  const limitMatch = text.match(/(?:top|last)\s+(\d+)/i);
  if (limitMatch) entities.limit = parseInt(limitMatch[1], 10);

  // Rename detection
  const renameMatch = text.match(/(?:rename|change name of|update name of)\s+["""]?(.+?)["""]?\s+(?:to|as)\s+["""]?(.+?)["""]?$/i);
  if (renameMatch) {
    entities.oldName = renameMatch[1].trim();
    entities.newName = renameMatch[2].trim();
  }

  // Budget limit
  const budgetMatch = text.match(/(?:limit|budget)\s+(?:of|:)?\s*(?:₹|\$)?\s*(\d+)/i);
  if (budgetMatch) entities.budgetLimit = parseFloat(budgetMatch[1]);

  return entities;
}

function fmtINR(n: number): string {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function fmtUSD(n: number): string {
  return '$' + n.toFixed(2);
}

function fmt(n: number, currency?: string): string {
  return currency === 'USD' ? fmtUSD(n) : fmtINR(n);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ── Greeting / Help ────────────────────────────────────────────

function handleGreeting(): AIResponse {
  return messageResponse(
    "Hello! I'm your Dabbu finance assistant. I can help you track and manage your money.\n\n" +
    "Try asking me:\n" +
    '• "How much did I spend last month?"\n' +
    '• "Add ₹500 for dinner"\n' +
    '• "Show my Weekend Trip circle"\n' +
    '• "Where can I save money?"\n' +
    '• "Compare this month vs last month"',
  );
}

function handleHelp(): AIResponse {
  return messageResponse(
    '🤖 **Dabbu AI — Available Commands**\n\n' +
    '**📊 Queries**\n' +
    '• "How much did I spend last month?"\n' +
    '• "Show my food expenses"\n' +
    '• "Show my top 5 expenses"\n' +
    '• "What\'s my biggest expense category?"\n' +
    '• "Compare this month vs last month"\n\n' +
    '**➕ Add Expenses**\n' +
    '• "Add ₹500 for dinner"\n' +
    '• "Add ₹200 for Uber"\n' +
    '• "Add $25 for lunch" (supports USD too)\n\n' +
    '**🔄 Create**\n' +
    '• "Create a circle called Weekend Trip with Mike and Sarah"\n' +
    '• "Create a space called Emergency Fund"\n\n' +
    '**📋 Budgets**\n' +
    '• "Set a budget for Food ₹5000"\n' +
    '• "Show my budgets"\n\n' +
    '**💡 Insights**\n' +
    '• "Where can I save money?"\n' +
    '• "Give me saving tips"',
  );
}

// ── Add Expense Flow ────────────────────────────────────────────

async function handleAddExpense(userId: string, input: string): Promise<AIResponse> {
  const entities = extractEntities(input);
  if (!entities.amount) return askResponse('How much was the expense?', 'amount', []);

  const lower = input.toLowerCase();
  const hasDest = /\b(personal|circle|space|group)\b/i.test(lower);

  if (!hasDest) {
    setConversation(userId, 'ask_expense_destination', 'add_expense', {
      amount: entities.amount, description: entities.description || 'Expense', raw: input, category: entities.category,
    });
    return askResponse(
      `Where should **${fmt(entities.amount, entities.currency)}** for **${entities.description || 'Expense'}** go?`,
      'destination', ['Personal', 'Circle'],
    );
  }

  if (/\b(circle|group)\b/i.test(lower)) {
    const circles = await getAllCircles();
    if (circles.length === 0) {
      setConversation(userId, 'ask_expense_destination', 'add_expense', {
        amount: entities.amount, description: entities.description || 'Expense', raw: input,
      });
      return askResponse("You don't have any circles. Where should this go?", 'destination', ['Personal']);
    }
    setConversation(userId, 'ask_expense_circle', 'add_expense', {
      amount: entities.amount, description: entities.description || 'Expense', raw: input, category: entities.category,
    }, { circles });
    return askResponse('Which circle?', 'circle', circles.map((c) => c.name));
  }

  // Personal
  const expense = await addPersonalExpense({
    amount: entities.amount, category: entities.category || 'Other',
    description: entities.description || 'Expense', date: new Date().toISOString().split('T')[0],
  });
  return messageResponse(
    `✅ **Added** ${fmt(entities.amount, entities.currency)} for **${entities.description || 'Expense'}** (${expense.category})`,
    { amount: expense.amount, description: expense.description, category: expense.category },
  );
}

// ── Create Circle Flow ──────────────────────────────────────────

async function handleCreateCircle(userId: string, input: string): Promise<AIResponse> {
  const entities = extractEntities(input);
  const name = entities.circleName || entities.name;

  if (!name) {
    setConversation(userId, 'ask_circle_name', 'create_circle', { raw: input });
    return askResponse('What should the circle be called?', 'circleName', []);
  }

  const members = entities.memberNames || [];
  const colors = ['#4ECDC4', '#45B7D1', '#FF6B6B', '#96CEB4', '#FFEAA7', '#DDA0DD'];
  const color = colors[Math.floor(Math.random() * colors.length)];

  const circle = await addCircle({
    name, members: ['You', ...members], totalSpent: 0, color,
  });

  const msg = `✅ **Circle "${name}" created!**${members.length > 0 ? `\n👥 Members: You, ${members.join(', ')}` : '\nAdd members anytime.'}`;
  return messageResponse(msg, { groupId: circle.id, groupName: circle.name });
}

// ── Create Space Flow ───────────────────────────────────────────

async function handleCreateSpace(userId: string, input: string): Promise<AIResponse> {
  const entities = extractEntities(input);
  const name = entities.spaceName || entities.name;

  if (!name) {
    setConversation(userId, 'ask_space_name', 'create_space', { raw: input });
    return askResponse('What should the space be called?', 'spaceName', []);
  }

  const space = await addSpace({ name, monthlyGoal: 0, currentAmount: 0 });
  const msg = `✅ **Space "${name}" created!**\nSet a monthly goal anytime (e.g., "Set ${name} goal to ₹5000").`;
  return messageResponse(msg, { spaceId: space.id, spaceName: space.name });
}

// ── Summarize Handler ───────────────────────────────────────────

async function handleSummarize(userId: string): Promise<AIResponse> {
  setConversation(userId, 'ask_summary_scope', 'summarize');
  return askResponse('Which scope?', 'scope', ['Personal', 'Circle', 'Space', 'All']);
}

async function personalSummary(): Promise<AIResponse> {
  const { total, expenses } = await getSpendingByTimeRange('last_30_days');
  const breakdown = await getCategoryBreakdown();
  const top5 = breakdown.slice(0, 5);
  const highest = expenses.length > 0 ? expenses.reduce((a, b) => a.amount > b.amount ? a : b) : null;

  const lines: string[] = ['📊 **Last 30 Days Summary**'];
  lines.push(`\n💰 **Total spent:** ${fmtINR(total)}`);
  lines.push(`📝 **Transactions:** ${expenses.length}`);

  if (top5.length > 0) {
    lines.push('\n**By category:**');
    for (const c of top5) {
      const pct = total > 0 ? ((c.total / total) * 100).toFixed(0) : '0';
      lines.push(`  • ${c.category}: ${fmtINR(c.total)} (${pct}%)`);
    }
  }
  if (highest) {
    const e = highest as PersonalExpense;
    lines.push(`\n🏆 **Highest:** ${fmtINR(e.amount)} — ${e.description} (${formatDate(e.date)})`);
  }
  return messageResponse(lines.join('\n'), { total, categories: top5, count: expenses.length });
}

async function circleSummary(circleName?: string): Promise<AIResponse> {
  const circles = await getAllCircles();
  if (circles.length === 0) return messageResponse("You don't have any circles yet. Create one with 'Create a circle for Trip'!");

  if (!circleName) {
    return askResponse('Which circle?', 'circle', circles.map((c) => c.name));
  }

  const match = circles.find((c) => c.name.toLowerCase().includes(circleName.toLowerCase()));
  if (!match) return messageResponse(`Couldn't find "${circleName}". Your circles: ${circles.map((c) => c.name).join(', ')}`);

  const expenses = await getCircleExpenses(match.id);
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const lines: string[] = [`📊 **${match.name}**`];
  lines.push(`\n💰 **Total spent:** ${fmtINR(total)}`);
  lines.push(`👥 **Members:** ${match.members.join(', ')}`);
  if (expenses.length > 0) {
    lines.push('\n**Recent expenses:**');
    for (const e of expenses.slice(0, 5)) {
      lines.push(`  • ${fmtINR(e.amount)} — ${e.description} (${formatDate(e.date)})`);
    }
  }
  return messageResponse(lines.join('\n'), { total, circleName: match.name, members: match.members, expenses: expenses.slice(0, 5) });
}

async function spaceSummary(spaceName?: string): Promise<AIResponse> {
  const spaces = await getAllSpaces();
  if (spaces.length === 0) return messageResponse("You don't have any spaces yet. Create one with 'Create a space for Emergency Fund'!");

  if (!spaceName) {
    return askResponse('Which space?', 'space', spaces.map((s) => s.name));
  }

  const match = spaces.find((s) => s.name.toLowerCase().includes(spaceName.toLowerCase()));
  if (!match) return messageResponse(`Couldn't find "${spaceName}". Your spaces: ${spaces.map((s) => s.name).join(', ')}`);

  const pct = match.monthlyGoal > 0 ? ((match.currentAmount / match.monthlyGoal) * 100).toFixed(0) : '0';
  const lines: string[] = [`📊 **${match.name}**`];
  lines.push(`\n🎯 **Goal:** ${match.monthlyGoal > 0 ? fmtINR(match.monthlyGoal) + '/month' : 'Not set'}`);
  lines.push(`💰 **Saved:** ${fmtINR(match.currentAmount)} (${pct}%)`);
  if (match.targetDate) lines.push(`📅 **Target:** ${formatDate(match.targetDate)}`);
  return messageResponse(lines.join('\n'), { spaceName: match.name, saved: match.currentAmount, goal: match.monthlyGoal });
}

// ── Spending Query ──────────────────────────────────────────────

async function handleQuery(entities: ExtractedEntities): Promise<AIResponse> {
  if (entities.category) {
    const { total, expenses } = await getSpendingByTimeRange(entities.timeRange || 'last_30_days');
    const filtered = expenses.filter((e) => e.category.toLowerCase() === entities.category!.toLowerCase());
    const catTotal = filtered.reduce((s, e) => s + e.amount, 0);
    const pct = total > 0 ? ((catTotal / total) * 100).toFixed(0) : '0';
    return messageResponse(
      `📊 **${entities.category} Expenses**\n\n` +
      `**Total:** ${fmtINR(catTotal)} (${pct}% of all spending)\n` +
      `**Transactions:** ${filtered.length}\n\n` +
      (filtered.length > 0
        ? '**Recent:**\n' + filtered.slice(0, 5).map((e) => `  • ${fmtINR(e.amount)} — ${e.description} (${formatDate(e.date)})`).join('\n')
        : 'No expenses found in this period.'),
      { category: entities.category, total: catTotal, count: filtered.length },
    );
  }

  if (entities.circleName) return circleSummary(entities.circleName);
  if (entities.spaceName) return spaceSummary(entities.spaceName);
  return personalSummary();
}

// ── Top Expenses ────────────────────────────────────────────────

async function handleTopExpenses(limit: number = 5): Promise<AIResponse> {
  const top = await getTopExpenses(limit);
  if (top.length === 0) return messageResponse('No expenses found.');
  const lines: string[] = [`🏆 **Top ${limit} Expenses**\n`];
  for (let i = 0; i < top.length; i++) {
    const e = top[i];
    const dateStr = 'date' in e ? formatDate((e as any).date) : '';
    lines.push(`${i + 1}. ${fmtINR(e.amount)} — ${e.description}${dateStr ? ` (${dateStr})` : ''}`);
  }
  return messageResponse(lines.join('\n'), { expenses: top });
}

// ── Monthly Comparison ──────────────────────────────────────────

async function handleComparison(): Promise<AIResponse> {
  const comp = await getMonthlyComparison();
  const { currentMonth, lastMonth } = comp;
  const diff = currentMonth.total - lastMonth.total;
  const pct = lastMonth.total > 0 ? ((diff / lastMonth.total) * 100).toFixed(0) : '0';
  const dir = diff > 0 ? '⬆️ increased' : '⬇️ decreased';

  const lines: string[] = ['📊 **Month over Month Comparison**'];
  lines.push(`\n**Last month:** ${fmtINR(lastMonth.total)}`);
  lines.push(`**This month:** ${fmtINR(currentMonth.total)}`);
  lines.push(`\nSpending ${dir} by ${fmtINR(Math.abs(diff))} (${Math.abs(Number(pct))}%)${Number(pct) > 0 ? ' ⚠️' : ' ✅'}`);

  // Show category changes
  const allCats = new Set([...Object.keys(lastMonth.categories), ...Object.keys(currentMonth.categories)]);
  if (allCats.size > 0) {
    lines.push('\n**By category:**');
    for (const cat of allCats) {
      const prev = lastMonth.categories[cat] || 0;
      const curr = currentMonth.categories[cat] || 0;
      const catDiff = curr - prev;
      if (catDiff !== 0) {
        lines.push(`  • ${cat}: ${fmtINR(prev)} → ${fmtINR(curr)} (${catDiff > 0 ? '+' : ''}${fmtINR(catDiff)})`);
      }
    }
  }
  return messageResponse(lines.join('\n'), comp);
}

// ── Savings Analysis ────────────────────────────────────────────

async function handleSavings(): Promise<AIResponse> {
  const breakdown = await getCategoryBreakdown();
  const { total } = await getSpendingByTimeRange('last_30_days');
  const budgets = await getBudgets();

  if (breakdown.length === 0) return messageResponse("Not enough data yet. Start tracking expenses to get insights!");

  const top3 = breakdown.slice(0, 3);
  const lines: string[] = ['💡 **Spending Insights**'];
  lines.push(`\n💰 **Total spent (30 days):** ${fmtINR(total)}`);

  lines.push('\n**Top spending categories:**');
  for (const c of top3) {
    const pct = ((c.total / total) * 100).toFixed(0);
    lines.push(`  • ${c.category}: ${fmtINR(c.total)} (${pct}%)`);
  }

  // Budget check
  const overBudget = budgets.filter((b) => b.currentSpent > b.limit);
  if (overBudget.length > 0) {
    lines.push('\n⚠️ **Over budget:**');
    for (const b of overBudget) {
      lines.push(`  • ${b.category}: ${fmtINR(b.currentSpent)} / ${fmtINR(b.limit)}`);
    }
  }

  // Tips
  if (top3.length > 0) {
    const biggest = top3[0];
    const potential = Math.round(biggest.total * 0.2);
    lines.push(`\n💡 **Tip:** ${biggest.category} is ${((biggest.total / total) * 100).toFixed(0)}% of your spending. Cutting 20% could save **${fmtINR(potential)}/month**.`);
  }

  if (budgets.length === 0) {
    lines.push('\n📋 Consider setting budgets to track spending: "Set a Food budget ₹5000"');
  }

  return messageResponse(lines.join('\n'), { breakdown, total, top3, budgets: budgets.length });
}

// ── Budget Handlers ─────────────────────────────────────────────

async function handleSetBudget(input: string): Promise<AIResponse> {
  const entities = extractEntities(input);
  const cat = entities.category || entities.name;

  if (!cat) {
    return askResponse('Which category should the budget be for?', 'budgetCategory', ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health']);
  }

  const limit = entities.budgetLimit || entities.amount;
  if (!limit) {
    setConversation('user', 'ask_budget_amount', 'set_budget', { category: cat });
    return askResponse(`What's the monthly limit for **${cat}**?`, 'budgetAmount', []);
  }

  const now = new Date();
  const budget = await addBudget({
    category: cat, limit, currentSpent: 0, month: now.getMonth() + 1, year: now.getFullYear(),
  });
  return messageResponse(`✅ **Budget set!** ${cat}: ${fmtINR(limit)}/month`, { budget });
}

async function handleShowBudgets(): Promise<AIResponse> {
  const budgets = await getBudgets();
  if (budgets.length === 0) return messageResponse("No budgets set. Try 'Set a Food budget ₹5000'.");

  const lines: string[] = ['📊 **Your Budgets**\n'];
  for (const b of budgets) {
    const pct = b.limit > 0 ? ((b.currentSpent / b.limit) * 100).toFixed(0) : '0';
    const status = Number(pct) > 100 ? '⚠️ OVER' : Number(pct) > 80 ? '⚠️' : '✅';
    lines.push(`  ${status} **${b.category}**: ${fmtINR(b.currentSpent)} / ${fmtINR(b.limit)} (${pct}%)`);
  }
  return messageResponse(lines.join('\n'), { budgets });
}

// ── Delete Expense ──────────────────────────────────────────────

async function handleDeleteExpense(input: string): Promise<AIResponse> {
  const entities = extractEntities(input);
  const { expenses } = await getSpendingByTimeRange('last_30_days');

  if (expenses.length === 0) return messageResponse('No expenses to delete.');

  // Try to find matching expense
  const matchIdx = entities.description
    ? expenses.findIndex((e) => e.description.toLowerCase().includes(entities.description!.toLowerCase()))
    : 0;

  if (matchIdx === -1) return messageResponse(`Couldn't find an expense matching "${entities.description}".`);

  const target = expenses[matchIdx];
  await deleteExpense(target.id);

  return messageResponse(`🗑️ Deleted **${fmtINR(target.amount)}** for **${target.description}**`, { deleted: target });
}

// ── Rename Circle ───────────────────────────────────────────────

async function handleRenameCircle(input: string): Promise<AIResponse> {
  const entities = extractEntities(input);
  const circles = await getAllCircles();

  const oldName = entities.oldName || entities.name;
  const newName = entities.newName;

  if (!oldName || !newName) {
    return messageResponse('Try: "Rename Weekend Trip to Beach Trip"');
  }

  const match = circles.find((c) => c.name.toLowerCase().includes(oldName.toLowerCase()));
  if (!match) return messageResponse(`Couldn't find circle "${oldName}".`);

  await updateCircle(match.id, { name: newName });
  return messageResponse(`✅ Circle renamed from **${match.name}** to **${newName}**`, { oldName: match.name, newName });
}

// ── Add Member to Circle ────────────────────────────────────────

async function handleAddMember(input: string): Promise<AIResponse> {
  const entities = extractEntities(input);
  const circles = await getAllCircles();

  const circleName = entities.circleName || entities.name;
  if (!circleName) {
    return askResponse('Which circle?', 'circle', circles.map((c) => c.name));
  }

  const match = circles.find((c) => c.name.toLowerCase().includes(circleName.toLowerCase()));
  if (!match) return messageResponse(`Couldn't find circle "${circleName}".`);

  if (!entities.memberNames || entities.memberNames.length === 0) {
    setConversation('user', 'ask_member_name', 'add_member', { circleId: match.id, circleName: match.name });
    return askResponse(`Who should be added to **${match.name}**?`, 'memberName', []);
  }

  const updated = [...new Set([...match.members, ...entities.memberNames])];
  await updateCircle(match.id, { members: updated });
  return messageResponse(`✅ Added ${entities.memberNames.join(', ')} to **${match.name}**!`, { circleName: match.name, members: updated });
}

// ── Conversation Step Router ────────────────────────────────────

export async function handleConversationStep(
  userId: string, input: string, step: string, state: any,
): Promise<AIResponse> {
  const lower = input.trim().toLowerCase();

  switch (step) {
    case 'ask_expense_destination': {
      if (lower.includes('personal') || lower.includes('my')) {
        clearConversation(userId);
        const expense = await addPersonalExpense({
          amount: state.context.amount, category: state.context.category || 'Other',
          description: state.context.description || 'Expense',
          date: new Date().toISOString().split('T')[0],
        });
        return messageResponse(`✅ **Added** ${fmtINR(expense.amount)} for **${expense.description}** (Personal)`, { expense });
      }
      if (lower.includes('circle') || lower.includes('group')) {
        const circles = await getAllCircles();
        if (circles.length === 0) {
          clearConversation(userId);
          return messageResponse("You don't have any circles. Create one first!");
        }
        setConversation(userId, 'ask_expense_circle', 'add_expense', state.context, { circles });
        return askResponse('Which circle?', 'circle', circles.map((c) => c.name));
      }
      return askResponse('Please pick Personal or Circle.', 'destination', ['Personal', 'Circle']);
    }

    case 'ask_expense_circle': {
      const circles: any[] = state.data?.circles || [];
      const match = circles.find((c: any) => c.name.toLowerCase().includes(lower));
      if (!match) {
        return askResponse('Pick a circle:', 'circle', circles.map((c: any) => c.name));
      }
      clearConversation(userId);
      const expense = await addExpense({
        amount: state.context.amount, category: state.context.category || 'Other',
        description: state.context.description || 'Expense',
        date: new Date().toISOString().split('T')[0], circleId: match.id,
      });
      return messageResponse(
        `✅ **${fmtINR(expense.amount)}** for **${expense.description}** added to **${match.name}** ✅`,
        { expense, circleName: match.name },
      );
    }

    case 'ask_summary_scope': {
      if (lower.includes('personal')) { clearConversation(userId); return personalSummary(); }
      if (lower.includes('circle')) {
        const circles = await getAllCircles();
        if (circles.length === 0) { clearConversation(userId); return messageResponse("No circles yet!"); }
        setConversation(userId, 'ask_summary_circle', 'summarize', {}, { circles });
        return askResponse('Which circle?', 'circle', circles.map((c) => c.name));
      }
      if (lower.includes('space')) {
        const spaces = await getAllSpaces();
        if (spaces.length === 0) { clearConversation(userId); return messageResponse("No spaces yet!"); }
        setConversation(userId, 'ask_summary_space', 'summarize', {}, { spaces });
        return askResponse('Which space?', 'space', spaces.map((s) => s.name));
      }
      if (lower.includes('all')) {
        clearConversation(userId);
        const personal = await personalSummary();
        return messageResponse(personal.message + '\n\n💡 Use "Circle" or "Space" for specific summaries.', personal.data);
      }
      return askResponse('Pick Personal, Circle, Space, or All.', 'scope', ['Personal', 'Circle', 'Space', 'All']);
    }

    case 'ask_summary_circle': {
      const cl: any[] = state.data?.circles || [];
      const m = cl.find((c: any) => c.name.toLowerCase().includes(lower));
      if (!m) return askResponse('Pick a circle:', 'circle', cl.map((c: any) => c.name));
      clearConversation(userId);
      return circleSummary(m.name);
    }

    case 'ask_summary_space': {
      const sl: any[] = state.data?.spaces || [];
      const sm = sl.find((s: any) => s.name.toLowerCase().includes(lower));
      if (!sm) return askResponse('Pick a space:', 'space', sl.map((s: any) => s.name));
      clearConversation(userId);
      return spaceSummary(sm.name);
    }

    case 'ask_circle_name': {
      const name = input.trim();
      if (name.length < 2) return askResponse('Enter a name (at least 2 chars).', 'circleName', []);
      clearConversation(userId);
      return handleCreateCircle(userId, `Create circle called ${name}`);
    }

    case 'ask_space_name': {
      const name = input.trim();
      if (name.length < 2) return askResponse('Enter a name (at least 2 chars).', 'spaceName', []);
      clearConversation(userId);
      return handleCreateSpace(userId, `Create space called ${name}`);
    }

    case 'ask_budget_category': {
      clearConversation(userId);
      return handleSetBudget(`Set budget for ${input.trim()}`);
    }

    case 'ask_budget_amount': {
      const amt = parseFloat(input.replace(/[₹$,]/g, ''));
      if (isNaN(amt) || amt <= 0) return askResponse('Enter a valid amount.', 'budgetAmount', []);
      clearConversation(userId);
      const budget = await addBudget({
        category: state.context.category, limit: amt, currentSpent: 0,
        month: new Date().getMonth() + 1, year: new Date().getFullYear(),
      });
      return messageResponse(`✅ **Budget set!** ${budget.category}: ${fmtINR(budget.limit)}/month`, { budget });
    }

    case 'ask_member_name': {
      const name = input.trim();
      if (name.length < 2) return askResponse('Enter a name.', 'memberName', []);
      clearConversation(userId);
      return handleAddMember(`Add ${name} to ${state.context.circleName}`);
    }

    default:
      clearConversation(userId);
      return messageResponse("Let's start fresh. How can I help?");
  }
}

// ── Main Entry Point ────────────────────────────────────────────

export async function processAIChat(userId: string, input: string): Promise<AIResponse> {
  const cleaned = input.trim();
  if (!cleaned) return messageResponse('Please say something!');

  const state = getConversation(userId);
  if (state) {
    if (/^(cancel|never mind|forget it|stop|go back|none)$/i.test(cleaned)) {
      clearConversation(userId);
      return cancelResponse();
    }
    return handleConversationStep(userId, cleaned, state.step, state);
  }

  if (/^(cancel|never mind|forget it|stop|go back)$/i.test(cleaned)) return cancelResponse();

  const intent = detectIntent(cleaned);
  const entities = extractEntities(cleaned);

  // Greeting / Help
  if (intent.type === 'greeting') return handleGreeting();
  if (intent.type === 'help') return handleHelp();

  // Route by intent
  switch (intent.type) {
    case 'add_expense':
      return handleAddExpense(userId, cleaned);
    case 'create_circle':
      return handleCreateCircle(userId, cleaned);
    case 'create_space':
      return handleCreateSpace(userId, cleaned);
    case 'summarize':
      return handleSummarize(userId);
    case 'query_spending':
    case 'query_category':
    case 'query_circle':
    case 'query_space':
      return handleQuery(entities);
    case 'top_expenses':
      return handleTopExpenses(entities.limit || 5);
    case 'compare_months':
      return handleComparison();
    case 'savings_analysis':
      return handleSavings();
    case 'query_budget':
      return handleShowBudgets();
    case 'set_budget':
      return handleSetBudget(cleaned);
    case 'update_budget':
      return handleSetBudget(cleaned);
    case 'delete_expense':
      return handleDeleteExpense(cleaned);
    case 'rename_circle':
      return handleRenameCircle(cleaned);
    case 'add_member':
      return handleAddMember(cleaned);
    default:
      // Fallback to general help
      return messageResponse(
        "I'm not sure how to help with that.\n\nTry:\n" +
        '• "How much did I spend last month?"\n' +
        '• "Add ₹500 for dinner"\n' +
        '• "Show my top expenses"\n' +
        '• "Help" for all commands',
      );
  }
}

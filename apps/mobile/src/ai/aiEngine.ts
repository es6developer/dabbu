import { api } from '../services/api';
import { AIResponse, ParsedIntent, ExtractedEntities } from '../types/ai';
import {
  getConversation,
  setConversation,
  clearConversation,
  cancelResponse,
  askResponse,
  messageResponse,
} from './conversationManager';

// ── Intent Patterns ────────────────────────────────────────────
const PATTERNS = {
  greeting: /\b(hi|hello|hey|howdy|good\s*(morning|afternoon|evening)|sup|yo)\b/i,
  help: /\b(help|what can you do|commands|guide|tutorial)\b/i,
  add_expense: /\b(add|new|log|record|track)\s+.*(expense|spend|paid|cost|₹|\$|rs)\b|\b(expense|spend|paid)\s+(of|:)?\s*(\d+)/i,
  create_circle: /\b(create|new|make|start)\s+.*\b(circle|group)\b|\b(circle|group)\s+(called|named)\s+/i,
  create_space: /\b(create|new|make|start)\s+.*\b(space|fund)\b|\b(space|fund)\s+(called|named)\s+/i,
  summarize: /\b(summar|summary|overview|report|breakdown|recap)\b|\b(how much|total)\s+(did I|have I|spent)\b|\bshow\s+(me\s+)?(my\s+)?(spend|expense|finance)\b/i,
  query: /\b(how much|total|spend|spent|show|list|find|get)\b.*\b(on|in|for|this|last|my|category|circle|space)\b/i,
  compare: /\b(compare|vs|versus|difference|changed|last month|this month|month over month|trend)\b/i,
  savings_analysis: /\b(save|saving|savings|reduce|cut|tip|advice|where can i|how can i)\b/i,
  set_budget: /\b(set|create|add|change|update)\s+.*\b(budget|limit|alert)\b/i,
  delete_expense: /\b(delete|remove|cancel|erase|undo)\s+.*\b(expense|transaction)\b/i,
  top_expenses: /\b(top|biggest|largest|highest)\s+\d+\s+(expense|transaction|spend)\b/i,
};

// ── Category Keywords ──────────────────────────────────────────
const CATEGORY_KEYWORDS: Record<string, string> = {
  food: 'Food', restaurant: 'Food', dining: 'Food', dinner: 'Food',
  lunch: 'Food', breakfast: 'Food', groceries: 'Food', grocery: 'Food',
  transport: 'Transport', transportation: 'Transport', fuel: 'Transport',
  gas: 'Transport', petrol: 'Transport', cab: 'Transport', uber: 'Transport',
  shopping: 'Shopping', clothes: 'Shopping',
  bills: 'Bills', rent: 'Bills', utilities: 'Bills', electricity: 'Bills',
  entertainment: 'Entertainment', movie: 'Entertainment', streaming: 'Entertainment',
  health: 'Health', medical: 'Health', gym: 'Health',
};

// ── Time Range Keywords ────────────────────────────────────────
const TIME_KEYWORDS: Record<string, ExtractedEntities['timeRange']> = {
  today: 'today', yesterday: 'yesterday',
  'this week': 'this_week', 'last week': 'last_week',
  'this month': 'this_month', 'last month': 'last_month',
  '30 days': 'last_30_days', 'last 30': 'last_30_days',
};

// ── Intent Detection ───────────────────────────────────────────
export function detectIntent(input: string): ParsedIntent {
  const text = input.trim();
  const entities = extractEntities(text);

  if (/^(cancel|never mind|forget it|stop|go back|none)$/i.test(text)) {
    return { type: 'help', confidence: 1, entities, raw: text };
  }

  if (/^(hi|hello|hey|howdy)\b/i.test(text)) {
    return { type: 'greeting', confidence: 0.9, entities, raw: text };
  }

  const scores: Array<{ type: ParsedIntent['type']; score: number }> = [];
  for (const [type, pattern] of Object.entries(PATTERNS)) {
    const matches = text.match(pattern);
    if (matches) {
      scores.push({ type: type as ParsedIntent['type'], score: matches[0].length / text.length + 0.5 });
    }
  }
  scores.sort((a, b) => b.score - a.score);

  if (scores.length > 0 && scores[0].score > 0.3) {
    return { type: scores[0].type, confidence: scores[0].score, entities, raw: text };
  }
  return { type: 'unknown', confidence: 0, entities, raw: text };
}

// ── Entity Extraction ──────────────────────────────────────────
export function extractEntities(input: string): ExtractedEntities {
  const text = input.trim();
  const entities: ExtractedEntities = {};

  const amountMatch = text.match(/(?:₹|\$|Rs\.?\s*)?(\d+(?:\.\d{1,2})?)\s*(?:dollars?|rupees?)?\b/i);
  if (amountMatch) entities.amount = parseFloat(amountMatch[1]);

  const forMatch = text.match(/(?:for|on)\s+(.+?)(?:\s+(?:in|to|at|circle|space|group)\s|$)/i);
  const descMatch = text.match(/(?:add\s+(?:expense\s+)?(?::)?\s*)(.+?)(?:\s+(?:in|to|for|at|circle|space|group|personal))?(?:\s+\d+|$)/i);
  const description = forMatch?.[1] || descMatch?.[1];
  if (description) entities.description = description.trim().replace(/\s+\d+\.?\d*$/, '').trim();

  for (const [keyword, cat] of Object.entries(CATEGORY_KEYWORDS)) {
    if (new RegExp(`\\b${keyword}\\b`, 'i').test(text)) { entities.category = cat; break; }
  }
  for (const [phrase, range] of Object.entries(TIME_KEYWORDS)) {
    if (text.toLowerCase().includes(phrase)) { entities.timeRange = range; break; }
  }

  const nameMatch = text.match(/(?:called|named)\s*["""]?(.+?)["""]?(?:\s+with|\s+for|\s*$)/i);
  if (nameMatch) entities.name = nameMatch[1].trim();

  const circleMatch = text.match(/(?:circle|group)\s+(?:called|named)?\s*["""]?(.+?)["""]?(?:\s+with|\s*$)/i);
  if (circleMatch) entities.circleName = circleMatch[1].trim();

  const spaceMatch = text.match(/space\s+(?:called|named)?\s*["""]?(.+?)["""]?(?:\s+with|\s*$)/i);
  if (spaceMatch) entities.spaceName = spaceMatch[1].trim();

  const withMatch = text.match(/with\s+(.+?)(?:\s+and\s+|$)/i);
  if (withMatch) {
    const members = withMatch[1].split(/[,&]+/).map((m) => m.trim().replace(/^and\s+/i, '')).filter(Boolean);
    if (members.length > 0 && !members[0].match(/^(me|my|myself|us|our)$/i)) entities.memberNames = members;
  }

  const limitMatch = text.match(/(?:top|last)\s+(\d+)/i);
  if (limitMatch) entities.limit = parseInt(limitMatch[1], 10);

  return entities;
}

// ── Backend API helper ─────────────────────────────────────────
async function callBackend(prompt: string): Promise<{ action: string; message: string; data?: any; options?: string[]; field?: string } | null> {
  try {
    const res = await api.post<any>('/ai/chat', { prompt });
    return res?.data || res || null;
  } catch {
    return null;
  }
}

// ── Intent Handlers ─────────────────────────────────────────────

function handleGreeting(): AIResponse {
  return messageResponse(
    "Hey! I'm Dabbu AI. I can help you manage your finances.\n\n" +
    '**Try asking:**\n' +
    '• "Add expense ₹500 for dinner"\n' +
    '• "Summarize my spending"\n' +
    '• "Show my food expenses"\n' +
    '• "Create a circle for Trip"\n' +
    '• "Where can I save money?"',
  );
}

function handleHelp(): AIResponse {
  return messageResponse(
    '**Dabbu AI Commands**\n\n' +
    '**Add Expenses**\n' +
    '• "Add expense ₹500 for dinner"\n' +
    '• "Add ₹200 for Uber to Office circle"\n\n' +
    '**View Reports**\n' +
    '• "Summarize my spending"\n' +
    '• "Show my food expenses"\n' +
    '• "Compare this month vs last month"\n\n' +
    '**Create & Manage**\n' +
    '• "Create a circle for Vacation"\n' +
    '• "Create a space for Emergency Fund"\n' +
    '• "Set a budget for Dining ₹5000"\n\n' +
    '**Insights**\n' +
    '• "Where can I save money?"',
  );
}

async function handleAddExpenseFlow(input: string, userId: string): Promise<AIResponse> {
  const entities = extractEntities(input);
  if (!entities.amount) {
    return messageResponse('How much was the expense? Try "Add expense ₹500 for dinner".');
  }

  const lower = input.toLowerCase();
  const hasDest = /\b(personal|circle|space|group)\b/i.test(lower);

  if (!hasDest) {
    setConversation(userId, 'ask_expense_destination', 'add_expense', {
      amount: entities.amount, description: entities.description || 'Expense', raw: input,
    });
    return askResponse(
      `Where should **₹${entities.amount}** for **${entities.description || 'Expense'}** go?`,
      'destination', ['Personal', 'Circle'],
    );
  }

  const backend = await callBackend(input);
  if (backend) {
    if (backend.action === 'ask' && backend.options?.length) {
      setConversation(userId, 'ask_expense_destination', 'add_expense', { raw: input });
      return askResponse(backend.message, backend.field || 'destination', backend.options);
    }
    return messageResponse(backend.message, backend.data);
  }
  return messageResponse(`₹${entities.amount} for **${entities.description || 'Expense'}** saved!`);
}

async function handleCreateCircleFlow(input: string, userId: string): Promise<AIResponse> {
  const entities = extractEntities(input);
  if (!entities.circleName && !entities.name) {
    setConversation(userId, 'ask_circle_name', 'create_circle', { raw: input });
    return askResponse('What should the circle be called?', 'circleName', []);
  }
  const backend = await callBackend(input);
  return messageResponse(backend?.message || `Circle created!`, backend?.data);
}

async function handleCreateSpaceFlow(input: string, userId: string): Promise<AIResponse> {
  const entities = extractEntities(input);
  if (!entities.spaceName && !entities.name) {
    setConversation(userId, 'ask_space_name', 'create_space', { raw: input });
    return askResponse('What should the space be called?', 'spaceName', []);
  }
  const backend = await callBackend(input);
  return messageResponse(backend?.message || `Space created!`, backend?.data);
}

async function handleSummarizeFlow(userId: string): Promise<AIResponse> {
  setConversation(userId, 'ask_summary_scope', 'summarize');
  return askResponse('Which scope?', 'scope', ['Personal', 'Circle', 'Space', 'All']);
}

async function handleSavingsFlow(): Promise<AIResponse> {
  const backend = await callBackend('Show me where I can save money');
  return messageResponse(backend?.message || 'Analyzing your spending...', backend?.data);
}

// ── Conversation Step Handler ───────────────────────────────────

export async function handleConversationStep(
  userId: string,
  input: string,
  step: string,
  state: any,
): Promise<AIResponse> {
  const lower = input.toLowerCase().trim();

  // Route conversation steps to backend for actual data work
  switch (step) {
    case 'ask_expense_destination': {
      if (lower.includes('personal')) {
        clearConversation(userId);
        const backend = await callBackend(state.context.raw || input);
        return messageResponse(backend?.message || 'Expense saved!', backend?.data);
      }
      if (lower.includes('circle')) {
        const backend = await callBackend(state.context.raw || input);
        if (backend?.action === 'ask' && backend.options?.length) {
          setConversation(userId, 'ask_expense_circle', 'add_expense', state.context, { options: backend.options });
          return askResponse(backend.message, 'circle', backend.options);
        }
        clearConversation(userId);
        return messageResponse(backend?.message || 'Expense saved to circle!', backend?.data);
      }
      return askResponse('Pick Personal or Circle.', 'destination', ['Personal', 'Circle']);
    }

    case 'ask_expense_circle': {
      const backend = await callBackend(input);
      clearConversation(userId);
      return messageResponse(backend?.message || 'Expense added to circle!', backend?.data);
    }

    case 'ask_summary_scope': {
      if (lower.includes('personal') || lower.includes('my')) {
        clearConversation(userId);
        const backend = await callBackend('Summarize my last 30 days of expenses');
        return messageResponse(backend?.message || 'No data available.', backend?.data);
      }
      if (lower.includes('circle') || lower.includes('group')) {
        setConversation(userId, 'ask_summary_circle', 'summarize');
        return askResponse('Which circle?', 'circle', []);
      }
      if (lower.includes('space')) {
        setConversation(userId, 'ask_summary_space', 'summarize');
        return askResponse('Which space?', 'space', []);
      }
      if (lower.includes('all')) {
        clearConversation(userId);
        const backend = await callBackend('Summarize my last 30 days of expenses');
        return messageResponse((backend?.message || '') + '\n\nCheck your circles and spaces for more details.', backend?.data);
      }
      return askResponse('Pick Personal, Circle, Space, or All.', 'scope', ['Personal', 'Circle', 'Space', 'All']);
    }

    case 'ask_summary_circle':
    case 'ask_summary_space': {
      clearConversation(userId);
      const backend = await callBackend(input);
      return messageResponse(backend?.message || 'Summary not available.', backend?.data);
    }

    case 'ask_circle_name': {
      if (input.trim().length < 2) return askResponse('Enter a name (at least 2 chars).', 'circleName', []);
      clearConversation(userId);
      const backend = await callBackend(`Create circle called ${input.trim()}`);
      return messageResponse(backend?.message || `Circle "${input.trim()}" created!`, backend?.data);
    }

    case 'ask_space_name': {
      if (input.trim().length < 2) return askResponse('Enter a name (at least 2 chars).', 'spaceName', []);
      clearConversation(userId);
      const backend = await callBackend(`Create space called ${input.trim()}`);
      return messageResponse(backend?.message || `Space "${input.trim()}" created!`, backend?.data);
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

  // Check for pending conversation
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

  const parsed = detectIntent(cleaned);

  // Local-only intents
  if (parsed.type === 'greeting') return handleGreeting();
  if (parsed.type === 'help') return handleHelp();

  // Backend-routed intents
  switch (parsed.type) {
    case 'add_expense':
      return handleAddExpenseFlow(cleaned, userId);
    case 'create_circle':
      return handleCreateCircleFlow(cleaned, userId);
    case 'create_space':
      return handleCreateSpaceFlow(cleaned, userId);
    case 'summarize':
      return handleSummarizeFlow(userId);
    case 'savings_analysis':
      return handleSavingsFlow();
    default: {
      // Route everything else to backend
      // For query-like patterns, try backend directly
      if (parsed.type !== 'unknown' || /(show|how much|what|tell|find|list|get)/i.test(cleaned)) {
        const backend = await callBackend(cleaned);
        if (backend) {
          if (backend.action === 'ask' && backend.options?.length) {
            return askResponse(backend.message, backend.field || 'general', backend.options, backend.data);
          }
          return messageResponse(backend.message, backend.data);
        }
      }
      return messageResponse("I'm not sure how to help with that. Try 'Help' to see what I can do!");
    }
  }
}

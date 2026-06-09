export type IntentType =
  | 'add_expense'
  | 'create_circle'
  | 'create_space'
  | 'summarize'
  | 'query_spending'
  | 'query_category'
  | 'query_circle'
  | 'query_space'
  | 'query_budget'
  | 'compare'
  | 'savings_analysis'
  | 'set_budget'
  | 'delete_expense'
  | 'help'
  | 'greeting'
  | 'general_chat'
  | 'unknown';

export type ConversationStep =
  | 'idle'
  | 'ask_expense_destination'
  | 'ask_expense_circle'
  | 'ask_expense_space'
  | 'ask_expense_category'
  | 'ask_circle_name'
  | 'ask_circle_members'
  | 'ask_space_name'
  | 'ask_space_goal'
  | 'ask_summary_scope'
  | 'ask_summary_circle'
  | 'ask_summary_space'
  | 'ask_budget_category'
  | 'ask_budget_amount';

export interface ConversationState {
  step: ConversationStep;
  intent: IntentType;
  context: Record<string, any>;
  data: Record<string, any>;
}

export interface ParsedIntent {
  type: IntentType;
  confidence: number;
  entities: ExtractedEntities;
  raw: string;
}

export interface ExtractedEntities {
  amount?: number;
  currency?: string;
  description?: string;
  category?: string;
  circleName?: string;
  spaceName?: string;
  groupName?: string;
  memberNames?: string[];
  timeRange?: 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'last_30_days';
  limit?: number;
  name?: string;
  budgetLimit?: number;
}

export interface AIResponse {
  action: 'message' | 'ask' | 'action' | 'error' | 'cancel';
  message: string;
  data?: any;
  options?: string[];
  field?: string;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  action?: string;
  data?: any;
  options?: string[];
  field?: string;
  timestamp: number;
}

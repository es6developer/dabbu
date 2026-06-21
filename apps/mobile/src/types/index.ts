export interface Circle {
  id: string;
  name: string;
  members: string[];
  createdAt: string;
  totalSpent: number;
  color: string;
}

export interface Space {
  id: string;
  name: string;
  monthlyGoal: number;
  currentAmount: number;
  createdAt: string;
  targetDate?: string;
}

export interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  circleId?: string;
  spaceId?: string;
  receiptUri?: string;
}

export interface PersonalExpense {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
}

export interface Budget {
  id: string;
  category: string;
  limit: number;
  currentSpent: number;
  month: number;
  year: number;
}

export interface Group {
  id: string;
  name: string;
  members: string[];
  sharedExpenses: { amount: number; description: string; paidBy: string; date: string }[];
}

export type IntentType =
  | 'greeting'
  | 'help'
  | 'add_expense'
  | 'create_circle'
  | 'create_space'
  | 'summarize'
  | 'query_spending'
  | 'query_category'
  | 'query_circle'
  | 'query_space'
  | 'query_budget'
  | 'compare_months'
  | 'top_expenses'
  | 'savings_analysis'
  | 'set_budget'
  | 'update_budget'
  | 'delete_expense'
  | 'rename_circle'
  | 'add_member'
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
  | 'ask_budget_amount'
  | 'ask_member_name'
  | 'ask_new_name';

export interface ConversationState {
  step: ConversationStep;
  intent: IntentType;
  context: Record<string, any>;
  data: Record<string, any>;
}

export interface ExtractedEntities {
  amount?: number;
  currency?: string;
  description?: string;
  category?: string;
  circleName?: string;
  spaceName?: string;
  memberNames?: string[];
  timeRange?: 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'last_7_days' | 'last_30_days';
  limit?: number;
  name?: string;
  budgetLimit?: number;
  oldName?: string;
  newName?: string;
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

export interface AppData {
  circles: Circle[];
  spaces: Space[];
  expenses: Expense[];
  personalExpenses: PersonalExpense[];
  budgets: Budget[];
  groups: Group[];
}

export const DEFAULT_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
export const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Education', 'Other'];

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

export function today(): string {
  return new Date().toISOString().split('T')[0];
}

export function currentMonth(): number {
  return new Date().getMonth() + 1;
}

export function currentYear(): number {
  return new Date().getFullYear();
}

export function seedData(): AppData {
  return {
    circles: [
      { id: generateId(), name: 'Weekend Trip', members: ['You', 'Mike', 'Sarah'], createdAt: '2024-09-01', totalSpent: 340, color: '#4ECDC4' },
      { id: generateId(), name: 'Book Club', members: ['You', 'Alice', 'Bob', 'Carol'], createdAt: '2024-08-15', totalSpent: 120, color: '#45B7D1' },
      { id: generateId(), name: 'Family', members: ['You', 'Mom', 'Dad'], createdAt: '2024-07-01', totalSpent: 890, color: '#FF6B6B' },
    ],
    spaces: [
      { id: generateId(), name: 'Emergency Fund', monthlyGoal: 500, currentAmount: 1200, createdAt: '2024-01-01' },
      { id: generateId(), name: 'New Car', monthlyGoal: 1000, currentAmount: 3500, createdAt: '2024-03-01', targetDate: '2025-06-01' },
    ],
    expenses: [
      { id: generateId(), amount: 50, category: 'Food', description: 'Dinner', date: '2024-10-20', circleId: undefined },
      { id: generateId(), amount: 120, category: 'Travel', description: 'Hotel', date: '2024-10-19', circleId: undefined },
      { id: generateId(), amount: 45, category: 'Transport', description: 'Gas', date: '2024-10-18', circleId: undefined },
      { id: generateId(), amount: 125, category: 'Entertainment', description: 'Activities', date: '2024-10-17', circleId: undefined },
    ],
    personalExpenses: [
      { id: generateId(), amount: 450, category: 'Food', description: 'Groceries', date: '2024-10-15' },
      { id: generateId(), amount: 280, category: 'Transport', description: 'Uber rides', date: '2024-10-12' },
      { id: generateId(), amount: 210, category: 'Shopping', description: 'Clothes', date: '2024-10-10' },
      { id: generateId(), amount: 180, category: 'Bills', description: 'Electricity', date: '2024-10-05' },
      { id: generateId(), amount: 127, category: 'Entertainment', description: 'Netflix & Spotify', date: '2024-10-03' },
      { id: generateId(), amount: 89, category: 'Food', description: 'Restaurant dinner', date: '2024-10-15' },
      { id: generateId(), amount: 55, category: 'Food', description: 'Coffee & snacks', date: '2024-10-08' },
      { id: generateId(), amount: 35, category: 'Transport', description: 'Bus pass', date: '2024-10-01' },
    ],
    budgets: [
      { id: generateId(), category: 'Food', limit: 600, currentSpent: 450, month: 10, year: 2024 },
      { id: generateId(), category: 'Transport', limit: 300, currentSpent: 280, month: 10, year: 2024 },
      { id: generateId(), category: 'Shopping', limit: 200, currentSpent: 210, month: 10, year: 2024 },
    ],
    groups: [
      { id: generateId(), name: 'Roommates', members: ['You', 'John', 'Dave'], sharedExpenses: [] },
    ],
  };
}

// ─── Lens Types ──────────────────────────────────────────────
export type LensMode = 'PERSONAL' | 'PARTNERED' | 'FAMILY' | 'FULL';

export interface LensAvailability {
  type: LensMode;
  name: string;
  description?: string;
  icon?: string;
  isActive: boolean;
  isAvailable: boolean;
  reason?: string;
}

export interface TabConfig {
  key: string;
  label: string;
  icon: string;
  sortOrder: number;
  isVisible: boolean;
  isPriority: boolean;
}

export interface NavigationConfig {
  tabs: TabConfig[];
  hiddenTabs: string[];
  prioritizedTabs: string[];
}

export interface ThemeConfig {
  primaryColor: string;
  palette: string;
  gradientStart: string;
  gradientEnd: string;
  darkPrimary: string;
  darkGradientStart: string;
  darkGradientEnd: string;
  accentColor: string;
  successColor: string;
  warningColor: string;
  errorColor: string;
  infoColor: string;
  subtitle?: string;
}

export interface WidgetConfig {
  key: string;
  type: string;
  title: string;
  description?: string;
  size: string;
  sortOrder: number;
  isVisible: boolean;
  isLocked: boolean;
  config?: Record<string, unknown>;
}

export interface QuickActionConfig {
  key: string;
  label: string;
  icon: string;
  color: string;
  sortOrder: number;
  screen?: string;
}

export interface DashboardConfig {
  widgets: WidgetConfig[];
  quickActions: QuickActionConfig[];
  layout: string;
}

export interface FeatureFlagState {
  enabled: boolean;
  config?: Record<string, unknown>;
}

export interface LensFullConfig {
  navigation: NavigationConfig;
  features: Record<string, FeatureFlagState>;
  theme: ThemeConfig;
  dashboard: DashboardConfig;
}

export interface LensState {
  activeLens: LensMode;
  previousLens: LensMode | null;
  availableLenses: LensAvailability[];
  config: LensFullConfig;
  features: Record<string, FeatureFlagState>;
  switchedAt: string | null;
  switchedCount: number;
}

export interface WidgetData {
  key: string;
  type: string;
  title: string;
  data: unknown;
  size: string;
  sortOrder: number;
}

export interface DashboardWidgetData {
  lens: LensMode;
  widgets: WidgetData[];
  quickActions: QuickActionConfig[];
  generatedAt: string;
}

export interface LensRecommendation {
  id: string;
  title: string;
  description: string;
  actionType: string;
  actionPayload: Record<string, unknown>;
  priority: number;
  dismissible: boolean;
}

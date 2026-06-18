import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AppData, Circle, Space, Expense, PersonalExpense, Budget, Group,
  generateId, today, currentMonth, currentYear, seedData,
} from '../types';

const DB_KEY = '@dabbu_app_data';

let cache: AppData | null = null;

function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export async function loadDatabase(): Promise<AppData> {
  if (cache) return clone(cache);
  try {
    const raw = await AsyncStorage.getItem(DB_KEY);
    if (raw) {
      cache = JSON.parse(raw) as AppData;
      return clone(cache);
    }
  } catch { /* ignore */ }
  // First time — seed with sample data
  cache = seedData();
  await AsyncStorage.setItem(DB_KEY, JSON.stringify(cache));
  return clone(cache);
}

async function save(db: AppData): Promise<void> {
  cache = db;
  await AsyncStorage.setItem(DB_KEY, JSON.stringify(db));
}

// ── Circles ─────────────────────────────────────────────────

export async function getAllCircles(): Promise<Circle[]> {
  const db = await loadDatabase();
  return db.circles;
}

export async function getCircleById(id: string): Promise<Circle | null> {
  const db = await loadDatabase();
  return db.circles.find((c) => c.id === id) || null;
}

export async function addCircle(data: Omit<Circle, 'id' | 'createdAt'>): Promise<Circle> {
  const db = await loadDatabase();
  const circle: Circle = { ...data, id: generateId(), createdAt: today() };
  db.circles.push(circle);
  await save(db);
  return circle;
}

export async function updateCircle(id: string, data: Partial<Circle>): Promise<Circle | null> {
  const db = await loadDatabase();
  const idx = db.circles.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  db.circles[idx] = { ...db.circles[idx], ...data };
  await save(db);
  return db.circles[idx];
}

export async function deleteCircle(id: string): Promise<boolean> {
  const db = await loadDatabase();
  const idx = db.circles.findIndex((c) => c.id === id);
  if (idx === -1) return false;
  db.circles.splice(idx, 1);
  await save(db);
  return true;
}

// ── Spaces ──────────────────────────────────────────────────

export async function getAllSpaces(): Promise<Space[]> {
  const db = await loadDatabase();
  return db.spaces;
}

export async function getSpaceById(id: string): Promise<Space | null> {
  const db = await loadDatabase();
  return db.spaces.find((s) => s.id === id) || null;
}

export async function addSpace(data: Omit<Space, 'id' | 'createdAt'>): Promise<Space> {
  const db = await loadDatabase();
  const space: Space = { ...data, id: generateId(), createdAt: today() };
  db.spaces.push(space);
  await save(db);
  return space;
}

export async function updateSpace(id: string, data: Partial<Space>): Promise<Space | null> {
  const db = await loadDatabase();
  const idx = db.spaces.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  db.spaces[idx] = { ...db.spaces[idx], ...data };
  await save(db);
  return db.spaces[idx];
}

// ── Expenses (shared circle/space expenses) ─────────────────

export async function getExpenses(filter?: {
  category?: string;
  circleId?: string;
  spaceId?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<Expense[]> {
  const db = await loadDatabase();
  let list = db.expenses;
  if (filter) {
    if (filter.category) list = list.filter((e) => e.category.toLowerCase() === filter.category!.toLowerCase());
    if (filter.circleId) list = list.filter((e) => e.circleId === filter.circleId);
    if (filter.spaceId) list = list.filter((e) => e.spaceId === filter.spaceId);
    if (filter.dateFrom) list = list.filter((e) => e.date >= filter.dateFrom!);
    if (filter.dateTo) list = list.filter((e) => e.date <= filter.dateTo!);
  }
  return list.sort((a, b) => b.date.localeCompare(a.date));
}

export async function addExpense(data: Omit<Expense, 'id'>): Promise<Expense> {
  const db = await loadDatabase();
  const expense: Expense = { ...data, id: generateId() };
  db.expenses.push(expense);

  // Update circle totalSpent
  if (expense.circleId) {
    const circle = db.circles.find((c) => c.id === expense.circleId);
    if (circle) circle.totalSpent = (circle.totalSpent || 0) + expense.amount;
  }
  // Update space currentAmount
  if (expense.spaceId) {
    const space = db.spaces.find((s) => s.id === expense.spaceId);
    if (space) space.currentAmount = (space.currentAmount || 0) + expense.amount;
  }

  await save(db);
  return expense;
}

export async function updateExpense(id: string, data: Partial<Expense>): Promise<Expense | null> {
  const db = await loadDatabase();
  const idx = db.expenses.findIndex((e) => e.id === id);
  if (idx === -1) return null;
  db.expenses[idx] = { ...db.expenses[idx], ...data };
  await save(db);
  return db.expenses[idx];
}

export async function deleteExpense(id: string): Promise<boolean> {
  const db = await loadDatabase();
  const idx = db.expenses.findIndex((e) => e.id === id);
  if (idx === -1) return false;
  const expense = db.expenses[idx];
  // Reverse circle/space totals
  if (expense.circleId) {
    const circle = db.circles.find((c) => c.id === expense.circleId);
    if (circle) circle.totalSpent = Math.max(0, (circle.totalSpent || 0) - expense.amount);
  }
  if (expense.spaceId) {
    const space = db.spaces.find((s) => s.id === expense.spaceId);
    if (space) space.currentAmount = Math.max(0, (space.currentAmount || 0) - expense.amount);
  }
  db.expenses.splice(idx, 1);
  await save(db);
  return true;
}

// ── Personal Expenses ───────────────────────────────────────

export async function getPersonalExpenses(filter?: {
  category?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<PersonalExpense[]> {
  const db = await loadDatabase();
  let list = db.personalExpenses;
  if (filter) {
    if (filter.category) list = list.filter((e) => e.category.toLowerCase() === filter.category!.toLowerCase());
    if (filter.dateFrom) list = list.filter((e) => e.date >= filter.dateFrom!);
    if (filter.dateTo) list = list.filter((e) => e.date <= filter.dateTo!);
  }
  return list.sort((a, b) => b.date.localeCompare(a.date));
}

export async function addPersonalExpense(data: Omit<PersonalExpense, 'id'>): Promise<PersonalExpense> {
  const db = await loadDatabase();
  const expense: PersonalExpense = { ...data, id: generateId() };
  db.personalExpenses.push(expense);

  // Update budget spent
  const budget = db.budgets.find(
    (b) => b.category.toLowerCase() === data.category.toLowerCase() && b.month === currentMonth() && b.year === currentYear(),
  );
  if (budget) budget.currentSpent = (budget.currentSpent || 0) + data.amount;

  await save(db);
  return expense;
}

// ── Budgets ─────────────────────────────────────────────────

export async function getBudgets(): Promise<Budget[]> {
  const db = await loadDatabase();
  return db.budgets;
}

export async function addBudget(data: Omit<Budget, 'id'>): Promise<Budget> {
  const db = await loadDatabase();
  const budget: Budget = { ...data, id: generateId() };
  db.budgets.push(budget);
  await save(db);
  return budget;
}

export async function updateBudget(id: string, data: Partial<Budget>): Promise<Budget | null> {
  const db = await loadDatabase();
  const idx = db.budgets.findIndex((b) => b.id === id);
  if (idx === -1) return null;
  db.budgets[idx] = { ...db.budgets[idx], ...data };
  await save(db);
  return db.budgets[idx];
}

// ── Groups ──────────────────────────────────────────────────

export async function getAllGroups(): Promise<Group[]> {
  const db = await loadDatabase();
  return db.groups;
}

export async function addGroup(data: Omit<Group, 'id'>): Promise<Group> {
  const db = await loadDatabase();
  const group: Group = { ...data, id: generateId() };
  db.groups.push(group);
  await save(db);
  return group;
}

// ── Aggregations ────────────────────────────────────────────

export async function getCategoryBreakdown(): Promise<{ category: string; total: number; count: number }[]> {
  const db = await loadDatabase();
  const all = [...db.personalExpenses, ...db.expenses.filter((e) => !e.circleId && !e.spaceId)];
  const map: Record<string, { total: number; count: number }> = {};
  for (const e of all) {
    if (!map[e.category]) map[e.category] = { total: 0, count: 0 };
    map[e.category].total += e.amount;
    map[e.category].count += 1;
  }
  return Object.entries(map)
    .map(([category, v]) => ({ category, total: v.total, count: v.count }))
    .sort((a, b) => b.total - a.total);
}

export async function getSpendingByTimeRange(
  range: 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'last_7_days' | 'last_30_days',
): Promise<{ total: number; expenses: (PersonalExpense | Expense)[] }> {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  let from: Date;
  switch (range) {
    case 'today':
      from = startOfDay(now);
      break;
    case 'yesterday': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      from = startOfDay(y);
      break;
    }
    case 'this_week': {
      const w = new Date(now);
      w.setDate(w.getDate() - w.getDay());
      from = startOfDay(w);
      break;
    }
    case 'last_week': {
      const lw = new Date(now);
      lw.setDate(lw.getDate() - lw.getDay() - 7);
      from = startOfDay(lw);
      const to = new Date(lw);
      to.setDate(to.getDate() + 6);
      return filterByDateRange(from, to);
    }
    case 'this_month':
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'last_month':
      from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return filterByDateRange(from, new Date(now.getFullYear(), now.getMonth(), 0));
    case 'last_7_days': {
      const d7 = new Date(now);
      d7.setDate(d7.getDate() - 7);
      from = startOfDay(d7);
      break;
    }
    case 'last_30_days': {
      const d30 = new Date(now);
      d30.setDate(d30.getDate() - 30);
      from = startOfDay(d30);
      break;
    }
    default:
      from = startOfDay(now);
  }
  return filterByDateRange(from);
}

async function filterByDateRange(from: Date, to?: Date): Promise<{ total: number; expenses: (PersonalExpense | Expense)[] }> {
  const db = await loadDatabase();
  const toStr = to ? to.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  const fromStr = from.toISOString().split('T')[0];

  const all: (PersonalExpense | Expense)[] = [
    ...db.personalExpenses.filter((e) => e.date >= fromStr && e.date <= toStr),
    ...db.expenses.filter((e) => e.date >= fromStr && e.date <= toStr),
  ];
  const total = all.reduce((s, e) => s + e.amount, 0);
  return { total, expenses: all.sort((a, b) => b.date.localeCompare(a.date)) };
}

export async function getTopExpenses(limit: number = 5): Promise<(PersonalExpense | Expense)[]> {
  const db = await loadDatabase();
  const all: (PersonalExpense | Expense)[] = [...db.personalExpenses, ...db.expenses];
  return all.sort((a, b) => b.amount - a.amount).slice(0, limit);
}

export async function getMonthlyComparison(): Promise<{
  currentMonth: { total: number; categories: Record<string, number> };
  lastMonth: { total: number; categories: Record<string, number> };
}> {
  const now = new Date();
  const cmStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const cmEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const lmStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lmEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const current = await filterByDateRange(cmStart, cmEnd);
  const last = await filterByDateRange(lmStart, lmEnd);

  const catSum = (list: (PersonalExpense | Expense)[]) => {
    const m: Record<string, number> = {};
    for (const e of list) {
      m[e.category] = (m[e.category] || 0) + e.amount;
    }
    return m;
  };

  return {
    currentMonth: { total: current.total, categories: catSum(current.expenses) },
    lastMonth: { total: last.total, categories: catSum(last.expenses) },
  };
}

export async function getCircleExpenses(circleId: string): Promise<Expense[]> {
  return getExpenses({ circleId });
}

export async function getSpaceProgress(spaceId: string): Promise<{ current: number; goal: number; pct: number } | null> {
  const db = await loadDatabase();
  const space = db.spaces.find((s) => s.id === spaceId);
  if (!space) return null;
  return {
    current: space.currentAmount,
    goal: space.monthlyGoal,
    pct: space.monthlyGoal > 0 ? Math.min(100, (space.currentAmount / space.monthlyGoal) * 100) : 0,
  };
}

export async function getDashboardStats(): Promise<{
  totalExpenses: number;
  totalIncome: number;
  circleCount: number;
  spaceCount: number;
  budgetCount: number;
  topCategory: { name: string; total: number } | null;
  savingsRate: number;
}> {
  const db = await loadDatabase();
  const allExpenses = [...db.personalExpenses, ...db.expenses];
  const totalExpenses = allExpenses.reduce((s, e) => s + e.amount, 0);

  const cats = await getCategoryBreakdown();
  const topCategory = cats.length > 0 ? { name: cats[0].category, total: cats[0].total } : null;

  return {
    totalExpenses,
    totalIncome: 0,
    circleCount: db.circles.length,
    spaceCount: db.spaces.length,
    budgetCount: db.budgets.length,
    topCategory,
    savingsRate: 0,
  };
}

// ── Reset ───────────────────────────────────────────────────

export async function resetDatabase(): Promise<void> {
  cache = seedData();
  await AsyncStorage.setItem(DB_KEY, JSON.stringify(cache));
}

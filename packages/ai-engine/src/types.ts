export interface TransactionData {
  id: string;
  amount: number;
  description?: string;
  category?: string;
  date: Date;
  paidBy: string;
  paidByName: string;
  splitType?: string;
}

export interface MemberData {
  id: string;
  name: string;
  avatar?: string;
  joinedAt?: Date;
}

export interface ExpenseData {
  id: string;
  amount: number;
  description: string;
  category?: string;
  date: Date;
  paidBy: string;
  paidByName: string;
  splits: { memberId: string; amount: number; settled: boolean }[];
}

export interface SettlementData {
  id: string;
  from: string;
  fromName: string;
  to: string;
  toName: string;
  amount: number;
  date: Date;
  status: string;
}

export interface Badge {
  id: string;
  name: string;
  emoji: string;
  description: string;
  category: BadgeCategory;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export type BadgeCategory =
  | 'spending' | 'settlement' | 'contribution' | 'social'
  | 'savings' | 'trip' | 'engagement' | 'funny';

export interface GroupPersonality {
  groupId: string;
  groupName: string;
  type: string;
  topSpender: { name: string; amount: number; category?: string };
  fastestPayer: { name: string; avgSettlementDays: number };
  mostGenerous: { name: string; timesPaid: number; totalAmount: number };
  mostActive: { name: string; expenseCount: number };
  fuelKing?: { name: string; amount: number };
  foodLover?: { name: string; amount: number };
  latestSettler?: { name: string; avgDelayDays: number };
  badges: MemberBadge[];
}

export interface MemberBadge {
  memberId: string;
  memberName: string;
  badge: Badge;
  earnedAt: Date;
}

export interface CoupleHealthScore {
  score: number;
  level: 'needs_attention' | 'fair' | 'good' | 'excellent';
  contributionRatio: { partnerA: string; partnerB: string; ratio: string };
  savingsTrend: 'up' | 'stable' | 'down';
  spendingCompatibility: number;
  recommendations: string[];
}

export interface FinancialHealthScore {
  overall: number;
  budgeting: number;
  settlement: number;
  savings: number;
  discipline: number;
  stressLevel: 'low' | 'moderate' | 'high';
  warnings: string[];
  recommendations: string[];
}

export interface TrustScore {
  memberId: string;
  memberName: string;
  score: number;
  settlementReliability: number;
  contributionConsistency: number;
  reimbursementSpeed: number;
  participationRate: number;
}

export interface TripStory {
  tripId: string;
  tripName: string;
  totalSpent: number;
  totalDays: number;
  categoryBreakdown: { category: string; amount: number; percentage: number }[];
  topSpender: { name: string; amount: number };
  funFact: string;
  timeline: { day: number; summary: string; expenseCount: number }[];
  highlights: string[];
  foodTotal: number;
  fuelTotal: number;
  accommodations: number;
}

export interface SettlementReminder {
  type: 'overdue' | 'pending' | 'aging' | 'gentle_nudge';
  from: string;
  fromName: string;
  to: string;
  toName: string;
  amount: number;
  daysOutstanding: number;
  groupName: string;
  groupId: string;
  message: string;
}

export interface SmartGroupSuggestion {
  groupId: string;
  groupName: string;
  confidence: number;
  reason: string;
  matchedMerchant?: string;
  matchedAmount?: number;
}

export interface MemoryEntry {
  id: string;
  type: 'trip' | 'expense' | 'milestone' | 'anniversary';
  title: string;
  description: string;
  date: Date;
  amount?: number;
  members: string[];
  emoji: string;
}

export interface SavingsChallenge {
  id: string;
  name: string;
  description: string;
  icon: string;
  targetDays: number;
  currentStreak: number;
  bestStreak: number;
  isActive: boolean;
  progress: number;
  badge?: Badge;
}

export interface ChallengeProgress {
  challengeId: string;
  userId: string;
  dayCount: number;
  streak: number;
  bestStreak: number;
  skipped: number;
  savingsAmount: number;
  completedToday: boolean;
}

export interface MonthlyReport {
  month: number;
  year: number;
  totalIncome: number;
  totalExpenses: number;
  savings: number;
  categoryBreakdown: { category: string; amount: number; percentage: number }[];
  subscriptions: { name: string; amount: number }[];
  pendingDues: number;
  topSpendingDay: { date: string; amount: number };
  insights: string[];
  badges: Badge[];
}

export interface YearlyWrapped {
  year: number;
  totalSpent: number;
  totalSaved: number;
  mostExpensiveMonth: { month: string; amount: number };
  mostMemorableTrip?: { name: string; spent: number };
  topCategory: { category: string; amount: number };
  topSavingsMonth: { month: string; amount: number };
  funniestSplit?: string;
  totalTrips: number;
  totalGroups: number;
  badgesEarned: number;
  financialGrowth: number;
  settlementRate: number;
  topSpender: { name: string; amount: number };
  fastestPayer: { name: string };
  foodSpent: number;
  fuelSpent: number;
  funFacts: string[];
}

export interface LifeEventBudget {
  eventType: string;
  eventName: string;
  totalBudget: number;
  spent: number;
  contributors: { name: string; amount: number }[];
  timeline: { date: string; description: string; amount: number }[];
  categoryBreakdown: { category: string; amount: number }[];
  suggestions: string[];
}

export interface PollData {
  id: string;
  question: string;
  options: PollOption[];
  createdBy: string;
  createdByName: string;
  expiresAt?: Date;
  isActive: boolean;
  totalVotes: number;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
  voters: string[];
}

export interface GroceryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  estimatedPrice: number;
  assignedTo?: string;
  isPurchased: boolean;
  category: string;
}

export interface GroceryListData {
  id: string;
  name: string;
  groupId: string;
  items: GroceryItem[];
  totalEstimated: number;
  totalActual?: number;
  createdBy: string;
  createdAt: Date;
  status: 'active' | 'completed' | 'cancelled';
}

export interface StressIndicator {
  type: 'rising_emi' | 'increased_debt' | 'repeated_borrowing' | 'high_recurring' | 'reduced_savings';
  severity: 'low' | 'moderate' | 'high';
  description: string;
  trend: 'improving' | 'stable' | 'worsening';
  recommendation: string;
}

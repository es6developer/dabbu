// ─── Finance Types ─────────────────────────────────────────
export type AccountType =
  | 'checking'
  | 'savings'
  | 'credit_card'
  | 'cash'
  | 'investment'
  | 'loan'
  | 'wallet';

export type TransactionType = 'income' | 'expense' | 'transfer';

export type TransactionStatus = 'completed' | 'pending' | 'cancelled';

export type RecurringFrequency =
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly';

export type BudgetPeriod = 'monthly' | 'yearly' | 'custom';

export type GoalType = 'savings' | 'investment' | 'debt' | 'custom';

export type InvestmentType =
  | 'stock'
  | 'crypto'
  | 'mutual_fund'
  | 'etf'
  | 'bond'
  | 'real_estate'
  | 'other';

export type NotificationType =
  | 'bill_reminder'
  | 'budget_alert'
  | 'goal_milestone'
  | 'large_transaction'
  | 'weekly_report'
  | 'monthly_report'
  | 'account_alert';

export type ThemeMode = 'light' | 'dark' | 'system';

export type CurrencyCode = string;

// ─── API Types ─────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  meta?: PaginationMeta;
  timestamp: string;
  path: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sort?: string;
  order?: 'ASC' | 'DESC';
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

// ─── Auth Types ────────────────────────────────────────────
export interface JwtPayload {
  sub: string;
  email: string;
  firstName: string;
  lastName: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  currency: string;
}

export interface AuthResponse {
  user: AuthUser;
  tokens: TokenPair;
}

// ─── User Types ────────────────────────────────────────────
export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  currency: string;
  timezone: string;
  locale: string;
  isEmailVerified: boolean;
  preferences?: UserPreferences;
  accounts: AccountSummary[];
  createdAt: string;
}

export interface UserPreferences {
  theme: ThemeMode;
  weeklyReport: boolean;
  monthlyReport: boolean;
  largeTransactionAlert: number;
  budgetAlertThreshold: number;
}

// ─── Account Types ─────────────────────────────────────────
export interface AccountSummary {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  balance: number;
  color?: string;
  icon?: string;
  isActive: boolean;
}

export interface AccountDetail extends AccountSummary {
  initialBalance: number;
  description?: string;
  institution?: string;
  lastFourDigits?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Category Types ────────────────────────────────────────
export interface CategorySummary {
  id: string;
  name: string;
  transactionType: TransactionType;
  icon?: string;
  color?: string;
  isDefault: boolean;
  parentId?: string;
  children?: CategorySummary[];
}

// ─── Transaction Types ─────────────────────────────────────
export interface TransactionSummary {
  id: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  date: string;
  description?: string;
  notes?: string;
  tags?: string[];
  categoryId?: string;
  categoryName?: string;
  categoryIcon?: string;
  categoryColor?: string;
  accountId?: string;
  accountName?: string;
  isRecurring: boolean;
}

// ─── Budget Types ──────────────────────────────────────────
export interface BudgetSummary {
  id: string;
  name: string;
  amount: number;
  spent: number;
  remaining: number;
  percentage: number;
  period: BudgetPeriod;
  startDate: string;
  endDate: string;
  categoryId?: string;
  categoryName?: string;
  categoryIcon?: string;
  categoryColor?: string;
  isActive: boolean;
}

// ─── Bill Types ────────────────────────────────────────────
export interface BillSummary {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  isPaid: boolean;
  paidDate?: string;
  isRecurring: boolean;
  frequency?: RecurringFrequency;
  reminderDays: number;
  categoryId?: string;
  categoryName?: string;
  accountId?: string;
  accountName?: string;
  daysUntilDue: number;
}

// ─── Goal Types ────────────────────────────────────────────
export interface GoalSummary {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  progress: number;
  deadline?: string;
  type: GoalType;
  icon?: string;
  color?: string;
  isCompleted: boolean;
  daysRemaining?: number;
}

// ─── Investment Types ──────────────────────────────────────
export interface InvestmentSummary {
  id: string;
  name: string;
  type: InvestmentType;
  symbol?: string;
  quantity: number;
  buyPrice: number;
  currentPrice?: number;
  totalValue: number;
  totalCost: number;
  gainLoss: number;
  gainLossPercentage: number;
  currency: string;
}

// ─── Notification Types ────────────────────────────────────
export interface NotificationSummary {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  data?: Record<string, unknown>;
  createdAt: string;
}

// ─── Report Types ──────────────────────────────────────────
export interface SpendingByCategory {
  categoryId: string;
  categoryName: string;
  categoryIcon?: string;
  categoryColor?: string;
  amount: number;
  percentage: number;
  transactionCount: number;
}

export interface IncomeVsExpense {
  period: string;
  income: number;
  expense: number;
  net: number;
}

export interface NetWorthHistory {
  date: string;
  netWorth: number;
  assets: number;
  liabilities: number;
}

export interface DashboardSummary {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  netWorth: number;
  recentTransactions: TransactionSummary[];
  upcomingBills: BillSummary[];
  budgetStatus: BudgetSummary[];
  spendingByCategory: SpendingByCategory[];
  incomeVsExpense: IncomeVsExpense[];
  netWorthHistory: NetWorthHistory[];
}

// ─── Enums ─────────────────────────────────────────────────
export const ACCOUNT_TYPES: AccountType[] = [
  'checking',
  'savings',
  'credit_card',
  'cash',
  'investment',
  'loan',
  'wallet',
];

export const TRANSACTION_TYPES: TransactionType[] = ['income', 'expense', 'transfer'];

export const TRANSACTION_STATUSES: TransactionStatus[] = ['completed', 'pending', 'cancelled'];

export const RECURRING_FREQUENCIES: RecurringFrequency[] = [
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'yearly',
];

export const BUDGET_PERIODS: BudgetPeriod[] = ['monthly', 'yearly', 'custom'];

export const GOAL_TYPES: GoalType[] = ['savings', 'investment', 'debt', 'custom'];

export const INVESTMENT_TYPES: InvestmentType[] = [
  'stock',
  'crypto',
  'mutual_fund',
  'etf',
  'bond',
  'real_estate',
  'other',
];

export const NOTIFICATION_TYPES: NotificationType[] = [
  'bill_reminder',
  'budget_alert',
  'goal_milestone',
  'large_transaction',
  'weekly_report',
  'monthly_report',
  'account_alert',
];

// ─── Shared Finance Types ─────────────────────────────────
export type GroupType =
  | 'friends'
  | 'trip'
  | 'family'
  | 'couple'
  | 'roommates'
  | 'office'
  | 'event'
  | 'apartment';

export type GroupMemberRole = 'owner' | 'admin' | 'member' | 'viewer';

export type SplitType = 'equal' | 'percentage' | 'exact' | 'weighted' | 'custom';

export type SettlementMethod = 'upi' | 'bank_transfer' | 'cash' | 'partial' | 'other';

export type ExpenseCategory =
  | 'food'
  | 'groceries'
  | 'transport'
  | 'accommodation'
  | 'utilities'
  | 'entertainment'
  | 'shopping'
  | 'healthcare'
  | 'education'
  | 'rent'
  | 'fuel'
  | 'insurance'
  | 'subscription'
  | 'household'
  | 'other';

// Group models
export interface GroupSummary {
  id: string;
  name: string;
  type: GroupType;
  description?: string;
  avatarUrl?: string;
  memberCount: number;
  totalSpent: number;
  balance: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GroupDetail extends GroupSummary {
  inviteCode?: string;
  currency: string;
  members: GroupMemberDetail[];
  expenses: GroupExpenseSummary[];
  settlements: SettlementSummary[];
  sharedBudgets: SharedBudgetSummary[];
}

export interface GroupMemberDetail {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  email: string;
  role: GroupMemberRole;
  totalPaid: number;
  totalOwed: number;
  balance: number;
  joinedAt: string;
}

export interface GroupExpenseSummary {
  id: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  paidByUserId: string;
  paidByName: string;
  splitType: SplitType;
  date: string;
  isReimbursement: boolean;
  notes?: string;
  receiptUrl?: string;
  createdAt: string;
}

export interface GroupExpenseDetail extends GroupExpenseSummary {
  splits: ExpenseSplitDetail[];
  comments: ExpenseComment[];
  attachments: ExpenseAttachment[];
}

export interface ExpenseSplitDetail {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  percentage?: number;
  weight?: number;
  isSettled: boolean;
  settledAt?: string;
}

export interface SettlementSummary {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  amount: number;
  method: SettlementMethod;
  note?: string;
  status: 'pending' | 'completed' | 'cancelled';
  proofUrl?: string;
  completedAt?: string;
  createdAt: string;
}

export interface TripSummary {
  id: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  totalSpent: number;
  status: 'planning' | 'ongoing' | 'completed' | 'cancelled';
  memberCount: number;
  coverUrl?: string;
  createdAt: string;
}

export interface TripDetail extends TripSummary {
  groupId: string;
  description?: string;
  itinerary: TripDay[];
  expenses: GroupExpenseSummary[];
  members: GroupMemberDetail[];
  settlements: SettlementSummary[];
}

export interface TripDay {
  date: string;
  activities: string[];
  expenses: GroupExpenseSummary[];
  notes?: string;
}

export interface SharedBudgetSummary {
  id: string;
  groupId: string;
  name: string;
  category: ExpenseCategory;
  totalAmount: number;
  spent: number;
  period: 'weekly' | 'monthly' | 'yearly' | 'custom';
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface CoupleFinanceProfile {
  id: string;
  partner1Id: string;
  partner1Name: string;
  partner2Id: string;
  partner2Name: string;
  salary1?: number;
  salary2?: number;
  contributionRatio?: number;
  sharedSavingsGoal?: number;
  sharedSavingsCurrent?: number;
  monthlyBudget?: number;
  monthlySpent?: number;
  currency: string;
  joinedAt: string;
}

export interface CoupleMonthlyOverview {
  month: string;
  partner1Spent: number;
  partner2Spent: number;
  sharedSpent: number;
  totalIncome: number;
  totalExpense: number;
  savings: number;
  topCategories: { name: string; amount: number }[];
}

export interface ContributionRule {
  id: string;
  groupId: string;
  name: string;
  type: 'equal' | 'percentage' | 'salary_ratio' | 'fixed';
  values: { userId: string; value: number }[];
  isActive: boolean;
  createdAt: string;
}

export interface SharedSubscription {
  id: string;
  groupId: string;
  name: string;
  service: string;
  amount: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly' | 'quarterly';
  nextBillingDate: string;
  paidByUserId: string;
  paidByName: string;
  members: { userId: string; userName: string; share: number }[];
  isActive: boolean;
  category?: string;
  renewalReminderDays: number;
  createdAt: string;
}

export interface ExpenseAttachment {
  id: string;
  type: 'image' | 'document' | 'receipt';
  url: string;
  uploadedBy: string;
  createdAt: string;
}

export interface ExpenseComment {
  id: string;
  expenseId: string;
  userId: string;
  userName: string;
  avatarUrl?: string;
  content: string;
  createdAt: string;
}

export interface GroupMessage {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  messageType: 'text' | 'image' | 'file' | 'expense' | 'settlement' | 'system';
  mediaUrl?: string;
  replyToId?: string;
  createdAt: string;
}

export interface SettlementGraph {
  nodes: { userId: string; userName: string; balance: number }[];
  edges: { from: string; to: string; amount: number }[];
  optimizedTransactions: { from: string; to: string; amount: number }[];
}

export interface GroupDashboardData {
  group: GroupSummary;
  totalSpent: number;
  monthlySpending: number;
  categoryBreakdown: { category: string; amount: number; percentage: number }[];
  memberBalances: { userId: string; name: string; balance: number }[];
  recentExpenses: GroupExpenseSummary[];
  pendingSettlements: SettlementSummary[];
  insights: string[];
}

export interface CoupleDashboardData {
  profile: CoupleFinanceProfile;
  monthlyOverview: CoupleMonthlyOverview;
  partnerComparison: { category: string; partner1Amount: number; partner2Amount: number }[];
  savingsProgress: number;
  insights: string[];
  recentExpenses: GroupExpenseSummary[];
  contributionSummary: { partner: string; contributed: number; percentage: number }[];
}

export interface TripDashboardData {
  trip: TripDetail;
  totalSpent: number;
  dailyAverage: number;
  categoryBreakdown: { category: string; amount: number }[];
  perPersonTotal: number;
  memberComparison: { userId: string; name: string; spent: number; paid: number }[];
  remainingBudget: number;
  budgetUtilization: number;
  daysRemaining: number;
  insights: string[];
}

export interface GroupChatDetail {
  id: string;
  groupId: string;
  messages: GroupMessage[];
  unreadCount: number;
  lastMessage?: GroupMessage;
  createdAt: string;
}

// ─── External Sharing & Viral Growth Types ────────────────
export type TempUserLoginMethod = 'anonymous' | 'google' | 'email_otp' | 'phone_otp' | 'link';

export type TrialType =
  | 'first_month_free'
  | 'referral'
  | 'trip_completion'
  | 'conversion_reward'
  | 'onboarding_bonus';

export type TrialStatus = 'active' | 'expired' | 'converted' | 'cancelled';

export type ConversionEventType =
  | 'settlement_threshold'
  | 'multi_participation'
  | 'multi_group'
  | 'high_value_trip'
  | 'invited_others'
  | 'prolonged_use';

export type OnboardingEventType =
  | 'banner_shown'
  | 'banner_clicked'
  | 'signup_started'
  | 'signup_completed'
  | 'upsell_viewed'
  | 'upsell_dismissed'
  | 'app_install_clicked'
  | 'deep_link_opened';

export type ReferralStatus = 'pending' | 'converted' | 'rewarded' | 'expired';

export interface TempUserProfile {
  id: string;
  email?: string;
  phone?: string;
  displayName?: string;
  avatarUrl?: string;
  loginMethod: TempUserLoginMethod;
  sessionToken: string;
  engagementScore?: number;
  totalSettlements: number;
  expenseCount: number;
  groupCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface InviteLinkDetail {
  id: string;
  groupId: string;
  groupName: string;
  groupType: string;
  token: string;
  shortCode?: string;
  qrCodeUrl?: string;
  maxUses: number;
  useCount: number;
  expiresAt?: string;
  isRevoked: boolean;
  permissions: {
    canAddExpenses: boolean;
    canSettle: boolean;
    canChat: boolean;
    canUploadBills: boolean;
    canViewHistory: boolean;
    canInviteOthers: boolean;
  };
  createdAt: string;
}

export interface ConversionTrigger {
  eventType: ConversionEventType;
  score: number;
  isActioned: boolean;
  banner?: UpgradeBanner;
  createdAt: string;
}

export interface UpgradeBanner {
  id: string;
  title: string;
  description: string;
  ctaText: string;
  ctaAction: 'install_app' | 'signup' | 'start_trial' | 'dismiss';
  priority: number;
  bannerType: 'sticky' | 'inline' | 'modal' | 'slide_in';
  icon?: string;
  gradient?: [string, string];
}

export interface PremiumTrialDetail {
  id: string;
  trialType: TrialType;
  status: TrialStatus;
  startsAt: string;
  expiresAt: string;
  daysRemaining: number;
  metadata?: Record<string, unknown>;
}

export interface ReferralLinkDetail {
  id: string;
  code: string;
  url: string;
  totalClicks: number;
  totalSignups: number;
  totalConversions: number;
  totalRewards: number;
  isActive: boolean;
}

export interface InstallTrackingDetail {
  id: string;
  platform?: string;
  installSource?: string;
  isInstalled: boolean;
  installUrl?: string;
  appStoreUrl: string;
  playStoreUrl: string;
}

export interface AuthResponseTemp {
  user: TempUserProfile;
  isNewUser: boolean;
}

export interface ConversionDashboard {
  tempUserId: string;
  engagementScore: number;
  activeTriggers: ConversionTrigger[];
  activeBanners: UpgradeBanner[];
  activeTrial?: PremiumTrialDetail;
  referralLink?: ReferralLinkDetail;
  installTracking?: InstallTrackingDetail;
  suggestedAction: string;
}

export interface ViralAnalytics {
  viralCoefficient: number;
  inviteConversionRate: number;
  appInstallConversionRate: number;
  tempUserRetentionRate: number;
  premiumTrialConversionRate: number;
  totalInvitesSent: number;
  totalInvitesAccepted: number;
  totalTempUsers: number;
  totalConversions: number;
  totalPremiumTrials: number;
  totalReferrals: number;
  averageEngagementScore: number;
  topConversionSources: { source: string; count: number }[];
  conversionFunnel: { stage: string; count: number; conversionRate: number }[];
}

// ─── Group Lifecycle & Access Control Types ──────────────
export type GroupStatus = 'active' | 'paused' | 'completed' | 'archived' | 'closed';

export type LifecycleEventType =
  | 'created'
  | 'member_added'
  | 'member_removed'
  | 'paused'
  | 'resumed'
  | 'completed'
  | 'archived'
  | 'closed'
  | 'invite_revoked'
  | 'trip_ended';

export type RestrictionType =
  | 'no_new_expenses'
  | 'no_edits'
  | 'no_settlements'
  | 'read_only'
  | 'no_chat'
  | 'no_invites'
  | 'all_blocked';

export type RevocationType =
  | 'member_removed'
  | 'group_closed'
  | 'invite_revoked'
  | 'session_expired'
  | 'admin_action'
  | 'group_completed';

export type RemovalType =
  | 'admin_removed'
  | 'self_leave'
  | 'group_closed'
  | 'invite_expired'
  | 'system';

export type LifecycleNotificationType =
  | 'member_removed'
  | 'group_completed'
  | 'group_archived'
  | 'group_closed'
  | 'access_expired'
  | 'invite_revoked'
  | 'trip_ended';

export interface GroupLifecycleEventData {
  id: string;
  groupId: string;
  eventType: LifecycleEventType;
  triggeredBy: string;
  targetUserId?: string;
  oldStatus?: GroupStatus;
  newStatus?: GroupStatus;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface GroupMemberRemovalLogData {
  id: string;
  groupId: string;
  removedUserId?: string;
  removedTempId?: string;
  removedBy: string;
  removalType: RemovalType;
  reason?: string;
  wasTempUser: boolean;
  hadOutstandingBalance: boolean;
  outstandingAmount?: number;
  settledBeforeRemoval: boolean;
  createdAt: string;
}

export interface GroupAccessRestrictionData {
  id: string;
  groupId: string;
  restrictionType: RestrictionType;
  appliedTo: string;
  targetUserId?: string;
  targetTempId?: string;
  reason?: string;
  isActive: boolean;
  appliedBy: string;
  expiresAt?: string;
  createdAt: string;
}

export interface SessionRevocationData {
  id: string;
  targetUserId?: string;
  targetTempId?: string;
  groupId?: string;
  revocationType: RevocationType;
  isProcessed: boolean;
  createdAt: string;
}

export interface GroupLifecycleNotificationData {
  id: string;
  groupId: string;
  recipientUserId?: string;
  recipientTempId?: string;
  notificationType: LifecycleNotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  isRead: boolean;
  createdAt: string;
}

export interface GroupAccessStatusResponse {
  groupId: string;
  status: GroupStatus;
  userAccess: 'active' | 'expired' | 'revoked' | 'none';
  userRole?: string;
  isTempUser: boolean;
  restrictions: GroupAccessRestrictionData[];
  canAddExpenses: boolean;
  canSettle: boolean;
  canChat: boolean;
  readOnly: boolean;
  message?: string;
}

export interface PostGroupRemovalData {
  balance?: number;
  settled: boolean;
  receiptAvailable: boolean;
  groupName: string;
  removedBy: string;
  removalType: RemovalType;
}

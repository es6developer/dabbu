const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dabbu-1ff9.onrender.com/api/v1';

function getAuthHeaders() {
  if (typeof window === 'undefined') {
    return { 'Content-Type': 'application/json' };
  }
  const token = localStorage.getItem('admin_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...getAuthHeaders(), ...options?.headers },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalAdmins: number;
  totalFamilies: number;
  totalReminders: number;
  totalTransactions: number;
  newUsersToday: number;
  activeSubscriptions: number;
  revenueThisMonth?: number;
  revenueLastMonth?: number;
  revenueGrowth?: number;
  userGrowth?: number;
  subscriptionGrowth?: number;
  pendingPayments?: number;
  totalFeatureFlags?: number;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  isActive: boolean;
  isEmailVerified: boolean;
  role: string;
  lastLoginAt: string | null;
  createdAt: string;
  subscription: {
    id: string;
    status: string;
    plan: { name: string };
    currentPeriodEnd: string;
  } | null;
  _count: { transactions: number; reminders: number; familyMemberships: number };
}

export interface Family {
  id: string;
  name: string;
  type: string;
  createdAt: string;
  _count: { members: number };
  members: Array<{
    id: string;
    role: string;
    user: { id: string; email: string; firstName: string; lastName: string };
  }>;
}

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  description: string;
  createdAt: string;
  admin: { id: string; email: string; name: string } | null;
  user: { id: string; email: string; firstName: string; lastName: string } | null;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  code: string;
  description: string | null;
  price: number;
  currency: string;
  interval: string;
  features: Record<string, boolean>;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface Subscription {
  id: string;
  status: string;
  currentPeriodEnd: string;
  createdAt: string;
  user: { id: string; email: string; firstName: string; lastName: string };
  plan: { id: string; name: string; price: number; interval: string };
}

export interface FeatureFlag {
  id: string;
  name: string;
  description: string | null;
  isEnabled: boolean;
  createdAt: string;
}

export interface AppConfig {
  id: string;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  appName: string;
  supportEmail: string;
  enableSignups: boolean;
  enableApiAccess: boolean;
  newUserDefaultPlan: string;
  trialDurationDays: number;
  maxLoginAttempts: number;
  sessionTimeout: number;
  defaultCurrency: string;
  timezone: string;
  language: string;
  otpEnabled: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpSecure: boolean;
  smtpUser: string | null;
  smtpPass: string | null;
  smtpFromName: string | null;
  smtpFromEmail: string | null;
}

// Auth
export function adminLogin(email: string, password: string) {
  return request<{ data: { accessToken: string; admin: any } }>('/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function createAdmin(data: {
  email: string;
  name: string;
  password: string;
  role?: string;
}) {
  return request<{ data: any }>('/admin/auth/create', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Dashboard
export function getDashboardStats() {
  return request<{ data: DashboardStats }>('/admin/dashboard/stats');
}

// Users
export function listUsers(params?: {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const qs = new URLSearchParams();
  if (params?.search) {
    qs.set('search', params.search);
  }
  if (params?.status) {
    qs.set('status', params.status);
  }
  if (params?.page) {
    qs.set('page', String(params.page));
  }
  if (params?.limit) {
    qs.set('limit', String(params.limit));
  }
  const q = qs.toString();
  return request<PaginatedResponse<User>>(`/admin/users${q ? `?${q}` : ''}`);
}

export function getUserDetail(id: string) {
  return request<{ data: any }>(`/admin/users/${id}`);
}

export function updateUserStatus(id: string, isActive: boolean) {
  return request<{ data: any }>(`/admin/users/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
}

export function deleteUser(id: string) {
  return request<{ data: { message: string } }>(`/admin/users/${id}`, { method: 'DELETE' });
}

// Families
export function listFamilies(page = 1, limit = 20) {
  return request<PaginatedResponse<Family>>(`/admin/families?page=${page}&limit=${limit}`);
}

export function getFamilyDetail(id: string) {
  return request<{ data: Family }>(`/admin/families/${id}`);
}

export function deleteFamily(id: string) {
  return request<{ data: { message: string } }>(`/admin/families/${id}`, { method: 'DELETE' });
}

// Plans
export function listPlans() {
  return request<{ data: SubscriptionPlan[] }>('/admin/plans');
}

export function getPlan(id: string) {
  return request<{ data: SubscriptionPlan }>(`/admin/plans/${id}`);
}

export function createPlan(data: Partial<SubscriptionPlan>) {
  return request<{ data: SubscriptionPlan }>('/admin/plans', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updatePlan(id: string, data: Partial<SubscriptionPlan>) {
  return request<{ data: SubscriptionPlan }>(`/admin/plans/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deletePlan(id: string) {
  return request<{ data: { message: string } }>(`/admin/plans/${id}`, { method: 'DELETE' });
}

// Subscriptions
export function listSubscriptions(page = 1, limit = 20) {
  return request<PaginatedResponse<Subscription>>(
    `/admin/subscriptions?page=${page}&limit=${limit}`,
  );
}

// Feature Flags
export function listFeatureFlags() {
  return request<{ data: FeatureFlag[] }>('/admin/feature-flags');
}

export function createFeatureFlag(data: {
  name: string;
  description?: string;
  isEnabled?: boolean;
}) {
  return request<{ data: FeatureFlag }>('/admin/feature-flags', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function toggleFeatureFlag(id: string, isEnabled: boolean) {
  return request<{ data: FeatureFlag }>(`/admin/feature-flags/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ isEnabled }),
  });
}

// Audit Logs
export function listAuditLogs(params?: {
  adminId?: string;
  action?: string;
  entity?: string;
  page?: number;
  limit?: number;
}) {
  const qs = new URLSearchParams();
  if (params?.adminId) {
    qs.set('adminId', params.adminId);
  }
  if (params?.action) {
    qs.set('action', params.action);
  }
  if (params?.entity) {
    qs.set('entity', params.entity);
  }
  if (params?.page) {
    qs.set('page', String(params.page));
  }
  if (params?.limit) {
    qs.set('limit', String(params.limit));
  }
  const q = qs.toString();
  return request<PaginatedResponse<AuditLog>>(`/admin/audit-logs${q ? `?${q}` : ''}`);
}

// Notifications
export function broadcastNotification(data: { title: string; message: string; type?: string }) {
  return request<{
    data: { message: string; totalUsers: number; sentCount: number; failedCount: number };
  }>('/admin/notifications/broadcast', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Configuration
export function getAppConfig() {
  return request<{ data: AppConfig }>('/admin/configuration');
}

export function updateAppConfig(data: Partial<AppConfig>) {
  return request<{ data: AppConfig }>('/admin/configuration', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function sendTestEmail(to: string) {
  return request<{ data: { messageId: string } }>('/admin/configuration/test-email', {
    method: 'POST',
    body: JSON.stringify({ to }),
  });
}

// ─── Support Tickets ────────────────────────────────────────

export interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  category: string;
  email?: string;
  adminNotes?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  assignedTo: { id: string; name: string; email: string } | null;
  user: { id: string; firstName: string; lastName: string; email: string } | null;
}

export function listTickets(params?: {
  status?: string;
  priority?: string;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const qs = new URLSearchParams();
  if (params?.status) {
    qs.set('status', params.status);
  }
  if (params?.priority) {
    qs.set('priority', params.priority);
  }
  if (params?.category) {
    qs.set('category', params.category);
  }
  if (params?.search) {
    qs.set('search', params.search);
  }
  if (params?.page) {
    qs.set('page', String(params.page));
  }
  if (params?.limit) {
    qs.set('limit', String(params.limit));
  }
  const q = qs.toString();
  return request<PaginatedResponse<SupportTicket>>(`/admin/tickets${q ? `?${q}` : ''}`);
}

export function getTicketDetail(id: string) {
  return request<{ data: SupportTicket }>(`/admin/tickets/${id}`);
}

export function updateTicket(
  id: string,
  data: {
    status?: string;
    priority?: string;
    adminNotes?: string;
  },
) {
  return request<{ data: SupportTicket }>(`/admin/tickets/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function assignTicket(id: string) {
  return request<{ data: SupportTicket }>(`/admin/tickets/${id}/assign`, {
    method: 'POST',
  });
}

// ─── System Health ─────────────────────────────────────────

export interface SystemHealth {
  status: string;
  uptime: number;
  version: string;
  services: {
    database: { status: string; latency?: number };
    redis: { status: string };
    memory: { usage: string; heapUsed: number; heapTotal: number };
    cpu: { loadAverage: number[]; cores: number };
    disk?: { status: string; free: number; total: number };
  };
}

export function getSystemHealth() {
  return request<{ data: SystemHealth }>('/admin/analytics/system-health');
}

// ─── Coupons ────────────────────────────────────────────────

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export function listCoupons() {
  return request<{ data: Coupon[] }>('/admin/coupons');
}

export function createCoupon(data: {
  code: string;
  description?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxUses?: number;
  expiresAt?: string;
}) {
  return request<{ data: Coupon }>('/admin/coupons', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateCoupon(id: string, data: Partial<Coupon>) {
  return request<{ data: Coupon }>(`/admin/coupons/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteCoupon(id: string) {
  return request<{ data: { message: string } }>(`/admin/coupons/${id}`, { method: 'DELETE' });
}

// ─── Expiring Subscriptions ─────────────────────────────────

export interface ExpiringSubscription {
  id: string;
  user: { id: string; email: string; firstName: string; lastName: string };
  plan: { name: string; price: number; interval: string };
  currentPeriodEnd: string;
  status: string;
}

export function getExpiringSubscriptions(days = 7) {
  return request<{ data: ExpiringSubscription[] }>(`/admin/subscriptions/expiring?days=${days}`);
}

export function getFailedPayments() {
  return request<{ data: any[] }>('/admin/subscriptions/failed-payments');
}

export function getSubscriptionDetail(id: string) {
  return request<{ data: any }>(`/admin/subscriptions/${id}`);
}

export interface ConversionFunnel {
  pricing_viewed: number;
  checkout_started: number;
  payment_completed: number;
  retained_30d: number;
  viewToCheckout: string;
  checkoutToPayment: string;
  paymentToRetained: string;
  overallConversion: string;
}

export function getConversionFunnel() {
  return request<{ data: ConversionFunnel }>('/admin/analytics/conversion');
}

// ─── MFA ────────────────────────────────────────────────────

export interface MfaSetupData {
  secret: string;
  qrCodeUrl: string;
}

export function loginWithMfa(email: string, password: string, totpCode: string) {
  return request<{ data: { accessToken: string; admin: any } }>('/admin/auth/login-mfa', {
    method: 'POST',
    body: JSON.stringify({ email, password, totpCode }),
  });
}

export function getMfaStatus() {
  return request<{ data: { required: boolean; verified: boolean; email: string } }>('/admin/mfa/status');
}

export function setupMfa() {
  return request<{ data: MfaSetupData }>('/admin/mfa/setup', { method: 'POST' });
}

export function verifyMfaSetup(totpCode: string) {
  return request<{ data: { verified: boolean } }>('/admin/mfa/verify', {
    method: 'POST',
    body: JSON.stringify({ totpCode }),
  });
}

export function disableMfa() {
  return request<{ data: { message: string } }>('/admin/mfa/disable', { method: 'POST' });
}

// ─── Admin Users ────────────────────────────────────────────

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export function listAdmins(params?: { search?: string; page?: number; limit?: number }) {
  const qs = new URLSearchParams();
  if (params?.search) {
    qs.set('search', params.search);
  }
  if (params?.page) {
    qs.set('page', String(params.page));
  }
  if (params?.limit) {
    qs.set('limit', String(params.limit));
  }
  const q = qs.toString();
  return request<PaginatedResponse<AdminUser>>(`/admin/admins${q ? `?${q}` : ''}`);
}

export function deleteAdmin(id: string) {
  return request<{ data: { message: string } }>(`/admin/admins/${id}`, { method: 'DELETE' });
}

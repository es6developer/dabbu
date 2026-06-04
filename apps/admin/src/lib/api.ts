const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

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
  pendingPayments?: number;
  totalFeatureFlags?: number;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
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

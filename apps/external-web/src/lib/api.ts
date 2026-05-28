const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dabbu.app';

interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

function getTempToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem('dabbu_temp_token');
}

function setTempToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('dabbu_temp_token', token);
  }
}

function clearTempToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('dabbu_temp_token');
  }
}

function getTempSession(): Record<string, unknown> | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const session = localStorage.getItem('dabbu_temp_session');
  return session ? JSON.parse(session) : null;
}

function setTempSession(data: Record<string, unknown>): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('dabbu_temp_session', JSON.stringify(data));
  }
}

function clearTempSession(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('dabbu_temp_session');
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<ApiResponse<T>> {
  const token = getTempToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const body = await res.json();
    const data = body?.data !== undefined ? body.data : body;

    if (!res.ok) {
      return { error: body.message || body.error || 'Request failed', status: res.status };
    }

    return { data: data as T, status: res.status };
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { error: 'Request timed out', status: 0 };
    }
    return { error: err instanceof Error ? err.message : 'Network error', status: 0 };
  }
}

const get = <T>(path: string) => request<T>('GET', path);
const post = <T>(path: string, body?: Record<string, unknown>) => request<T>('POST', path, body);
const patch = <T>(path: string, body?: Record<string, unknown>) => request<T>('PATCH', path, body);
const del = <T>(path: string) => request<T>('DELETE', path);

export const api = {
  getTempToken,
  setTempToken,
  clearTempToken,
  getTempSession,
  setTempSession,
  clearTempSession,

  auth: {
    sendOtp: (email: string) =>
      post<{ success: boolean }>('/external-sharing/auth/email-otp', { email }),
    verifyOtp: (email: string, otp: string) =>
      post<{ token: string; user: Record<string, unknown> }>(
        '/external-sharing/auth/email-verify',
        { email, otp },
      ),
    phoneSendOtp: (phone: string) =>
      post<{ success: boolean }>('/external-sharing/auth/phone-otp', { phone }),
    phoneVerifyOtp: (phone: string, otp: string) =>
      post<{ token: string; user: Record<string, unknown> }>(
        '/external-sharing/auth/phone-verify',
        { phone, otp },
      ),
    anonymous: (name: string) =>
      post<{ token: string; user: Record<string, unknown> }>('/external-sharing/auth/anonymous', {
        name,
      }),
    google: () => {
      window.location.href = `${API_BASE_URL}/external-sharing/auth/google`;
    },
  },

  groups: {
    get: (id: string) => get<Group>(`/shared-finance/groups/${id}`),
    join: (token: string) =>
      post<{ group: Group; membership: Record<string, unknown> }>(
        `/external-sharing/invites/${token}/join`,
        {},
      ),
    getInvite: (token: string) =>
      get<{ group: Group; inviter: Record<string, unknown>; permissions: string[] }>(
        `/external-sharing/invites/${token}`,
      ),
  },

  expenses: {
    list: (groupId: string) => get<Expense[]>(`/shared-finance/groups/${groupId}/expenses`),
    create: (groupId: string, data: Record<string, unknown>) =>
      post<Expense>(`/shared-finance/groups/${groupId}/expenses`, data),
    get: (groupId: string, expenseId: string) =>
      get<Expense>(`/shared-finance/groups/${groupId}/expenses/${expenseId}`),
    settle: (groupId: string, expenseId: string) =>
      post<Expense>(`/shared-finance/groups/${groupId}/expenses/${expenseId}/settle`, {}),
  },

  settlements: {
    list: (groupId: string) => get<Settlement[]>(`/shared-finance/groups/${groupId}/settlements`),
    create: (groupId: string, data: Record<string, unknown>) =>
      post<Settlement>(`/shared-finance/groups/${groupId}/settlements`, data),
    markPaid: (groupId: string, settlementId: string) =>
      post<Settlement>(`/shared-finance/groups/${groupId}/settlements/${settlementId}/paid`, {}),
  },

  chat: {
    list: (groupId: string) => get<ChatMessage[]>(`/shared-finance/groups/${groupId}/chat`),
    send: (groupId: string, content: string) =>
      post<ChatMessage>(`/shared-finance/groups/${groupId}/chat`, { content }),
  },
};

export interface Group {
  id: string;
  name: string;
  description?: string;
  type: 'trip' | 'shared' | 'house' | 'event' | 'other';
  memberCount: number;
  totalBalance: number;
  members: Member[];
  createdAt: string;
  currency: string;
  _count?: { members: number };
}

export interface Member {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  balance: number;
  isOnline: boolean;
  role: 'admin' | 'member' | 'guest';
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  paidBy: Member;
  splitType: 'equal' | 'percentage' | 'exact';
  shares: ExpenseShare[];
  date: string;
  settled: boolean;
  groupId: string;
  createdAt: string;
}

export interface ExpenseShare {
  memberId: string;
  memberName: string;
  amount: number;
  percentage?: number;
  settled: boolean;
}

export interface Settlement {
  id: string;
  from: Member;
  to: Member;
  amount: number;
  method: string;
  note?: string;
  status: 'pending' | 'completed';
  date: string;
  groupId: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  sender: Member;
  content: string;
  type: 'text' | 'expense' | 'settlement' | 'system';
  referenceId?: string;
  createdAt: string;
  readBy: string[];
}

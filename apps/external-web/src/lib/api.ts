const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://backend-ochre-delta-80.vercel.app/api/v1';

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
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), 15000);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: abortController.signal,
    });
    clearTimeout(timeout);
    const json = await response.json();
    const data = json?.data !== undefined ? json.data : json;
    if (!response.ok) {
      return { error: json.message || json.error || 'Request failed', status: response.status };
    }
    return { data: data as T, status: response.status };
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

function normalizeGroup(raw: any): Group {
  const members: Member[] = [
    ...(raw.members || []).map((m: any) => ({
      id: m.user?.id || m.userId,
      name: [m.user?.firstName, m.user?.lastName].filter(Boolean).join(' ').trim() || 'Unknown',
      email: m.user?.email,
      avatar: m.user?.avatarUrl,
      balance: 0,
      isOnline: false,
      role: m.role === 'owner' ? 'admin' : m.role || 'member',
    })),
    ...(raw.tempMembers || []).map((tm: any) => ({
      id: tm.tempUser?.id || tm.tempUserId,
      name: tm.nickname || tm.tempUser?.displayName || 'Guest',
      email: tm.tempUser?.email,
      avatar: tm.tempUser?.avatarUrl,
      balance: 0,
      isOnline: false,
      role: 'guest' as const,
    })),
  ];

  const balanceMap = new Map<string, number>();
  for (const b of raw.balances || []) {
    balanceMap.set(b.userId, Number(b.netBalance) || 0);
  }
  for (const m of members) {
    m.balance = balanceMap.get(m.id) || 0;
  }

  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    type: raw.type,
    memberCount: raw._count?.members || members.length,
    totalBalance: 0,
    members,
    createdAt: raw.createdAt,
    currency: raw.currency || 'INR',
    _count: raw._count,
  };
}

function normalizeExpense(raw: any): Expense {
  const paidByUser = raw.paidBy?.user;
  const paidByName = paidByUser
    ? [paidByUser.firstName, paidByUser.lastName].filter(Boolean).join(' ').trim()
    : 'Unknown';

  return {
    id: raw.id,
    description: raw.description,
    amount: Number(raw.amount),
    category: raw.category,
    paidBy: {
      id: paidByUser?.id || raw.paidBy?.userId,
      name: paidByName,
      email: paidByUser?.email,
      avatar: paidByUser?.avatarUrl,
      balance: 0,
      isOnline: false,
      role: 'member',
    },
    splitType: raw.splitType,
    shares: (raw.splits || []).map((s: any) => {
      const shareUser = s.member?.user;
      return {
        memberId: shareUser?.id || s.memberId,
        memberName: shareUser
          ? [shareUser.firstName, shareUser.lastName].filter(Boolean).join(' ').trim()
          : 'Unknown',
        amount: Number(s.amount),
        percentage:
          s.percentage !== null && s.percentage !== undefined ? Number(s.percentage) : undefined,
        settled: s.isSettled || false,
      };
    }),
    date: raw.date,
    settled: (raw.splits || []).length > 0 && (raw.splits || []).every((s: any) => s.isSettled),
    groupId: raw.groupId,
    createdAt: raw.createdAt,
  };
}

function normalizeSettlement(raw: any): Settlement {
  const fromUser = raw.fromMember?.user;
  const toUser = raw.toMember?.user;
  const fromName = fromUser
    ? [fromUser.firstName, fromUser.lastName].filter(Boolean).join(' ').trim()
    : 'Unknown';
  const toName = toUser
    ? [toUser.firstName, toUser.lastName].filter(Boolean).join(' ').trim()
    : 'Unknown';

  return {
    id: raw.id,
    from: {
      id: fromUser?.id || raw.fromMember?.userId,
      name: fromName,
      email: fromUser?.email,
      avatar: fromUser?.avatarUrl,
      balance: 0,
      isOnline: false,
      role: 'member',
    },
    to: {
      id: toUser?.id || raw.toMember?.userId,
      name: toName,
      email: toUser?.email,
      avatar: toUser?.avatarUrl,
      balance: 0,
      isOnline: false,
      role: 'member',
    },
    amount: Number(raw.amount),
    method: raw.method || 'other',
    note: raw.note,
    status: raw.status,
    date: raw.date || raw.createdAt,
    groupId: raw.groupId,
    createdAt: raw.createdAt,
  };
}

function normalizeExpenseList(raw: any): Expense[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map(normalizeExpense);
}

function normalizeSettlementList(raw: any): Settlement[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map(normalizeSettlement);
}

function normalizeChatMessage(raw: any): ChatMessage {
  const senderUser = raw.sender?.user;
  const senderName = senderUser
    ? [senderUser.firstName, senderUser.lastName].filter(Boolean).join(' ').trim()
    : raw.senderName || 'Unknown';
  return {
    id: raw.id,
    sender: {
      id: senderUser?.id || raw.senderId,
      name: senderName,
      email: senderUser?.email,
      avatar: senderUser?.avatarUrl,
      balance: 0,
      isOnline: false,
      role: 'member',
    },
    content: raw.content,
    type: raw.type || 'text',
    referenceId: raw.referenceId,
    createdAt: raw.createdAt,
    readBy: raw.readBy || [],
  };
}

export const api = {
  getTempToken,
  setTempToken,
  clearTempToken,
  getTempSession,
  setTempSession,
  clearTempSession,

  auth: {
    google: (idToken: string) => {
      const deviceId = `web_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      return post<{ token: string; user: Record<string, unknown> }>(
        '/external-sharing/auth/google',
        { idToken, deviceId },
      );
    },
  },

  groups: {
    get: async (groupId: string) => {
      const res = await get<any>(`/shared-finance/groups/${groupId}`);
      if (res.error) {
        return res as ApiResponse<Group>;
      }
      return { data: normalizeGroup(res.data!), status: res.status };
    },

    getInvite: async (token: string) => {
      const res = await get<any>(`/shared-finance/invites/${token}`);
      if (res.error) {
        return res;
      }
      const raw = res.data || res;
      const groupInfo = raw.group as any;
      const inviterInfo = raw.inviter as any;
      const group: Group = {
        id: groupInfo?.id,
        name: groupInfo?.name || 'Group',
        type: groupInfo?.type || 'shared',
        description: groupInfo?.description,
        memberCount: 0,
        totalBalance: 0,
        members: [],
        createdAt: groupInfo?.createdAt || '',
        currency: groupInfo?.currency || 'INR',
      };
      return {
        data: {
          group,
          inviter: inviterInfo
            ? {
                name:
                  [inviterInfo.firstName, inviterInfo.lastName].filter(Boolean).join(' ') ||
                  inviterInfo.email,
              }
            : { name: 'Someone' },
          permissions: [],
        },
        status: 200,
      };
    },

    join: async (token: string) => {
      const res = await post<any>(`/shared-finance/invites/${token}/join`, {});
      const raw = res.data || res;
      const groupId = raw?.group?.id || raw?.groupId;
      if (groupId) {
        return { data: { groupId }, status: res.status };
      }
      return { error: 'Failed to join group', status: 400 };
    },

    generateInvite: async (groupId: string) => {
      const res = await post<any>(`/shared-finance/groups/${groupId}/invites`, {
        email: `invitee-${Date.now()}@temp.dabbu.app`,
      });
      const raw = res.data || res;
      const inviteToken = raw?.token || raw?.inviteToken;
      if (inviteToken) {
        return { data: { inviteToken }, status: res.status };
      }
      return res;
    },
  },

  expenses: {
    list: async (groupId: string) => {
      const res = await get<any[]>(`/shared-finance/expenses?groupId=${groupId}`);
      if (res.error) {
        return res as ApiResponse<Expense[]>;
      }
      return { data: normalizeExpenseList(res.data || []), status: res.status };
    },

    create: async (
      groupId: string,
      data: {
        description: string;
        amount: number;
        category: string;
        splitType: string;
        paidById: string;
        shares?: { memberId: string; amount: number; percentage?: number }[];
        date?: string;
        notes?: string;
      },
    ) => {
      return post<any>(`/shared-finance/expenses`, {
        groupId,
        description: data.description,
        amount: data.amount,
        paidBy: data.paidById,
        category: data.category,
        splitType: data.splitType,
        date: data.date || new Date().toISOString(),
        splits: data.shares || [],
        notes: data.notes || '',
      });
    },
  },

  settlements: {
    list: async (groupId: string) => {
      const res = await get<any[]>(`/shared-finance/settlements?groupId=${groupId}`);
      if (res.error) {
        return res as ApiResponse<Settlement[]>;
      }
      return { data: normalizeSettlementList(res.data || []), status: res.status };
    },

    create: async (
      groupId: string,
      data: {
        fromId: string;
        toId: string;
        amount: number;
        method: string;
        note?: string;
      },
    ) => {
      return post<any>(`/shared-finance/settlements`, {
        groupId,
        fromId: data.fromId,
        toId: data.toId,
        amount: data.amount,
        method: data.method,
        note: data.note,
      });
    },

    markPaid: async (groupId: string, settlementId: string) => {
      return patch<any>(`/shared-finance/settlements/${settlementId}/complete`, {
        method: 'upi',
      });
    },

    getPayLink: async (token: string) => {
      return get<any>(`/shared-finance/settlements/pay/${token}`);
    },

    guestPayNow: async (token: string, upiId?: string) => {
      return post<any>(`/shared-finance/settlements/guest/pay/${token}`, upiId ? { upiId } : {});
    },

    guestConfirmSettlement: async (
      settlementId: string,
      action: 'confirm' | 'reject',
      reason?: string,
    ) => {
      return post<any>(`/shared-finance/settlements/guest/${action}`, { settlementId, reason });
    },

    getGuestDashboard: async (groupId: string) => {
      return get<any>(`/shared-finance/settlements/guest/dashboard/${groupId}`);
    },
  },

  chat: {
    list: async (groupId: string) => {
      const res = await get<any[]>(`/shared-finance/chat?groupId=${groupId}`);
      if (res.error) {
        return res as ApiResponse<ChatMessage[]>;
      }
      return { data: (res.data || []).map(normalizeChatMessage), status: res.status };
    },

    send: async (groupId: string, content: string) => {
      return post<any>(`/shared-finance/chat`, { groupId, content });
    },
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

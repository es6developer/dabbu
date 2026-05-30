'use client';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://backend-ochre-delta-80.vercel.app/api/v1';

export type AccessStatus = 'valid' | 'expired' | 'completed' | 'archived' | 'removed' | 'closed';

export interface GroupAccessData {
  groupName?: string;
  groupType?: string;
  dateRange?: { start: string; end: string };
  totalSpent?: number;
  personalBalance?: number;
  totalPaid?: number;
  totalOwed?: number;
  settlementStatus?: string;
  memberCount?: number;
  yourContribution?: number;
}

export interface GroupAccessResponse {
  hasAccess: boolean;
  status: string;
  reason?: string;
  data?: GroupAccessData;
}

export interface MemberAccessResponse {
  isMember: boolean;
  role?: string;
  restrictions?: string[];
}

function getToken(token?: string): string | null {
  if (token) {
    return token;
  }
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem('dabbu_temp_token');
}

function buildHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const t = getToken(token);
  if (t) {
    headers['Authorization'] = `Bearer ${t}`;
  }
  return headers;
}

export async function checkGroupAccess(
  groupId: string,
  token?: string,
): Promise<GroupAccessResponse> {
  try {
    const res = await fetch(`${API_URL}/external-sharing/lifecycle/groups/${groupId}/status`, {
      headers: buildHeaders(token),
    });

    if (res.status === 401 || res.status === 403) {
      return {
        hasAccess: false,
        status: 'expired',
        reason: 'Authentication failed',
      };
    }

    const data = await res.json();

    if (!res.ok) {
      return {
        hasAccess: false,
        status: data.status || 'expired',
        reason: data.message || data.error || 'Access denied',
        data: data.data,
      };
    }

    return {
      hasAccess: data.hasAccess ?? true,
      status: data.status || 'active',
      reason: data.reason,
      data: data.data,
    };
  } catch (err) {
    return {
      hasAccess: false,
      status: 'expired',
      reason: err instanceof Error ? err.message : 'Network error',
    };
  }
}

export async function checkMemberAccess(
  groupId: string,
  tempUserId: string,
  token?: string,
): Promise<MemberAccessResponse> {
  try {
    const res = await fetch(
      `${API_URL}/external-sharing/lifecycle/groups/${groupId}/members/${tempUserId}`,
      { headers: buildHeaders(token) },
    );

    if (res.status === 401 || res.status === 403) {
      return { isMember: false, restrictions: ['no_access'] };
    }

    const data = await res.json();

    if (!res.ok) {
      return { isMember: false, restrictions: [data.status || 'no_access'] };
    }

    return {
      isMember: data.isMember ?? true,
      role: data.role || 'guest',
      restrictions: data.restrictions || [],
    };
  } catch {
    return { isMember: false, restrictions: ['network_error'] };
  }
}

export function resolveAccessStatus(response: GroupAccessResponse): {
  status: AccessStatus;
  shouldRedirect: boolean;
} {
  if (response.hasAccess && response.status === 'active') {
    return { status: 'valid', shouldRedirect: false };
  }

  const s = response.status.toLowerCase();

  if (s === 'completed' || s === 'finished') {
    return { status: 'completed', shouldRedirect: true };
  }

  if (s === 'archived') {
    return { status: 'archived', shouldRedirect: true };
  }

  if (s === 'removed') {
    return { status: 'removed', shouldRedirect: true };
  }

  if (s === 'closed' || s === 'expired' || s === 'revoked') {
    return { status: 'expired', shouldRedirect: true };
  }

  if (!response.hasAccess) {
    return { status: 'expired', shouldRedirect: true };
  }

  return { status: 'valid', shouldRedirect: false };
}

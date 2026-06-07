import { api } from './api';

const COUNTRY_CODE = '+91';

export interface ContactUser {
  id: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
}

export async function fetchRecentContacts(): Promise<ContactUser[]> {
  try {
    const [expenseRes, sharedRes] = await Promise.allSettled([
      api.get<any>('/expense-groups'),
      api.get<any>('/shared-finance/groups'),
    ]);

    const seen = new Map<string, ContactUser>();

    const extract = (data: any) => {
      if (!data) return;
      const list = Array.isArray(data) ? data : data?.data || [];
      for (const group of list) {
        const members = group.members || [];
        for (const m of members) {
          const u = m.user || m;
          if (u.id && !seen.has(u.id)) {
            seen.set(u.id, {
              id: u.id,
              firstName: u.firstName || '',
              lastName: u.lastName || '',
              phone: u.phone || '',
              email: u.email || '',
            });
          }
        }
      }
    };

    if (expenseRes.status === 'fulfilled') extract(expenseRes.value);
    if (sharedRes.status === 'fulfilled') extract(sharedRes.value);

    return Array.from(seen.values());
  } catch {
    return [];
  }
}

export async function searchUsersByPhone(query: string): Promise<ContactUser[]> {
  try {
    const res = await api.get<any>(`/users/search?query=${encodeURIComponent(query)}`);
    return Array.isArray(res) ? res : res?.data || [];
  } catch {
    return [];
  }
}

export function displayName(user: ContactUser): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
  const phone = user.phone ? user.phone.replace(COUNTRY_CODE, '') : '';
  return `${phone} - ${name || user.email || 'Unknown'}`;
}

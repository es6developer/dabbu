import * as Contacts from 'expo-contacts';
import { api } from './api';

const COUNTRY_CODE = '+91';

export interface ContactUser {
  id: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
}

export interface DeviceContact {
  id: string;
  name: string;
  phone?: string;
  email?: string;
}

export interface ContactMatch {
  userId: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  isFriend: boolean;
  isAppUser: boolean;
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

export async function requestContactsPermission(): Promise<boolean> {
  try {
    const { status } = await Contacts.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function getContactsPermissionStatus(): Promise<boolean> {
  try {
    const { status } = await Contacts.getPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export type PermissionStatusStr = 'granted' | 'denied' | 'undetermined';

export async function getRawPermissionStatus(): Promise<PermissionStatusStr> {
  try {
    const { status } = await Contacts.getPermissionsAsync();
    return status as PermissionStatusStr;
  } catch {
    return 'undetermined';
  }
}

export async function requestRawPermission(): Promise<{ granted: boolean; status: PermissionStatusStr }> {
  try {
    const { status } = await Contacts.requestPermissionsAsync();
    return { granted: status === 'granted', status: status as PermissionStatusStr };
  } catch {
    return { granted: false, status: 'undetermined' };
  }
}

export async function fetchDeviceContacts(): Promise<DeviceContact[]> {
  try {
    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
      sort: 'firstName',
    });
    return data
      .filter((c) => c.name && c.name.trim())
      .map((c) => ({
        id: c.id || String(Math.random()),
        name: c.name || 'Unknown',
        phone: c.phoneNumbers?.[0]?.number || undefined,
        email: c.emails?.[0]?.email || undefined,
      }));
  } catch {
    return [];
  }
}

export async function syncContacts(): Promise<{ matched: ContactMatch[]; unmatched: DeviceContact[] }> {
  const deviceContacts = await fetchDeviceContacts();
  const phones = deviceContacts
    .map((c) => c.phone)
    .filter(Boolean)
    .map((p) => p!.replace(/[^0-9]/g, ''))
    .filter((p) => p.length >= 10);

  let matched: ContactMatch[] = [];
  let unmatched: DeviceContact[] = [];

  if (phones.length > 0) {
    try {
      const res = await api.post<any>('/users/match-contacts', { phones });
      const data = Array.isArray(res) ? res : res?.matched || [];
      matched = data;
    } catch {
      matched = [];
    }
  }

  const matchedPhones = new Set(matched.map((m) => m.phone));
  unmatched = deviceContacts.filter((c) => {
    const p = c.phone?.replace(/[^0-9]/g, '');
    return p ? !matchedPhones.has(p) : true;
  });

  return { matched, unmatched };
}

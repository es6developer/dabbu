import * as Contacts from 'expo-contacts';
import { Platform, Alert, Linking } from 'react-native';
import CryptoES from 'crypto-es';

function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-\(\)]/g, '').replace(/^\+/, '').replace(/^0+/, '');
}

function sha256(value: string): string {
  return CryptoES.SHA256(value).toString(CryptoES.enc.Hex);
}

export async function requestContactsPermission(): Promise<boolean> {
  const { status } = await Contacts.requestPermissionsAsync();
  return status === 'granted';
}

export async function getContactsPermissionStatus(): Promise<boolean> {
  const { status } = await Contacts.getPermissionsAsync();
  return status === 'granted';
}

export interface ContactEntry {
  name: string;
  phones: string[];
}

export async function readContacts(): Promise<ContactEntry[]> {
  const { data } = await Contacts.getContactsAsync({
    fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
  });
  return data
    .filter((c) => c.name && c.phoneNumbers && c.phoneNumbers.length > 0)
    .map((c) => ({
      name: c.name || 'Unknown',
      phones: (c.phoneNumbers || []).map((p) => p.number || '').filter(Boolean),
    }));
}

export async function syncContacts(): Promise<{ matched: any[]; totalHashes: number }> {
  const granted = await requestContactsPermission();
  if (!granted) {
    return { matched: [], totalHashes: 0 };
  }
  const contacts = await readContacts();
  const hashes: string[] = [];
  const seen = new Set<string>();
  for (const c of contacts) {
    for (const phone of c.phones) {
      const normalized = normalizePhone(phone);
      if (normalized.length > 5 && !seen.has(normalized)) {
        seen.add(normalized);
        hashes.push(sha256(normalized));
      }
    }
  }
  const { api } = require('./api');
  const res = await api.post<{ matched: any[] }>('/users/contacts/sync', { hashes });
  return {
    matched: res?.matched || res?.data?.matched || [],
    totalHashes: hashes.length,
  };
}

export function formatPhoneForDisplay(phone: string): string {
  const cleaned = normalizePhone(phone);
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  if (cleaned.length > 10) {
    return `+${cleaned.slice(0, cleaned.length - 10)} ${cleaned.slice(-10, -5)} ${cleaned.slice(-5)}`;
  }
  return phone;
}

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { API_URL } from '../config/api';
import { getAccessToken } from '../services/api';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function uint8ToBase64(bytes: Uint8Array): string {
  let result = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = bytes[i + 1] ?? 0;
    const c = bytes[i + 2] ?? 0;
    result += CHARS[a >> 2]
      + CHARS[((a & 3) << 4) | (b >> 4)]
      + CHARS[((b & 15) << 2) | (c >> 6)]
      + CHARS[c & 63];
  }
  const pad = bytes.length % 3;
  if (pad === 1) result = result.slice(0, -2) + '==';
  else if (pad === 2) result = result.slice(0, -1) + '=';
  return result;
}

export async function downloadAndShareFile(
  endpoint: string,
  body: any,
  filename: string,
  format: 'pdf' | 'excel' | 'csv',
): Promise<void> {
  const token = getAccessToken();
  if (!token) throw new Error('Not authenticated');

  const mimeMap: Record<string, string> = {
    pdf: 'application/pdf',
    excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    csv: 'text/csv',
  };

  const extMap: Record<string, string> = {
    pdf: 'pdf',
    excel: 'xlsx',
    csv: 'csv',
  };

  const res = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Export failed' }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }

  const buffer = await res.arrayBuffer();
  const base64 = uint8ToBase64(new Uint8Array(buffer));

  const fileUri = `${FileSystem.cacheDirectory}${filename}.${extMap[format] || format}`;
  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: mimeMap[format] || 'application/octet-stream',
      dialogTitle: `Share ${filename}`,
    });
  }
}

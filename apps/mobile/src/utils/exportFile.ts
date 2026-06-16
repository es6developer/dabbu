import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { API_URL } from '../config/api';
import { getAccessToken } from '../services/api';

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
  const base64 = btoa(
    new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''),
  );

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

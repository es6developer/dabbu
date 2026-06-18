import { api } from './api';

const SESSION_ID = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export async function trackEventImmediate(
  event: string,
  category?: string,
  label?: string,
  properties?: any,
) {
  try {
    await api.post('/analytics/track', {
      event,
      category,
      label,
      properties,
      sessionId: SESSION_ID,
    });
  } catch {
    /* silent */
  }
}

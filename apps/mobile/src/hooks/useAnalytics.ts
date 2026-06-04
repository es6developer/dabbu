import { useCallback, useRef } from 'react';
import { api, setAccessToken } from '../services/api';
import { useAuth } from '../store/AuthContext';

const SESSION_ID = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const BATCH_SIZE = 10;
const FLUSH_INTERVAL = 30000;

const eventQueue: any[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let currentToken: string | null = null;

function setToken(token: string | null) {
  currentToken = token;
  if (token) {setAccessToken(token);}
}

async function flush() {
  if (eventQueue.length === 0) {return;}
  const batch = eventQueue.splice(0, BATCH_SIZE);
  try {
    if (currentToken) {setAccessToken(currentToken);}
    await api.post('/analytics/track/batch', { events: batch });
  } catch {
    eventQueue.unshift(...batch);
  }
}

function scheduleFlush() {
  if (flushTimer) {clearTimeout(flushTimer);}
  flushTimer = setTimeout(() => {
    flush();
    scheduleFlush();
  }, FLUSH_INTERVAL);
}

scheduleFlush();

function enqueue(event: string, category?: string, label?: string, properties?: any) {
  eventQueue.push({ event, category, label, properties, sessionId: SESSION_ID });
  if (eventQueue.length >= BATCH_SIZE) {
    flush();
  }
}

export function useAnalytics() {
  const { accessToken } = useAuth();
  if (accessToken) {setToken(accessToken);}

  const track = useCallback(
    (event: string, category?: string, label?: string, properties?: any) => {
      enqueue(event, category, label, properties);
    },
    [],
  );

  const trackScreen = useCallback(
    (screenName: string, properties?: any) => {
      enqueue('screen_view', 'navigation', screenName, properties);
    },
    [],
  );

  const trackFeature = useCallback(
    (feature: string, action?: string) => {
      enqueue('feature_used', feature, action);
    },
    [],
  );

  return { track, trackScreen, trackFeature };
}

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

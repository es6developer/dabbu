import { create } from 'zustand';
import { api, setAccessToken } from '../services/api';

type AnalyticsEvent =
  | 'app_opened'
  | 'onboarding_completed'
  | 'lens_selected'
  | 'space_created'
  | 'transaction_added'
  | 'goal_created'
  | 'ai_prompt_used'
  | 'health_score_viewed';

interface AnalyticsStore {
  track: (event: AnalyticsEvent, properties?: Record<string, any>) => void;
  trackWithToken: (accessToken: string | null, event: AnalyticsEvent, properties?: Record<string, any>) => void;
}

export const useAnalyticsStore = create<AnalyticsStore>(() => ({
  track: (event, properties) => {
    api.post('/analytics/track', { event, properties, timestamp: new Date().toISOString() }).catch(() => {});
  },
  trackWithToken: (accessToken, event, properties) => {
    if (accessToken) setAccessToken(accessToken);
    api.post('/analytics/track', { event, properties, timestamp: new Date().toISOString() }).catch(() => {});
  },
}));

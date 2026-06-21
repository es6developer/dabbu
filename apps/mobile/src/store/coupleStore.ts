import { create } from 'zustand';
import { api } from '../services/api';

interface PartnerInfo {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
}

interface RelationshipInfo {
  coupleId: string;
  sinceDate: string;
  status: string;
}

interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  eventType: string;
  amount?: number;
  icon?: string;
  createdAt: string;
}

interface CoupleState {
  profile: { partner: PartnerInfo | null; relationship: RelationshipInfo | null; hasPartner: boolean } | null;
  timeline: TimelineEvent[];
  loading: boolean;

  fetchProfile: () => Promise<void>;
  fetchTimeline: () => Promise<void>;
  addTimelineEvent: (title: string, description?: string, eventType?: string) => Promise<void>;
  deleteTimelineEvent: (eventId: string) => Promise<void>;
  clear: () => void;
}

export const useCoupleStore = create<CoupleState>((set, get) => ({
  profile: null,
  timeline: [],
  loading: false,

  fetchProfile: async () => {
    try {
      const res = await api.get<any>('/couple/profile');
      const data = res?.data || res;
      set({ profile: data });
    } catch {
      set({ profile: null });
    }
  },

  fetchTimeline: async () => {
    try {
      const res = await api.get<any>('/couple/timeline');
      const data = res?.data || res || [];
      set({ timeline: Array.isArray(data) ? data : [] });
    } catch {
      set({ timeline: [] });
    }
  },

  addTimelineEvent: async (title, description, eventType = 'custom') => {
    try {
      const res = await api.post<any>('/couple/timeline', { title, description, eventType });
      const data = res?.data || res;
      if (data) set({ timeline: [data, ...get().timeline] });
    } catch {
      /* silent */
    }
  },

  deleteTimelineEvent: async (eventId) => {
    try {
      await api.delete(`/couple/timeline/${eventId}`);
      set({ timeline: get().timeline.filter((e) => e.id !== eventId) });
    } catch {
      /* silent */
    }
  },

  clear: () => set({ profile: null, timeline: [], loading: false }),
}));

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

export type LifeEventType =
  | 'HOUSE'
  | 'BABY'
  | 'WEDDING'
  | 'CAR'
  | 'VACATION'
  | 'EDUCATION'
  | 'RETIREMENT'
  | 'BUSINESS'
  | 'MOVING'
  | 'JOB_CHANGE'
  | 'SALARY_INCREASE'
  | 'CUSTOM';

export interface LifeEvent {
  id: string;
  eventType: LifeEventType;
  title: string;
  description?: string;
  confidence: number;
  detectedAt: string;
  eventDate?: string;
  isConfirmed: boolean;
  isDismissed: boolean;
  source?: 'ai_detected' | 'user_created' | 'planner_created';
  spaceId?: string;
  goalId?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateLifeEventDto {
  eventType: LifeEventType;
  title: string;
  description?: string;
  eventDate?: string;
  spaceId?: string;
  source?: 'ai_detected' | 'user_created' | 'planner_created';
}

interface LifeEventStore {
  events: LifeEvent[];
  loading: boolean;
  error: string | null;
  fetchEvents: () => Promise<void>;
  createEvent: (data: CreateLifeEventDto) => Promise<LifeEvent | null>;
  confirmEvent: (id: string) => Promise<void>;
  dismissEvent: (id: string) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  getUnconfirmedCount: () => number;
}

export const useLifeEventStore = create<LifeEventStore>()(
  persist(
    (set, get) => ({
      events: [],
      loading: false,
      error: null,

      fetchEvents: async () => {
        set({ loading: true, error: null });
        try {
          const res = await api.get<any>('/life-events');
          const events = Array.isArray(res) ? res : res?.data || [];
          set({ events, loading: false });
        } catch (e: any) {
          set({ error: e?.message || 'Failed to load life events', loading: false });
        }
      },

      createEvent: async (data) => {
        try {
          const res = await api.post<any>('/life-events', data);
          const event = res?.data || res;
          if (event?.id) {
            set((s) => ({ events: [event, ...s.events] }));
          }
          return event;
        } catch (e: any) {
          set({ error: e?.message || 'Failed to create life event' });
          return null;
        }
      },

      confirmEvent: async (id) => {
        try {
          await api.patch(`/life-events/${id}`, { isConfirmed: true });
          set((s) => ({
            events: s.events.map((e) =>
              e.id === id ? { ...e, isConfirmed: true } : e
            ),
          }));
        } catch (e: any) {
          set({ error: e?.message || 'Failed to confirm event' });
        }
      },

      dismissEvent: async (id) => {
        try {
          await api.patch(`/life-events/${id}`, { isDismissed: true });
          set((s) => ({
            events: s.events.map((e) =>
              e.id === id ? { ...e, isDismissed: true } : e
            ),
          }));
        } catch (e: any) {
          set({ error: e?.message || 'Failed to dismiss event' });
        }
      },

      deleteEvent: async (id) => {
        try {
          await api.delete(`/life-events/${id}`);
          set((s) => ({ events: s.events.filter((e) => e.id !== id) }));
        } catch (e: any) {
          set({ error: e?.message || 'Failed to delete event' });
        }
      },

      getUnconfirmedCount: () => {
        return get().events.filter((e) => !e.isConfirmed && !e.isDismissed).length;
      },
    }),
    {
      name: 'dabbu-life-events',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ events: state.events }),
    }
  )
);

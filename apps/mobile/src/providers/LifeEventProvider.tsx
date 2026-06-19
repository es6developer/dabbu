import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useLifeEventStore, CreateLifeEventDto, LifeEvent } from '../store/lifeEventStore';
import { useAuth } from '../store/AuthContext';

interface LifeEventContextType {
  events: LifeEvent[];
  unconfirmedCount: number;
  loading: boolean;
  error: string | null;
  fetchEvents: () => Promise<void>;
  createEvent: (data: CreateLifeEventDto) => Promise<LifeEvent | null>;
  confirmEvent: (id: string) => Promise<void>;
  dismissEvent: (id: string) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
}

const LifeEventContext = createContext<LifeEventContextType>({
  events: [],
  unconfirmedCount: 0,
  loading: false,
  error: null,
  fetchEvents: async () => {},
  createEvent: async () => null,
  confirmEvent: async () => {},
  dismissEvent: async () => {},
  deleteEvent: async () => {},
});

export function LifeEventProvider({ children }: { children: ReactNode }) {
  const { accessToken } = useAuth();
  const {
    events,
    loading,
    error,
    fetchEvents,
    createEvent,
    confirmEvent,
    dismissEvent,
    deleteEvent,
    getUnconfirmedCount,
  } = useLifeEventStore();

  useEffect(() => {
    if (accessToken) {
      fetchEvents();
    }
  }, [accessToken]);

  return (
    <LifeEventContext.Provider
      value={{
        events,
        unconfirmedCount: getUnconfirmedCount(),
        loading,
        error,
        fetchEvents,
        createEvent,
        confirmEvent,
        dismissEvent,
        deleteEvent,
      }}
    >
      {children}
    </LifeEventContext.Provider>
  );
}

export function useLifeEvents() {
  return useContext(LifeEventContext);
}

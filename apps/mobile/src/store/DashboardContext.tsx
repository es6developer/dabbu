import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

interface Widget {
  type: string;
  data: any;
  state: 'loaded' | 'loading' | 'error' | 'disabled';
}

interface DashboardState {
  mode: 'personal' | 'couple' | 'family';
  widgets: Widget[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
}

interface DashboardContextValue extends DashboardState {
  refresh: () => Promise<void>;
  toggleWidget: (widgetType: string, scope?: string) => Promise<void>;
  reorderWidgets: (widgetTypes: string[], scope?: string) => Promise<void>;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DashboardState>({
    mode: 'personal',
    widgets: [],
    loading: true,
    refreshing: false,
    error: null,
  });

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setState(prev => ({ ...prev, refreshing: true }));
    else setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const res = await api.get<any>('/dashboard');
      const data = res.data || res;
      setState({
        mode: data.mode || 'personal',
        widgets: data.widgets || [],
        loading: false,
        refreshing: false,
        error: null,
      });
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        refreshing: false,
        error: err?.response?.data?.message || err.message || 'Failed to load dashboard',
      }));
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const refresh = useCallback(async () => {
    await fetchDashboard(true);
  }, [fetchDashboard]);

  const toggleWidget = useCallback(async (widgetType: string, scope = 'personal') => {
    try {
      await api.post('/dashboard/widgets/toggle', { widgetType, scope });
      await fetchDashboard(true);
    } catch { /* ignore */ }
  }, [fetchDashboard]);

  const reorderWidgets = useCallback(async (widgetTypes: string[], scope = 'personal') => {
    try {
      await api.post(`/dashboard/widgets/reorder?scope=${scope}`, { widgetTypes });
      await fetchDashboard(true);
    } catch { /* ignore */ }
  }, [fetchDashboard]);

  return (
    <DashboardContext.Provider value={{ ...state, refresh, toggleWidget, reorderWidgets }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard must be used within DashboardProvider');
  return ctx;
}

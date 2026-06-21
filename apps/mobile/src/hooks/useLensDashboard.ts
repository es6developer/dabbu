import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { useLensStore } from '../store/lensStore';
import type {
  DashboardWidgetData,
  LensFullConfig,
  LensRecommendation,
} from '../types';

export function useLensDashboard() {
  const activeLens = useLensStore((s) => s.activeLens);

  return useQuery({
    queryKey: ['lens-dashboard', activeLens],
    queryFn: async () => {
      const res = await api.get<DashboardWidgetData>('/lens/dashboard');
      return (res ?? { lens: activeLens, widgets: [], quickActions: [], generatedAt: new Date().toISOString() }) as DashboardWidgetData;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useLensConfig() {
  const activeLens = useLensStore((s) => s.activeLens);

  return useQuery({
    queryKey: ['lens-config', activeLens],
    queryFn: async () => {
      const res = await api.get<LensFullConfig>('/lens/config');
      return (res ?? {}) as LensFullConfig;
    },
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
  });
}

export function useLensCurrent() {
  return useQuery({
    queryKey: ['lens-current'],
    queryFn: async () => {
      const res = await api.get<any>('/lens/current');
      return res ?? {};
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useLensRecommendations() {
  const activeLens = useLensStore((s) => s.activeLens);

  return useQuery({
    queryKey: ['lens-recommendations', activeLens],
    queryFn: async () => {
      const res = await api.get<LensRecommendation[]>('/lens/recommendations');
      return (Array.isArray(res) ? res : []) as LensRecommendation[];
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

export function useLensNavigation() {
  const activeLens = useLensStore((s) => s.activeLens);

  return useQuery({
    queryKey: ['lens-navigation', activeLens],
    queryFn: async () => {
      const res = await api.get<{ tabs: any[]; hiddenTabs: string[] }>('/lens/navigation');
      return (res ?? { tabs: [], hiddenTabs: [] }) as { tabs: any[]; hiddenTabs: string[] };
    },
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
  });
}

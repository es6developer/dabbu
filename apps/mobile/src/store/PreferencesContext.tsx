import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, setAccessToken, getAccessToken } from '../services/api';

export interface TabConfig {
  id: string;
  visible: boolean;
  order: number;
  locked: boolean;
}

interface PreferencesContextType {
  bottomMenuConfig: TabConfig[];
  getTabVisibility: (id: string) => boolean;
  refresh: () => Promise<void>;
  updateTabConfig: (tabs: TabConfig[]) => void;
  bottomBarVisible: boolean;
  quickActionVisible: boolean;
  setBottomBarVisibility: (visible: boolean) => Promise<void>;
  setQuickActionVisibility: (visible: boolean) => Promise<void>;
}

const PreferencesContext = createContext<PreferencesContextType>({
  bottomMenuConfig: [],
  getTabVisibility: () => true,
  refresh: async () => {},
  updateTabConfig: () => {},
  bottomBarVisible: true,
  quickActionVisible: true,
  setBottomBarVisibility: async () => {},
  setQuickActionVisibility: async () => {},
});

const CACHE_KEY = '@dabbu_preferences_cache';
const VISIBILITY_CACHE_KEY = '@dabbu_visibility_cache';

const DEFAULT_TABS: TabConfig[] = [
  { id: 'Dashboard', visible: true, order: 0, locked: false },
  { id: 'Spaces', visible: true, order: 1, locked: false },
  { id: 'QuickAction', visible: true, order: 2, locked: false },
  { id: 'Goals', visible: true, order: 3, locked: false },
  { id: 'Settings', visible: true, order: 4, locked: true },
];

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [bottomMenuConfig, setBottomMenuConfig] = useState<TabConfig[]>(DEFAULT_TABS);
  const [bottomBarVisible, setBottomBarVisibleState] = useState(true);
  const [quickActionVisible, setQuickActionVisibleState] = useState(true);

  const oldKeyMap: Record<string, string> = {
    Shared: 'Spaces',
    Expense: 'Goals',
  };

  function migrateConfig(config: TabConfig[]): TabConfig[] {
    return config.map((t) => ({
      ...t,
      id: oldKeyMap[t.id] || t.id,
    }));
  }

  const updateTabConfig = useCallback((tabs: TabConfig[]) => {
    setBottomMenuConfig(tabs);
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify(tabs)).catch(() => {});
  }, []);

  const setBottomBarVisibility = useCallback(async (visible: boolean) => {
    setBottomBarVisibleState(visible);
    AsyncStorage.setItem(VISIBILITY_CACHE_KEY, JSON.stringify({ bottomBarVisible: visible, quickActionVisible })).catch(() => {});
    try {
      await api.put('/user/preferences/visibility', { bottomBarVisible: visible });
    } catch {
      /* optimistic update — keep local state */
    }
  }, [quickActionVisible]);

  const setQuickActionVisibility = useCallback(async (visible: boolean) => {
    setQuickActionVisibleState(visible);
    AsyncStorage.setItem(VISIBILITY_CACHE_KEY, JSON.stringify({ bottomBarVisible, quickActionVisible: visible })).catch(() => {});
    try {
      await api.put('/user/preferences/visibility', { quickActionVisible: visible });
    } catch {
      /* optimistic update — keep local state */
    }
  }, [bottomBarVisible]);

  const refresh = useCallback(async () => {
    try {
      const token = getAccessToken();
      if (!token) {
        return;
      }
      setAccessToken(token);
      const res = await api.get<any>('/user/preferences');
      const config = res?.bottomMenuConfig;
      if (config && config.length > 0) {
        const migrated = migrateConfig(config).sort((a: any, b: any) => a.order - b.order);
        setBottomMenuConfig(migrated);
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify(migrated)).catch(() => {});
      }
      if (typeof res?.bottomBarVisible === 'boolean') {
        setBottomBarVisibleState(res.bottomBarVisible);
      }
      if (typeof res?.quickActionVisible === 'boolean') {
        setQuickActionVisibleState(res.quickActionVisible);
      }
    } catch {
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached) as TabConfig[];
          setBottomMenuConfig(migrateConfig(parsed).sort((a, b) => a.order - b.order));
        }
        const cachedVis = await AsyncStorage.getItem(VISIBILITY_CACHE_KEY);
        if (cachedVis) {
          const parsed = JSON.parse(cachedVis);
          if (typeof parsed.bottomBarVisible === 'boolean') setBottomBarVisibleState(parsed.bottomBarVisible);
          if (typeof parsed.quickActionVisible === 'boolean') setQuickActionVisibleState(parsed.quickActionVisible);
        }
      } catch {
        /* use defaults */
      }
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const getTabVisibility = useCallback(
    (id: string): boolean => {
      const tab = bottomMenuConfig.find((t) => t.id === id);
      return tab ? tab.visible : true;
    },
    [bottomMenuConfig],
  );

  return (
    <PreferencesContext.Provider
      value={{
        bottomMenuConfig,
        getTabVisibility,
        refresh,
        updateTabConfig,
        bottomBarVisible,
        quickActionVisible,
        setBottomBarVisibility,
        setQuickActionVisibility,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesContextType {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error('usePreferences must be used within PreferencesProvider');
  }
  return ctx;
}

export function getDefaultTabConfig(): TabConfig[] {
  return DEFAULT_TABS;
}

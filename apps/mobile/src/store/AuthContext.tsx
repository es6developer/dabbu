import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
  useCallback,
} from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';

let SecureStore: any = {};
if (Platform.OS !== 'web') {
  SecureStore = require('expo-secure-store');
}

import {
  setAccessToken,
  getAccessToken,
  setRefreshTokenHandler,
  setOnSessionExpiredHandler,
  clearCache,
  api,
} from '../services/api';
import { registerForPushNotifications } from '../services/notifications';
import { trackEventImmediate } from '../hooks/useAnalytics';

const SESSION_TIMEOUT_MS = 24 * 60 * 60 * 1000;
const MIN_REFRESH_INTERVAL = 30_000;

function getDeviceInfo(): { deviceName: string; platform: string } {
  const platform = Platform.OS;
  let deviceName: string = platform;
  if (Platform.OS === 'ios') {
    deviceName = 'iPhone';
  } else if (Platform.OS === 'android') {
    deviceName = 'Android';
  }
  return { deviceName, platform };
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  role: string;
  phone?: string | null;
  upiId?: string | null;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  accessToken: string | null;
  isNewUser: boolean;
  needsPhone: boolean;
  isPremium: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    referralCode?: string,
  ) => Promise<void>;
  googleLogin: (idToken: string) => Promise<void>;
  guestLogin: () => Promise<void>;
  demoLogin: () => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  completeProfileSetup: (updatedUser?: Partial<User>) => void;
  updatePhone: (phone: string) => Promise<void>;
  updateAvatarUrl: (avatarUrl: string) => void;
  completeAuth: (token: string, user: User, wasNewUser: boolean) => void;
  refreshPremiumStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface StorageInterface {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
}

function getStorage(): StorageInterface {
  if (Platform.OS === 'web') {
    return {
      getItem: (key: string) => Promise.resolve(localStorage.getItem(key)),
      setItem: (key: string, value: string) => Promise.resolve(localStorage.setItem(key, value)),
      deleteItemAsync: (key: string) => Promise.resolve(localStorage.removeItem(key)),
    };
  }
  return {
    getItem: (key: string) => SecureStore.getItemAsync(key),
    setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
    deleteItemAsync: (key: string) => SecureStore.deleteItemAsync(key),
  };
}

async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const merged = { ...options, signal: controller.signal };
    const url = `${API_URL}${path}`;
    const res = await fetch(url, merged);
    return res;
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error('Request timed out. Check your internet connection.');
    }
    throw new Error('Unable to reach server. Please check your internet connection or try again.');
  } finally {
    clearTimeout(timeout);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    accessToken: null,
    isNewUser: false,
    needsPhone: false,
    isPremium: false,
  });

  const tokenRefreshInFlight = useRef<Promise<boolean> | null>(null);
  const lastRefreshTime = useRef(0);
  const sessionTimeoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const storage = useRef(getStorage());
  const isRefreshing = useRef(false);

  const clearSessionTimeout = useCallback(() => {
    if (sessionTimeoutTimer.current) {
      clearTimeout(sessionTimeoutTimer.current);
      sessionTimeoutTimer.current = null;
    }
  }, []);

  const resetSessionTimeout = useCallback(() => {
    clearSessionTimeout();
    if (stateRef.current.isAuthenticated) {
      sessionTimeoutTimer.current = setTimeout(() => {
        logout();
      }, SESSION_TIMEOUT_MS);
    }
  }, []);

  const clearAuth_ = useCallback(async () => {
    try {
      await storage.current.deleteItemAsync('accessToken');
      await storage.current.deleteItemAsync('refreshToken');
      await storage.current.deleteItemAsync('sessionId');
      await storage.current.deleteItemAsync('userData');
      await storage.current.deleteItemAsync('appPin');
      await storage.current.deleteItemAsync('appLockEnabled');
      await storage.current.deleteItemAsync('biometricEnabled');
      setAccessToken(null);
      await AsyncStorage.multiRemove([
        '@dabbu_preferences_cache',
        'favorite_contacts',
        'offline_state',
        '@dabbu_dismissed_banners',
      ]);
    } catch {
      // ignore clear errors
    }
    clearCache();
  }, []);

  const logout = useCallback(async () => {
    clearSessionTimeout();
    const tok = getAccessToken();
    const refresh = await storage.current.getItem('refreshToken').catch(() => null);
    if (tok && refresh) {
      authFetch('/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tok}`,
        },
        body: JSON.stringify({ refreshToken: refresh }),
      }).catch(() => {});
    }
    await clearAuth_();
    setState({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      accessToken: null,
      isNewUser: false,
      needsPhone: false,
      isPremium: false,
    });
  }, [clearAuth_, clearSessionTimeout]);

  const refreshToken = useCallback(async (): Promise<boolean> => {
    if (isRefreshing.current) {
      return false;
    }
    isRefreshing.current = true;
    try {
      if (tokenRefreshInFlight.current) {
        return tokenRefreshInFlight.current;
      }

      if (Date.now() - lastRefreshTime.current < MIN_REFRESH_INTERVAL) {
        const tok = getAccessToken();
        if (tok) {
          return true;
        }
      }

      const promise = doRefresh();
      tokenRefreshInFlight.current = promise;
      return promise;
    } finally {
      isRefreshing.current = false;
    }
  }, []);

  async function doRefresh(): Promise<boolean> {
    try {
      const refresh = await storage.current.getItem('refreshToken');
      if (!refresh) {
        return false;
      }

      const res = await authFetch('/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refresh }),
      });

      if (!res.ok) {
        return false;
      }

      const json = await res.json();
      const tokens = json.data;
      if (!tokens?.accessToken) {
        return false;
      }

      lastRefreshTime.current = Date.now();
      setAccessToken(tokens.accessToken);
      await storage.current.setItem('accessToken', tokens.accessToken);
      if (tokens.refreshToken) {
        await storage.current.setItem('refreshToken', tokens.refreshToken);
      }

      setState((prev) => ({ ...prev, accessToken: tokens.accessToken }));
      resetSessionTimeout();
      return true;
    } catch {
      return false;
    } finally {
      tokenRefreshInFlight.current = null;
    }
  }

  useEffect(() => {
    setRefreshTokenHandler(refreshToken);
    setOnSessionExpiredHandler(() => {
      clearAuth_().then(() => {
        setState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          accessToken: null,
          isNewUser: false,
          needsPhone: false,
          isPremium: false,
        });
      });
    });
    loadStoredAuth();
  }, [refreshToken, clearAuth_]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        resetSessionTimeout();
      }
    });
    return () => sub.remove();
  }, [resetSessionTimeout]);

  async function loadStoredAuth() {
    try {
      const token = await storage.current.getItem('accessToken');
      const userData = await storage.current.getItem('userData');

      if (token && userData) {
        const parsedUser = JSON.parse(userData);
        setAccessToken(token);
        setState({
          isAuthenticated: true,
          isLoading: false,
          user: parsedUser,
          accessToken: token,
          isNewUser: false,
          needsPhone: !parsedUser.phone,
          isPremium: false,
        });
        resetSessionTimeout();
        registerForPushNotifications(token).catch(() => {});
        refreshPremiumStatus();
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    } catch {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }

  function applyAuth(token: string, user: User, wasNewUser: boolean) {
    setAccessToken(token);
    const p = storage.current.setItem('accessToken', token);
    const p2 = storage.current.setItem('userData', JSON.stringify(user));
    Promise.all([p, p2]).catch(() => {});
    setState({
      isAuthenticated: true,
      isLoading: false,
      user,
      accessToken: token,
      isNewUser: wasNewUser,
      needsPhone: !user.phone,
      isPremium: false,
    });
    resetSessionTimeout();
    refreshPremiumStatus();
  }

  const completeAuth = useCallback((token: string, user: User, wasNewUser: boolean) => {
    applyAuth(token, user, wasNewUser);
  }, []);

  async function login(email: string, password: string) {
    const { deviceName, platform } = getDeviceInfo();
    const res = await authFetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, deviceName, platform }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.message?.[0] || err?.message || 'Login failed');
    }

    const json = await res.json().catch(() => {
      throw new Error('Invalid response from server');
    });
    const data = json?.data;
    if (!data) {
      throw new Error('Invalid response from server');
    }
    const { user, tokens } = data;

    applyAuth(tokens.accessToken, user, false);
    if (tokens.refreshToken) {
      await storage.current.setItem('refreshToken', tokens.refreshToken);
    }
    if (tokens.sessionId) {
      await storage.current.setItem('sessionId', tokens.sessionId);
    }

    trackEventImmediate('login', 'auth', 'email').catch(() => {});
    registerForPushNotifications(tokens.accessToken).catch(() => {});
  }

  async function register(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    referralCode?: string,
  ) {
    const body: Record<string, any> = { email, password, firstName, lastName };
    if (referralCode) {
      body.referralCode = referralCode;
    }
    const { deviceName, platform } = getDeviceInfo();
    body.deviceName = deviceName;
    body.platform = platform;
    const res = await authFetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.message?.[0] || err?.message || 'Registration failed');
    }

    const json = await res.json().catch(() => {
      throw new Error('Invalid response from server');
    });
    const data = json?.data;
    if (!data) {
      throw new Error('Invalid response from server');
    }
    const { user, tokens } = data;

    applyAuth(tokens.accessToken, user, false);
    if (tokens.refreshToken) {
      await storage.current.setItem('refreshToken', tokens.refreshToken);
    }
    if (tokens.sessionId) {
      await storage.current.setItem('sessionId', tokens.sessionId);
    }

    trackEventImmediate('sign_up', 'auth', 'email').catch(() => {});
    registerForPushNotifications(tokens.accessToken).catch(() => {});
  }

  async function googleLogin(idToken: string) {
    const { deviceName, platform } = getDeviceInfo();
    const res = await authFetch('/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, deviceName, platform }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.message?.[0] || err?.message || 'Google sign-in failed');
    }

    const json = await res.json().catch(() => {
      throw new Error('Invalid response from server');
    });
    const data = json?.data;
    if (!data) {
      throw new Error('Invalid response from server');
    }
    const { user, tokens, isNewUser } = data;

    applyAuth(tokens.accessToken, user, !!isNewUser);
    if (tokens.refreshToken) {
      await storage.current.setItem('refreshToken', tokens.refreshToken);
    }
    if (tokens.sessionId) {
      await storage.current.setItem('sessionId', tokens.sessionId);
    }

    trackEventImmediate(isNewUser ? 'sign_up' : 'login', 'auth', 'google').catch(() => {});
    registerForPushNotifications(tokens.accessToken).catch(() => {});
  }

  async function guestLogin() {
    const { deviceName, platform } = getDeviceInfo();
    const res = await authFetch('/auth/guest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceName, platform }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.message?.[0] || err?.message || 'Guest login failed');
    }

    const json = await res.json().catch(() => {
      throw new Error('Invalid response from server');
    });
    const data = json?.data;
    if (!data) {
      throw new Error('Invalid response from server');
    }
    const { user, tokens } = data;

    applyAuth(tokens.accessToken, user, false);
    if (tokens.refreshToken) {
      await storage.current.setItem('refreshToken', tokens.refreshToken);
    }
    if (tokens.sessionId) {
      await storage.current.setItem('sessionId', tokens.sessionId);
    }

    registerForPushNotifications(tokens.accessToken).catch(() => {});
  }

  async function demoLogin() {
    const { deviceName, platform } = getDeviceInfo();
    const res = await authFetch('/auth/demo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceName, platform }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.message?.[0] || err?.message || 'Demo login failed');
    }

    const json = await res.json().catch(() => {
      throw new Error('Invalid response from server');
    });
    const data = json?.data;
    if (!data) {
      throw new Error('Invalid response from server');
    }
    const { user, tokens } = data;

    applyAuth(tokens.accessToken, user, false);
    if (tokens.refreshToken) {
      await storage.current.setItem('refreshToken', tokens.refreshToken);
    }
    if (tokens.sessionId) {
      await storage.current.setItem('sessionId', tokens.sessionId);
    }

    registerForPushNotifications(tokens.accessToken).catch(() => {});
  }

  function completeProfileSetup(updatedUser?: Partial<User>) {
    setState((prev) => {
      if (!prev.user) {
        return prev;
      }
      const merged = updatedUser ? { ...prev.user, ...updatedUser } : prev.user;
      storage.current.setItem('userData', JSON.stringify(merged)).catch(() => {});
      return {
        ...prev,
        isNewUser: false,
        user: merged,
        needsPhone: merged ? !merged.phone : false,
      };
    });
  }

  async function updatePhone(phone: string) {
    const token = getAccessToken();
    const res = await authFetch('/users/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ phone }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.message?.[0] || err?.message || 'Failed to save phone');
    }

    const json = await res.json();
    const updatedUser = json?.data?.user || json?.data;
    setState((prev) => {
      if (!prev.user) {
        return prev;
      }
      const merged = updatedUser ? { ...prev.user, ...updatedUser } : { ...prev.user, phone };
      storage.current.setItem('userData', JSON.stringify(merged)).catch(() => {});
      return { ...prev, user: merged, needsPhone: !merged.phone };
    });
  }

  const updateAvatarUrl = useCallback((avatarUrl: string) => {
    setState((prev) => {
      if (!prev.user) {
        return prev;
      }
      const updated = { ...prev.user, avatarUrl };
      storage.current.setItem('userData', JSON.stringify(updated)).catch(() => {});
      return { ...prev, user: updated };
    });
  }, []);

  const refreshPremiumStatus = useCallback(async () => {
    try {
      const token = getAccessToken();
      if (!token) {
        setState((prev) => ({ ...prev, isPremium: false }));
        return;
      }
      const res = await api.get<any>('/premium/check');
      setState((prev) => ({ ...prev, isPremium: !!res?.isPremium }));
    } catch {
      setState((prev) => ({ ...prev, isPremium: false }));
    }
  }, []);

  const value = React.useMemo(
    () => ({
      ...state,
      login,
      register,
      googleLogin,
      guestLogin,
      demoLogin,
      logout,
      refreshToken,
      completeProfileSetup,
      updatePhone,
      updateAvatarUrl,
      completeAuth,
      refreshPremiumStatus,
    }),
    [state, refreshToken, completeAuth, updateAvatarUrl, refreshPremiumStatus],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

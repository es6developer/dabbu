import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import { API_URL } from '../config/api';

let SecureStore: any = {};
if (Platform.OS !== 'web') {
  SecureStore = require('expo-secure-store');
}

import {
  setAccessToken,
  setRefreshTokenHandler,
  setOnSessionExpiredHandler,
} from '../services/api';
import { registerForPushNotifications } from '../services/notifications';
import { trackEventImmediate } from '../hooks/useAnalytics';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  role: string;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  accessToken: string | null;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    accessToken: null,
  });

  useEffect(() => {
    setRefreshTokenHandler(refreshToken);
    setOnSessionExpiredHandler(() => {
      clearAuth().then(() => {
        setState({ isAuthenticated: false, isLoading: false, user: null, accessToken: null });
      });
    });
    loadStoredAuth();
  }, []);

  async function loadStoredAuth() {
    try {
      const storage = getStorage();
      const timeout = (ms: number) => new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));
      const token = await Promise.race([storage.getItem('accessToken'), timeout(5000)]) as string | null;
      const userData = await Promise.race([storage.getItem('userData'), timeout(5000)]) as string | null;

      if (token && userData) {
        const parsedUser = JSON.parse(userData);
        setAccessToken(token);
        setState({
          isAuthenticated: true,
          isLoading: false,
          user: parsedUser,
          accessToken: token,
        });

        registerForPushNotifications(token).catch(() => {});
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    } catch (_e) {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }

  async function storeAuth(token: string, user: User) {
    const storage = getStorage();
    await storage.setItem('accessToken', token);
    await storage.setItem('userData', JSON.stringify(user));
  }

  async function clearAuth() {
    try {
      const storage = getStorage();
      await storage.deleteItemAsync('accessToken');
      await storage.deleteItemAsync('refreshToken');
      await storage.deleteItemAsync('userData');
      setAccessToken(null);
    } catch (_e) {
      // ignore clear errors
    }
  }

  async function login(email: string, password: string) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let res: Response;
    try {
      res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        signal: controller.signal,
      });
    } catch (_e) {
      clearTimeout(timeout);
      throw new Error('Connection timed out. Please check your internet connection and try again.');
    }
    clearTimeout(timeout);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.message?.[0] || err?.message || 'Login failed');
    }

    const json = await res.json().catch(() => {
      throw new Error('Invalid response from server');
    });
    const data = json?.data;
    if (!data) {throw new Error('Invalid response from server');}
    const { user, tokens } = data;

    setAccessToken(tokens.accessToken);
    await storeAuth(tokens.accessToken, user);
    const storage = getStorage();
    await storage.setItem('refreshToken', tokens.refreshToken);

    setState({
      isAuthenticated: true,
      isLoading: false,
      user,
      accessToken: tokens.accessToken,
    });

    trackEventImmediate('login', 'auth', 'email').catch(() => {});
    registerForPushNotifications(tokens.accessToken).catch(() => {});
  }

  async function register(email: string, password: string, firstName: string, lastName: string) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let res: Response;
    try {
      res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, firstName, lastName }),
        signal: controller.signal,
      });
    } catch (_e) {
      clearTimeout(timeout);
      throw new Error('Connection timed out. Please check your internet connection and try again.');
    }
    clearTimeout(timeout);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.message?.[0] || err?.message || 'Registration failed');
    }

    const json = await res.json().catch(() => {
      throw new Error('Invalid response from server');
    });
    const data = json?.data;
    if (!data) {throw new Error('Invalid response from server');}
    const { user, tokens } = data;

    setAccessToken(tokens.accessToken);
    await storeAuth(tokens.accessToken, user);

    setState({
      isAuthenticated: true,
      isLoading: false,
      user,
      accessToken: tokens.accessToken,
    });

    trackEventImmediate('sign_up', 'auth', 'email').catch(() => {});
    registerForPushNotifications(tokens.accessToken).catch(() => {});
  }

  async function logout() {
    try {
      const storage = getStorage();
      const refresh = await storage.getItem('refreshToken');
      if (state.accessToken && refresh) {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${state.accessToken}`,
          },
          body: JSON.stringify({ refreshToken: refresh }),
        });
      }
    } catch (_e) {
      // ignore logout API errors
    }

    await clearAuth();
    try {
      await SecureStore.deleteItemAsync('appPin');
      await SecureStore.deleteItemAsync('appLockEnabled');
      await SecureStore.deleteItemAsync('biometricEnabled');
    } catch (_e) {
      /* ignore */
    }
    setState({ isAuthenticated: false, isLoading: false, user: null, accessToken: null });
  }

  async function refreshToken(): Promise<boolean> {
    try {
      const storage = getStorage();
      const refresh = await storage.getItem('refreshToken');
      if (!refresh) {
        return false;
      }

      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refresh }),
      });

      if (!res.ok) {
        return false;
      }

      const json = await res.json();
      const tokens = json.data;

      await storage.setItem('accessToken', tokens.accessToken);
      await storage.setItem('refreshToken', tokens.refreshToken);

      setState((prev) => ({ ...prev, accessToken: tokens.accessToken }));
      return true;
    } catch (_e) {
      return false;
    }
  }

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, refreshToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

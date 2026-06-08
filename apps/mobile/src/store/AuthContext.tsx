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
  clearCache,
  getAccessToken,
} from '../services/api';
import { registerForPushNotifications } from '../services/notifications';
import { trackEventImmediate } from '../hooks/useAnalytics';

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
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  accessToken: string | null;
  isNewUser: boolean;
  needsPhone: boolean;
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
    isNewUser: false,
    needsPhone: false,
  });

  useEffect(() => {
    setRefreshTokenHandler(refreshToken);
    setOnSessionExpiredHandler(() => {
      clearAuth().then(() => {
        setState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          accessToken: null,
          isNewUser: false,
          needsPhone: false,
        });
      });
    });
    loadStoredAuth();
  }, []);

  async function loadStoredAuth() {
    try {
      const storage = getStorage();
      const timeout = (ms: number) =>
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));
      const token = (await Promise.race([storage.getItem('accessToken'), timeout(5000)])) as
        | string
        | null;
      const userData = (await Promise.race([storage.getItem('userData'), timeout(5000)])) as
        | string
        | null;

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

  function applyAuth(token: string, user: User, wasNewUser: boolean) {
    setAccessToken(token);
    storeAuth(token, user);
    setState({
      isAuthenticated: true,
      isLoading: false,
      user,
      accessToken: token,
      isNewUser: wasNewUser,
      needsPhone: !user.phone,
    });
  }

  async function login(email: string, password: string) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let res: Response;
    try {
      const { deviceName, platform } = getDeviceInfo();
      res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, deviceName, platform }),
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
    if (!data) {
      throw new Error('Invalid response from server');
    }
    const { user, tokens } = data;

    applyAuth(tokens.accessToken, user, false);
    const storage = getStorage();
    await storage.setItem('refreshToken', tokens.refreshToken);
    if (tokens.sessionId) {
      await storage.setItem('sessionId', tokens.sessionId);
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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let res: Response;
    try {
      const body: Record<string, any> = { email, password, firstName, lastName };
      if (referralCode) {
        body.referralCode = referralCode;
      }
      const { deviceName, platform } = getDeviceInfo();
      body.deviceName = deviceName;
      body.platform = platform;
      res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
    if (!data) {
      throw new Error('Invalid response from server');
    }
    const { user, tokens } = data;

    applyAuth(tokens.accessToken, user, false);
    const storage = getStorage();
    if (tokens.sessionId) {
      await storage.setItem('sessionId', tokens.sessionId);
    }

    trackEventImmediate('sign_up', 'auth', 'email').catch(() => {});
    registerForPushNotifications(tokens.accessToken).catch(() => {});
  }

  async function googleLogin(idToken: string) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let res: Response;
    try {
      const { deviceName, platform } = getDeviceInfo();
      res = await fetch(`${API_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, deviceName, platform }),
        signal: controller.signal,
      });
    } catch (_e) {
      clearTimeout(timeout);
      throw new Error('Connection timed out. Please check your internet connection and try again.');
    }
    clearTimeout(timeout);

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
    const storage = getStorage();
    await storage.setItem('refreshToken', tokens.refreshToken);
    if (tokens.sessionId) {
      await storage.setItem('sessionId', tokens.sessionId);
    }

    trackEventImmediate(isNewUser ? 'sign_up' : 'login', 'auth', 'google').catch(() => {});
    registerForPushNotifications(tokens.accessToken).catch(() => {});
  }

  async function guestLogin() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let res: Response;
    try {
      const { deviceName, platform } = getDeviceInfo();
      res = await fetch(`${API_URL}/auth/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceName, platform }),
        signal: controller.signal,
      });
    } catch (_e) {
      clearTimeout(timeout);
      throw new Error('Connection timed out. Please check your internet connection and try again.');
    }
    clearTimeout(timeout);

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

    setAccessToken(tokens.accessToken);
    await storeAuth(tokens.accessToken, user);
    const storage = getStorage();
    await storage.setItem('refreshToken', tokens.refreshToken);
    if (tokens.sessionId) {
      await storage.setItem('sessionId', tokens.sessionId);
    }

    setState({
      isAuthenticated: true,
      isLoading: false,
      user,
      accessToken: tokens.accessToken,
      isNewUser: false,
      needsPhone: false,
    });

    registerForPushNotifications(tokens.accessToken).catch(() => {});
  }

  async function demoLogin() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let res: Response;
    try {
      const { deviceName, platform } = getDeviceInfo();
      res = await fetch(`${API_URL}/auth/demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceName, platform }),
        signal: controller.signal,
      });
    } catch (_e) {
      clearTimeout(timeout);
      throw new Error('Connection timed out. Please check your internet connection and try again.');
    }
    clearTimeout(timeout);

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

    setAccessToken(tokens.accessToken);
    await storeAuth(tokens.accessToken, user);
    const storage = getStorage();
    await storage.setItem('refreshToken', tokens.refreshToken);
    if (tokens.sessionId) {
      await storage.setItem('sessionId', tokens.sessionId);
    }

    setState({
      isAuthenticated: true,
      isLoading: false,
      user,
      accessToken: tokens.accessToken,
      isNewUser: false,
      needsPhone: false,
    });

    registerForPushNotifications(tokens.accessToken).catch(() => {});
  }

  async function logout() {
    const storage = getStorage();
    storage
      .getItem('refreshToken')
      .then((refresh) => {
        if (state.accessToken && refresh) {
          fetch(`${API_URL}/auth/logout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${state.accessToken}`,
            },
            body: JSON.stringify({ refreshToken: refresh }),
          }).catch(() => {});
        }
      })
      .catch(() => {});

    await clearAuth();
    clearCache();
    try {
      await SecureStore.deleteItemAsync('appPin');
      await SecureStore.deleteItemAsync('appLockEnabled');
      await SecureStore.deleteItemAsync('biometricEnabled');
      await SecureStore.deleteItemAsync('sessionId');
    } catch (_e) {
      /* ignore */
    }
    setState({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      accessToken: null,
      isNewUser: false,
      needsPhone: false,
    });
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

  function completeProfileSetup(updatedUser?: Partial<User>) {
    setState((prev) => {
      const merged = updatedUser ? { ...prev.user!, ...updatedUser } : prev.user;
      if (merged) {
        storeAuth(prev.accessToken!, merged);
      }
      return { ...prev, isNewUser: false, user: merged, needsPhone: merged ? !merged.phone : false };
    });
  }

  async function updatePhone(phone: string) {
    const token = getAccessToken();
    const res = await fetch(`${API_URL}/users/profile`, {
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
    if (updatedUser) {
      const mergedUser = { ...state.user!, phone: updatedUser.phone || phone };
      storeAuth(state.accessToken!, mergedUser);
      setState((prev) => ({ ...prev, user: mergedUser, needsPhone: false }));
    } else {
      const mergedUser = { ...state.user!, phone };
      storeAuth(state.accessToken!, mergedUser);
      setState((prev) => ({ ...prev, user: mergedUser, needsPhone: false }));
    }
  }

  return (
    <AuthContext.Provider
      value={{
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
      }}
    >
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

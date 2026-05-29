'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from './api';

interface User {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (token: string, userData: Record<string, unknown>) => void;
  logout: () => void;
  refresh: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    const session = api.getTempSession();
    const token = api.getTempToken();
    if (session && token) {
      setUser({
        id: String(session.id ?? ''),
        name: String(session.name ?? ''),
        email: session.email as string | undefined,
        avatar: session.avatar as string | undefined,
      });
    } else {
      setUser(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback((token: string, userData: Record<string, unknown>) => {
    api.setTempToken(token);
    api.setTempSession(userData);
    setUser({
      id: String(userData.id ?? ''),
      name: String(userData.name ?? ''),
      email: userData.email as string | undefined,
      avatar: userData.avatar as string | undefined,
    });
  }, []);

  const logout = useCallback(() => {
    api.clearTempToken();
    api.clearTempSession();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

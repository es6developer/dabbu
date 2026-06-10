'use client';

import React, { createContext, useContext, useReducer, useCallback, useRef } from 'react';

export type ScreenType =
  | 'dashboard'
  | 'split'
  | 'payment'
  | 'circle'
  | 'ai-analysis'
  | 'ocr-scan'
  | 'report'
  | 'default';

export interface LoadingOptions {
  interactive?: boolean;
  steps?: string[];
  duration?: number;
  category?: string;
  miniGame?: boolean;
  onTap?: () => void;
  onLongPress?: () => void;
}

export interface LoadingSession {
  id: string;
  screenType: ScreenType;
  progress: number;
  currentStep: string;
  steps: string[];
  options: LoadingOptions;
  startTime: number;
  isActive: boolean;
  error?: string;
}

interface LoadingState {
  activeSessions: LoadingSession[];
  queue: { screenType: ScreenType; options: LoadingOptions }[];
}

type LoadingAction =
  | {
      type: 'START';
      id: string;
      screenType: ScreenType;
      options: LoadingOptions;
      startTime: number;
    }
  | { type: 'UPDATE_PROGRESS'; id: string; progress: number; step?: string }
  | { type: 'COMPLETE'; id: string }
  | { type: 'FAIL'; id: string; error: string }
  | { type: 'ENQUEUE'; screenType: ScreenType; options: LoadingOptions }
  | { type: 'DEQUEUE' }
  | { type: 'CLEAR_ALL' };

function loadingReducer(state: LoadingState, action: LoadingAction): LoadingState {
  switch (action.type) {
    case 'START': {
      const session: LoadingSession = {
        id: action.id,
        screenType: action.screenType,
        progress: 0,
        currentStep: action.options.steps?.[0] || 'Loading...',
        steps: action.options.steps || ['Loading...'],
        options: action.options,
        startTime: action.startTime,
        isActive: true,
      };
      return { ...state, activeSessions: [...state.activeSessions, session] };
    }
    case 'UPDATE_PROGRESS': {
      return {
        ...state,
        activeSessions: state.activeSessions.map((s) =>
          s.id === action.id
            ? {
                ...s,
                progress: action.progress,
                currentStep: action.step || s.currentStep,
              }
            : s,
        ),
      };
    }
    case 'COMPLETE': {
      return {
        ...state,
        activeSessions: state.activeSessions.map((s) =>
          s.id === action.id ? { ...s, progress: 100, isActive: false } : s,
        ),
      };
    }
    case 'FAIL': {
      return {
        ...state,
        activeSessions: state.activeSessions.map((s) =>
          s.id === action.id ? { ...s, error: action.error, isActive: false } : s,
        ),
      };
    }
    case 'ENQUEUE': {
      return {
        ...state,
        queue: [...state.queue, { screenType: action.screenType, options: action.options }],
      };
    }
    case 'DEQUEUE': {
      const [, ...rest] = state.queue;
      return { ...state, queue: rest };
    }
    case 'CLEAR_ALL': {
      return { activeSessions: [], queue: [] };
    }
    default:
      return state;
  }
}

interface LoadingContextType {
  sessions: LoadingSession[];
  queue: { screenType: ScreenType; options: LoadingOptions }[];
  startLoading: (screenType: ScreenType, options?: LoadingOptions) => string;
  updateProgress: (id: string, progress: number, step?: string) => void;
  completeLoading: (id: string) => void;
  failLoading: (id: string, error: string) => void;
  clearAll: () => void;
  primarySession: LoadingSession | null;
}

const LoadingContext = createContext<LoadingContextType | null>(null);

let sessionCounter = 0;

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(loadingReducer, { activeSessions: [], queue: [] });
  const timersRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  const startLoading = useCallback(
    (screenType: ScreenType, options: LoadingOptions = {}): string => {
      const id = `loader-${++sessionCounter}-${Date.now()}`;
      const startTime = Date.now();

      if (state.activeSessions.length >= 3) {
        dispatch({ type: 'ENQUEUE', screenType, options });
        return id;
      }

      dispatch({ type: 'START', id, screenType, options, startTime });

      const interval = setInterval(() => {
        dispatch({
          type: 'UPDATE_PROGRESS',
          id,
          progress: Math.min(95, (Date.now() - startTime) / ((options.duration || 2000) / 100)),
          step:
            options.steps?.[
              Math.floor(
                ((Date.now() - startTime) / (options.duration || 2000)) *
                  (options.steps?.length || 1),
              )
            ] || undefined,
        });
      }, 100);

      timersRef.current.set(id, interval);
      return id;
    },
    [state.activeSessions.length],
  );

  const updateProgress = useCallback((id: string, progress: number, step?: string) => {
    dispatch({ type: 'UPDATE_PROGRESS', id, progress, step });
  }, []);

  const completeLoading = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearInterval(timer);
      timersRef.current.delete(id);
    }
    dispatch({ type: 'COMPLETE', id });

    setTimeout(() => {
      dispatch({ type: 'DEQUEUE' });
    }, 300);
  }, []);

  const failLoading = useCallback((id: string, error: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearInterval(timer);
      timersRef.current.delete(id);
    }
    dispatch({ type: 'FAIL', id, error });
  }, []);

  const clearAll = useCallback(() => {
    timersRef.current.forEach((timer) => clearInterval(timer));
    timersRef.current.clear();
    dispatch({ type: 'CLEAR_ALL' });
  }, []);

  const primarySession =
    state.activeSessions.find((s) => s.isActive) || state.activeSessions[0] || null;

  return (
    <LoadingContext.Provider
      value={{
        sessions: state.activeSessions,
        queue: state.queue,
        startLoading,
        updateProgress,
        completeLoading,
        failLoading,
        clearAll,
        primarySession,
      }}
    >
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoadingContext() {
  const ctx = useContext(LoadingContext);
  if (!ctx) {
    throw new Error('useLoadingContext must be used within LoadingProvider');
  }
  return ctx;
}

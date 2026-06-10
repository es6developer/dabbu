'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { ScreenType } from '@/components/loaders';

interface UseLoaderOptions {
  screenType?: ScreenType;
  minDuration?: number;
  steps?: string[];
  premium?: boolean;
  onComplete?: () => void;
}

interface UseLoaderReturn {
  progress: number;
  isLoading: boolean;
  error: string | undefined;
  start: () => void;
  complete: () => void;
  fail: (error: string) => void;
  reset: () => void;
}

export function useLoader(options: UseLoaderOptions = {}): UseLoaderReturn {
  const {
    screenType = 'default',
    minDuration = 1200,
    steps,
    premium = false,
    onComplete,
  } = options;

  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | undefined>(undefined);
  const [isActive, setIsActive] = useState(false);
  const startRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const doneRef = useRef(false);
  const resolvedRef = useRef(false);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  const start = useCallback(() => {
    cleanup();
    setProgress(0);
    setError(undefined);
    setIsActive(true);
    doneRef.current = false;
    resolvedRef.current = false;
    startRef.current = Date.now();

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const raw = Math.min((elapsed / minDuration) * 100, 99);
      setProgress(raw);
    }, 50);
  }, [minDuration, cleanup]);

  const complete = useCallback(() => {
    if (resolvedRef.current) {
      return;
    }
    resolvedRef.current = true;
    cleanup();
    setProgress(100);
    setTimeout(() => {
      setIsActive(false);
      onComplete?.();
    }, 300);
  }, [cleanup, onComplete]);

  const fail = useCallback(
    (err: string) => {
      if (resolvedRef.current) {
        return;
      }
      resolvedRef.current = true;
      cleanup();
      setError(err);
      setProgress(0);
      setIsActive(false);
    },
    [cleanup],
  );

  const reset = useCallback(() => {
    cleanup();
    setProgress(0);
    setError(undefined);
    setIsActive(false);
    doneRef.current = false;
    resolvedRef.current = false;
  }, [cleanup]);

  useEffect(() => cleanup, [cleanup]);

  return {
    progress,
    isLoading: isActive && !error,
    error,
    start,
    complete,
    fail,
    reset,
  };
}

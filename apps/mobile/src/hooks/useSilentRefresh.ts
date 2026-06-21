import { useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';

export function useSilentRefresh(
  callback: (isInitial: boolean) => void | Promise<void>,
  deps: any[] = [],
) {
  const hasLoadedRef = useRef(false);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useFocusEffect(
    useCallback(() => {
      const isInitial = !hasLoadedRef.current;
      hasLoadedRef.current = true;
      callbackRef.current(isInitial);
    }, deps),
  );
}

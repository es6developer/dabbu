import { useEffect, useRef } from 'react';
import { useLensStore } from '../store/lensStore';

export function useLensChange(callback: () => void) {
  const activeLens = useLensStore((s) => s.activeLens);
  const prevRef = useRef(activeLens);

  useEffect(() => {
    if (prevRef.current !== activeLens) {
      prevRef.current = activeLens;
      callback();
    }
  }, [activeLens, callback]);
}

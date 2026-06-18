import { useState, useRef, useCallback, ReactNode } from 'react';
import { View, LayoutChangeEvent } from 'react-native';

interface LazyLoadProps {
  children: ReactNode;
  placeholder?: ReactNode;
  threshold?: number;
}

export function LazyLoad({ children, placeholder, threshold = 300 }: LazyLoadProps) {
  const [visible, setVisible] = useState(false);
  const yRef = useRef(0);

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      if (visible) return;
      const { y } = e.nativeEvent.layout;
      yRef.current = y;
      if (y < threshold) {
        setVisible(true);
      }
    },
    [visible, threshold],
  );

  return (
    <View onLayout={onLayout}>
      {visible ? children : placeholder ?? null}
    </View>
  );
}

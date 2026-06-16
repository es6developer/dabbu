import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { Animated, Text, StyleSheet, View } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ToastType = 'success' | 'error' | 'info';

interface ToastState {
  message: string;
  type: ToastType;
  id: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const idRef = useRef(0);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    idRef.current += 1;
    const id = idRef.current;
    setToast({ message, type, id });
    setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && <ToastDisplay message={toast.message} type={toast.type} key={toast.id} />}
    </ToastContext.Provider>
  );
}

function ToastDisplay({ message, type }: { message: string; type: ToastType }) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    translateY.setValue(-100);
    Animated.timing(translateY, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const bgMap = {
    error: '#1F1415',
    success: '#141F17',
    info: '#1F1610',
  };
  const borderMap = {
    error: 'rgba(255, 69, 69, 0.2)',
    success: 'rgba(52, 199, 89, 0.2)',
    info: 'rgba(20, 184, 166, 0.2)',
  };
  const colorMap = {
    error: '#FF4545',
    success: '#34C759',
    info: '#14B8A6',
  };
  const iconMap: Record<string, string> = {
    error: 'closecircle',
    success: 'checkcircle',
    info: 'infocirlceo',
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: bgMap[type],
          borderColor: borderMap[type],
          top: insets.top + 8,
          transform: [{ translateY }],
        },
      ]}
    >
      <AntDesign name={iconMap[type] as any} size={18} color={colorMap[type]} style={styles.icon} />
      <Text style={[styles.text, { color: colorMap[type] }]}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    zIndex: 9999,
    elevation: 10,
  },
  icon: {
    marginRight: 10,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
});

export function useToast() {
  return useContext(ToastContext);
}

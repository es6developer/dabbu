import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ScreenContainerProps {
  children: React.ReactNode;
  className?: string;
  safeTop?: boolean;
  safeBottom?: boolean;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  className = '',
  safeTop = true,
  safeBottom = false,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      className={`flex-1 bg-[#F4F3FA] px-5 ${className}`}
      style={{
        paddingTop: safeTop ? insets.top : 0,
        paddingBottom: safeBottom ? insets.bottom : 0,
      }}
    >
      {children}
    </View>
  );
};

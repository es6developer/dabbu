import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme';
import { useLens } from '../../hooks/useLens';
import { lensMiddleware } from '../../navigation/lensMiddleware';
import type { LensMode } from '../../types';

interface LensGuardProps {
  screenName: string;
  requiredLens?: LensMode;
  fallback?: React.ReactNode;
  children: React.ReactNode;
  onUpgrade?: () => void;
}

export function LensGuard({ screenName, requiredLens, fallback, children, onUpgrade }: LensGuardProps) {
  const { colors } = useTheme();
  const lens = useLens();

  const isBlocked = !lensMiddleware.canNavigateToScreen(screenName, lens.activeLens);
  const featureCheck = requiredLens ? lens.activeLens === requiredLens || lens.canAccess(requiredLens) : true;
  const isRestricted = isBlocked || !featureCheck;

  if (!isRestricted) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  const targetLens = requiredLens || 'FULL';

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: colors.bg.primary }}>
      <Text style={{ color: colors.text.primary, fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 8 }}>
        This Feature Requires a Different Lens
      </Text>
      <Text style={{ color: colors.text.secondary, fontSize: 14, textAlign: 'center', marginBottom: 24 }}>
        Switch to the appropriate lens to access this screen.
      </Text>
      <TouchableOpacity
        style={{
          backgroundColor: colors.accent.primary,
          paddingHorizontal: 24,
          paddingVertical: 12,
          borderRadius: 12,
        }}
        onPress={() => {
          if (onUpgrade) {
            onUpgrade();
          } else if (lens.canAccess(targetLens as LensMode)) {
            lens.switchLens(null, targetLens as LensMode);
          }
        }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>
          {lens.canAccess(targetLens as LensMode) ? `Switch to ${targetLens} Lens` : 'Upgrade to Access'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

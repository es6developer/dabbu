import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { AntDesign } from '@expo/vector-icons';

interface SuccessFeedbackOverlayProps {
  visible: boolean;
  title?: string;
  subtitle?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
  onDismiss?: () => void;
  className?: string;
}

const shadowStyle = Platform.select({
  ios: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
  },
  android: { elevation: 12 },
  default: {},
});

export const SuccessFeedbackOverlay: React.FC<SuccessFeedbackOverlayProps> = ({
  visible,
  title = 'Subscription Active via Razorpay!',
  subtitle = 'Your premium plan is now active. Enjoy all the features.',
  primaryLabel = 'Go to Dashboard',
  secondaryLabel = 'View Plans',
  onPrimary,
  onSecondary,
  onDismiss,
  className = '',
}) => {
  if (!visible) return null;

  return (
    <View className="absolute inset-0 z-50 items-center justify-center bg-black/70 px-5">
      <View
        className="items-center px-8 py-10 rounded-xl bg-dark-surface"
        style={shadowStyle}
      >
        <View className="w-20 h-20 rounded-full bg-dark-success-light items-center justify-center mb-5">
          <AntDesign name="checkcircle" size={48} color="#00E676"  />
        </View>

        <Text className="text-white text-title text-center font-bold mb-2">{title}</Text>

        {subtitle && (
          <Text className="text-dark-ink-muted text-body text-center mb-8">{subtitle}</Text>
        )}

        <View className="w-full gap-3">
          <TouchableOpacity
            onPress={onPrimary}
            activeOpacity={0.8}
            className="w-full py-3.5 rounded-xl bg-brand-500 items-center"
          >
            <Text className="text-white text-body-bold">{primaryLabel}</Text>
          </TouchableOpacity>

          {secondaryLabel && (
            <TouchableOpacity
              onPress={onSecondary ?? onDismiss}
              activeOpacity={0.7}
              className="w-full py-3.5 rounded-xl border border-dark-border-default items-center"
            >
              <Text className="text-dark-ink-muted text-body-bold">{secondaryLabel}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

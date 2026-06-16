import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface PromoAction {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline';
}

interface PromoHeaderBannerProps {
  title: string;
  subtitle: string;
  actions: PromoAction[];
  gradientColors?: [string, string, ...string[]];
  className?: string;
}

export const PromoHeaderBanner: React.FC<PromoHeaderBannerProps> = ({
  title,
  subtitle,
  actions,
  gradientColors = ['#1F1A3A', '#2E1A47'],
  className = '',
}) => {
  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className={`rounded-xl px-6 py-6 ${className}`}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-4">
          <Text className="text-white text-heading mb-1.5">{title}</Text>
          <Text className="text-dark-ink-muted text-body mb-5">{subtitle}</Text>
          <View className="flex-row flex-wrap gap-3">
            {actions.map((action, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={action.onPress}
                activeOpacity={0.8}
                className={
                  action.variant === 'outline'
                    ? 'px-5 py-2.5 rounded-pill border-2 border-white/30'
                    : 'px-5 py-2.5 rounded-pill bg-white'
                }
              >
                <Text
                  className={
                    action.variant === 'outline'
                      ? 'text-white font-semibold text-body-bold'
                      : 'text-ink font-semibold text-body-bold'
                  }
                >
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View className="items-end">
          <View className="w-16 h-16 rounded-xl bg-white/10 mb-2" />
          <View className="w-12 h-12 rounded-lg bg-white/8" />
        </View>
      </View>
    </LinearGradient>
  );
};

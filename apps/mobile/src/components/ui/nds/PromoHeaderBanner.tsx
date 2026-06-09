import React from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const PromoHeaderBanner: React.FC<PromoHeaderBannerProps> = ({
  title,
  subtitle,
  actions,
  gradientColors = ['#0F766E', '#14B8A6', '#0D9488'],
  className = '',
}) => {
  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className={`rounded-3xl px-6 py-7 ${className}`}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-4">
          <Text className="text-white text-2xl font-bold leading-8 mb-2">{title}</Text>
          <Text className="text-teal-100 text-sm leading-5 mb-5">{subtitle}</Text>
          <View className="flex-row flex-wrap gap-3">
            {actions.map((action, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={action.onPress}
                activeOpacity={0.8}
                className={
                  action.variant === 'outline'
                    ? 'px-5 py-2.5 rounded-full border-2 border-white/40'
                    : 'px-5 py-2.5 rounded-full bg-white'
                }
              >
                <Text
                  className={
                    action.variant === 'outline'
                      ? 'text-white font-semibold text-sm'
                      : 'text-ink font-semibold text-sm'
                  }
                >
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View className="items-end">
          <View className="w-16 h-16 rounded-2xl bg-white/15 mb-2" />
          <View className="w-12 h-12 rounded-xl bg-white/10" />
        </View>
      </View>
    </LinearGradient>
  );
};

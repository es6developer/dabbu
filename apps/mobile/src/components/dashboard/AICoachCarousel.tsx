import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../theme';

interface AICoachCarouselProps {
  insights: string[];
  onTap?: () => void;
}

export function AICoachCarousel({ insights, onTap }: AICoachCarouselProps) {
  const { colors } = useTheme();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (insights.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % insights.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [insights.length]);

  if (insights.length === 0) return null;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onTap}
      style={{
        backgroundColor: colors.bg.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border.default,
        padding: 14,
        borderLeftWidth: 3,
        borderLeftColor: colors.brand.primary,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <View style={{
          width: 32, height: 32, borderRadius: 10,
          backgroundColor: colors.brand.primary + '15',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <AntDesign name="message1" size={16} color={colors.brand.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.primary }} numberOfLines={2}>
            {insights[index % insights.length]}
          </Text>
          <View style={{ flexDirection: 'row', gap: 4, marginTop: 8 }}>
            {insights.map((_: string, idx: number) => (
              <View
                key={idx}
                style={{
                  width: 6, height: 6, borderRadius: 3,
                  backgroundColor: idx === (index % insights.length) ? colors.brand.primary : colors.border.default,
                }}
              />
            ))}
          </View>
        </View>
        <AntDesign name="star" size={16} color={colors.brand.primary} />
      </View>
    </TouchableOpacity>
  );
}

import React from 'react';
import { FlatList, View, Text, TouchableOpacity, Dimensions, Platform } from 'react-native';

export interface RazorpayPlan {
  id: string;
  label: string;
  price: string;
  period: string;
  savings?: string;
}

interface PremiumRazorpayPlansProps {
  plans: RazorpayPlan[];
  selectedId?: string;
  onSelect: (plan: RazorpayPlan) => void;
  className?: string;
}

const CARD_WIDTH = (Dimensions.get('window').width - 52) / 2;
const CARD_GAP = 12;

const glowBorderStyle = (isSelected: boolean) =>
  isSelected
    ? Platform.select({
        ios: {
          shadowColor: '#8B5CF6',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: 12,
        },
        android: { elevation: 8 },
        default: {},
      })
    : undefined;

export const PremiumRazorpayPlans: React.FC<PremiumRazorpayPlansProps> = ({
  plans,
  selectedId,
  onSelect,
  className = '',
}) => {
  const renderPlan = ({ item }: { item: RazorpayPlan }) => {
    const isSelected = item.id === selectedId;

    return (
      <TouchableOpacity
        onPress={() => onSelect(item)}
        activeOpacity={0.8}
        className={`rounded-xl p-4 border-2 ${
          isSelected
            ? 'border-brand-500 bg-dark-surface-raised'
            : 'border-dark-border-default bg-dark-surface'
        }`}
        style={{
          width: CARD_WIDTH,
          marginBottom: CARD_GAP,
          ...(isSelected ? { borderColor: '#8B5CF6' } : {}),
          ...glowBorderStyle(isSelected),
        }}
      >
        {item.savings && (
          <View className="self-start px-2 py-0.5 rounded-pill bg-dark-success-light mb-2">
            <Text className="text-dark-success text-micro font-bold">Save {item.savings}</Text>
          </View>
        )}

        <Text
          className={`text-subhead font-bold mb-1 ${
            isSelected ? 'text-white' : 'text-dark-ink'
          }`}
        >
          {item.label}
        </Text>

        <Text
          className={`text-display font-bold tracking-tight ${
            isSelected ? 'text-brand-400' : 'text-dark-ink'
          }`}
        >
          {item.price}
        </Text>
        <Text className="text-dark-ink-muted text-caption mt-0.5">{item.period}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View className={className}>
      <FlatList
        data={plans}
        renderItem={renderPlan}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: CARD_GAP }}
        contentContainerStyle={{ paddingHorizontal: 20 }}
        scrollEnabled={false}
      />
    </View>
  );
};

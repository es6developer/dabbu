import React from 'react';
import { FlatList, View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export interface PremiumTier {
  id: string;
  label: string;
  price: string;
  per?: string;
  badge?: string;
  gradientColors: [string, string, ...string[]];
  onSelect: () => void;
}

interface DashboardPremiumHeaderProps {
  tiers: PremiumTier[];
  className?: string;
}

const CARD_WIDTH = Dimensions.get('window').width * 0.7;
const CARD_GAP = 12;

const PremiumTierCard: React.FC<{ item: PremiumTier }> = ({ item }) => {
  return (
    <LinearGradient
      colors={item.gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: CARD_WIDTH, borderRadius: 20 }}
      className="p-5 justify-between"
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-dark-ink text-body-bold">{item.label}</Text>
        {item.badge && (
          <View className="px-2.5 py-1 rounded-pill bg-white/15">
            <Text className="text-white text-micro font-bold tracking-wide uppercase">
              {item.badge}
            </Text>
          </View>
        )}
      </View>

      <View>
        <Text className="text-white text-display font-bold tracking-tight">
          {item.price}
        </Text>
        {item.per && (
          <Text className="text-dark-ink-muted text-caption mt-0.5">
            {item.per}
          </Text>
        )}
      </View>

      <TouchableOpacity
        onPress={item.onSelect}
        activeOpacity={0.8}
        className="self-start px-5 py-2 rounded-pill bg-white/20"
      >
        <Text className="text-white text-caption-bold">Subscribe</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
};

export const DashboardPremiumHeader: React.FC<DashboardPremiumHeaderProps> = ({
  tiers,
  className = '',
}) => {
  return (
    <View className={className}>
      <FlatList
        data={tiers}
        renderItem={({ item }) => <PremiumTierCard item={item} />}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + CARD_GAP}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 4 }}
      />
    </View>
  );
};

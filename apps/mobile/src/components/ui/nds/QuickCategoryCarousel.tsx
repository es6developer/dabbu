import React from 'react';
import { FlatList, Text, TouchableOpacity, View, Platform } from 'react-native';

export interface CategoryItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface QuickCategoryCarouselProps {
  data: CategoryItem[];
  onSelect?: (item: CategoryItem) => void;
  selectedId?: string;
  shape?: 'circle' | 'soft-square';
  className?: string;
}

const ITEM_GAP = 16;

const shadowStyle = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  android: { elevation: 2 },
  default: {},
});

export const QuickCategoryCarousel: React.FC<QuickCategoryCarouselProps> = ({
  data,
  onSelect,
  selectedId,
  shape = 'circle',
  className = '',
}) => {
  const renderItem = ({ item }: { item: CategoryItem }) => {
    const isSelected = item.id === selectedId;
    const iconBgClass =
      shape === 'circle'
        ? 'w-14 h-14 rounded-full'
        : 'w-14 h-14 rounded-xl';

    return (
      <TouchableOpacity
        onPress={() => onSelect?.(item)}
        activeOpacity={0.7}
        className="items-center"
        style={{ marginRight: ITEM_GAP }}
      >
        <View
          className={`${iconBgClass} items-center justify-center mb-2 ${
            isSelected ? 'bg-brand-500' : 'bg-dark-surface-raised'
          }`}
          style={isSelected ? undefined : shadowStyle}
        >
          {item.icon}
        </View>
        <Text
          className={`text-caption text-center leading-4 ${
            isSelected ? 'text-dark-ink font-semibold' : 'text-dark-ink-muted'
          }`}
          numberOfLines={1}
        >
          {item.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View className={className}>
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20 }}
      />
    </View>
  );
};

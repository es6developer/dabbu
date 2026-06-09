import React from 'react';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';

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

export const QuickCategoryCarousel: React.FC<QuickCategoryCarouselProps> = ({
  data,
  onSelect,
  selectedId,
  shape = 'circle',
  className = '',
}) => {
  const renderItem = ({ item }: { item: CategoryItem }) => {
    const isSelected = item.id === selectedId;
    const iconBgClass = shape === 'circle' ? 'w-14 h-14 rounded-full' : 'w-14 h-14 rounded-2xl';

    return (
      <TouchableOpacity
        onPress={() => onSelect?.(item)}
        activeOpacity={0.7}
        className="items-center mr-4"
      >
        <View
          className={`${iconBgClass} items-center justify-center mb-2 ${
            isSelected ? 'bg-teal-500' : 'bg-white'
          }`}
          style={
            isSelected
              ? undefined
              : {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.04,
                  shadowRadius: 8,
                  elevation: 2,
                }
          }
        >
          {item.icon}
        </View>
        <Text
          className={`text-xs text-center leading-4 ${
            isSelected ? 'text-teal-600 font-semibold' : 'text-ink-muted'
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
        contentContainerStyle={{ paddingHorizontal: 4 }}
      />
    </View>
  );
};

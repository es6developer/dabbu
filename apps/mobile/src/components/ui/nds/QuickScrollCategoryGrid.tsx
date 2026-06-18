import React from 'react';
import { FlatList, Text, TouchableOpacity, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface QuickCategoryNode {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
}

interface QuickScrollCategoryGridProps {
  data: QuickCategoryNode[];
  onSelect?: (item: QuickCategoryNode) => void;
  selectedId?: string;
  className?: string;
}

const NODE_SIZE = 68;
const ICON_SIZE = 24;
const ITEM_GAP = 16;

export const QuickScrollCategoryGrid: React.FC<QuickScrollCategoryGridProps> = ({
  data,
  onSelect,
  selectedId,
  className = '',
}) => {
  const renderNode = ({ item }: { item: QuickCategoryNode }) => {
    const isSelected = item.id === selectedId;
    const nodeColor = item.color ?? '#7C3AED';

    return (
      <TouchableOpacity
        onPress={() => onSelect?.(item)}
        activeOpacity={0.7}
        className="items-center"
        style={{ width: NODE_SIZE, marginRight: ITEM_GAP }}
      >
        <View
          className="items-center justify-center rounded-xl"
          style={{
            width: NODE_SIZE,
            height: NODE_SIZE,
            backgroundColor: isSelected ? nodeColor : '#1A1A1E',
          }}
        >
<<<<<<< Updated upstream
          <Ionicons
            name={item.icon}
=======
          <AntDesign
            name={item.icon as any}
>>>>>>> Stashed changes
            size={ICON_SIZE}
            color={isSelected ? '#0B0813' : '#94A3B8'}
          />
        </View>

        <Text
          className="text-center mt-2 text-small leading-3"
          style={{
            color: isSelected ? '#FFFFFF' : '#64748B',
            fontWeight: isSelected ? '600' : '400',
          }}
          numberOfLines={2}
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
        renderItem={renderNode}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 2 }}
      />
    </View>
  );
};

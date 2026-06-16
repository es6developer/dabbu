import React from 'react';
import { FlatList, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
export interface QuickCategoryNode {
  id: string;
  label: string;
  icon: string;
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

export const QuickScrollCategoryGrid: React.FC<QuickScrollCategoryGridProps> = ({
  data,
  onSelect,
  selectedId,
  className = '',
}) => {
  const isDark = useColorScheme() === 'dark';

  const bgColor = isDark ? '#1F1A30' : '#EDEAF2';
  const selectedIconColor = isDark ? '#0B0813' : '#FFFFFF';
  const defaultIconColor = isDark ? '#B8B0CC' : '#5A5280';
  const selectedTextColor = isDark ? '#F1F0F7' : '#0B0813';
  const defaultTextColor = isDark ? '#7A7194' : '#8A84A0';

  const renderNode = ({ item }: { item: QuickCategoryNode }) => {
    const isSelected = item.id === selectedId;
    const nodeColor = item.color ?? '#8B5CF6';

    return (
      <TouchableOpacity
        onPress={() => onSelect?.(item)}
        activeOpacity={0.7}
        className="items-center mr-4"
        style={{ width: NODE_SIZE }}
      >
        <View
          className="items-center justify-center rounded-[20px]"
          style={{
            width: NODE_SIZE,
            height: NODE_SIZE,
            backgroundColor: isSelected ? nodeColor : bgColor,
          }}
        >
          <AntDesign
            name={item.icon}
            size={ICON_SIZE}
            color={isSelected ? selectedIconColor : defaultIconColor}
          />
        </View>

        <Text
          className="text-center mt-2 text-[11px] leading-3"
          style={{
            color: isSelected ? selectedTextColor : defaultTextColor,
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

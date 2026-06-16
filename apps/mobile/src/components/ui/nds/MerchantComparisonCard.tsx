import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { SurfaceCard } from './SurfaceCard';

export interface PriceRow {
  source: string;
  price: string;
  onBuy: () => void;
  badgeLabel?: string;
}

interface MerchantComparisonCardProps {
  productName: string;
  productImage?: string;
  thumbnails?: string[];
  prices: PriceRow[];
  className?: string;
}

export const MerchantComparisonCard: React.FC<MerchantComparisonCardProps> = ({
  productName,
  productImage,
  thumbnails,
  prices,
  className = '',
}) => {
  const displayThumbs = thumbnails ?? (productImage ? [productImage] : []);

  return (
    <SurfaceCard className={className} padding="p-4">
      <View className="flex-row">
        <View className="mr-4 items-center justify-start pt-1">
          {displayThumbs.length > 0 ? (
            <View className="flex-row flex-wrap gap-1.5 w-20">
              {displayThumbs.slice(0, 4).map((src, idx) => (
                <Image
                  key={idx}
                  source={{ uri: src }}
                  className={`rounded-lg bg-dark-surface-raised ${
                    displayThumbs.length > 1 ? 'w-[38px] h-[38px]' : 'w-20 h-20'
                  }`}
                  resizeMode="cover"
                />
              ))}
            </View>
          ) : (
            <View className="w-20 h-20 rounded-xl bg-dark-surface-raised items-center justify-center">
              <Text className="text-dark-ink-faint text-caption">No img</Text>
            </View>
          )}
        </View>

        <View className="flex-1">
          <Text
            className="text-dark-ink text-subhead mb-3"
            numberOfLines={1}
          >
            {productName}
          </Text>

          <View className="gap-2.5">
            {prices.map((row, idx) => (
              <View key={idx} className="flex-row items-center justify-between">
                <View className="flex-1 mr-3">
                  <Text className="text-dark-ink-muted text-caption mb-0.5">
                    {row.source}
                  </Text>
                  <Text className="text-dark-ink font-bold text-body-bold">
                    {row.price}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={row.onBuy}
                  activeOpacity={0.8}
                  className="px-4 py-2 rounded-pill bg-brand-500"
                >
                  <Text className="text-white text-caption-bold">
                    {row.badgeLabel ?? 'Buy'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      </View>
    </SurfaceCard>
  );
};

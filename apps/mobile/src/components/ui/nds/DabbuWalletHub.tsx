import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface WalletBalance {
  label: string;
  amount: number;
  gradientColors?: [string, string, ...string[]];
}

interface DabbuWalletHubProps {
  wallets: WalletBalance[];
  onTransfer?: () => void;
  onSearch?: (query: string) => void;
  className?: string;
}

const shadowStyle = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
  },
  android: { elevation: 6 },
  default: {},
});

function fmt(v: number) {
  const n = v || 0;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export const DabbuWalletHub: React.FC<DabbuWalletHubProps> = ({
  wallets,
  onTransfer,
  onSearch,
  className = '',
}) => {
  const primaryWallet = wallets[0];
  const otherWallets = wallets.slice(1);

  return (
    <View className={`mx-5 ${className}`}>
      <LinearGradient
        colors={primaryWallet?.gradientColors ?? ['#1A0B2E', '#3D1B6D']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="rounded-xl p-5"
        style={shadowStyle}
      >
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-dark-ink-muted text-caption font-semibold uppercase tracking-wider">
            {primaryWallet?.label ?? 'Joint Wallet'}
          </Text>
          <TouchableOpacity
            onPress={onTransfer}
            activeOpacity={0.7}
            className="w-9 h-9 rounded-full bg-white/15 items-center justify-center"
          >
            <Ionicons name="swap-horizontal" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <Text className="text-white text-hero font-bold tracking-tight mb-1">
          {fmt(primaryWallet?.amount ?? 0)}
        </Text>

        <Text className="text-white/50 text-caption mt-0.5">Available balance</Text>
      </LinearGradient>

      {otherWallets.length > 0 && (
        <View className="flex-row mt-3 gap-3">
          {otherWallets.map((w, idx) => (
            <LinearGradient
              key={idx}
              colors={w.gradientColors ?? ['#1A0B2E', '#3D1B6D']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="flex-1 rounded-xl p-4"
            >
              <Text className="text-white/50 text-small">{w.label}</Text>
              <Text className="text-white text-heading font-bold mt-1">
                {fmt(w.amount)}
              </Text>
            </LinearGradient>
          ))}
        </View>
      )}

      <View className="flex-row items-center mt-4 px-4 py-3 rounded-xl bg-dark-surface-raised border border-dark-border-default">
        <Ionicons name="search-outline" size={18} color="#64748B" />
        <TextInput
          placeholder="Search transactions..."
          placeholderTextColor="#64748B"
          className="flex-1 ml-3 text-dark-ink text-body"
          onChangeText={onSearch}
        />
      </View>
    </View>
  );
};

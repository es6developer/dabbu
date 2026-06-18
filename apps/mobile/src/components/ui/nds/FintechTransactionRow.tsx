import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { AntDesign } from '@expo/vector-icons';

export interface TransactionEntry {
  id: string;
  title: string;
  subtitle?: string;
  timestamp: string;
  amount: number;
  type: 'wallet' | 'arrowdown';
  icon?: keyof typeof AntDesign.glyphMap;
  iconColor?: string;
  onPress?: () => void;
}

interface FintechTransactionRowProps {
  transaction: TransactionEntry;
  className?: string;
}

function fmt(v: number) {
  const n = v || 0;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

const shadowStyle = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  android: { elevation: 4 },
  default: {},
});

export const FintechTransactionRow: React.FC<FintechTransactionRowProps> = ({
  transaction,
  className = '',
}) => {
  const isExpense = transaction.type === 'wallet';
  const icon = transaction.icon ?? (isExpense ? 'upcircle' : 'downcircle');
  const iconBgColor = transaction.iconColor ?? (isExpense ? '#FB7185' : '#00E676');

  return (
    <TouchableOpacity
      onPress={transaction.onPress}
      activeOpacity={0.7}
      className={`flex-row items-center px-4 py-3.5 rounded-xl bg-dark-surface ${className}`}
      style={shadowStyle}
    >
      <View
        className="w-11 h-11 rounded-full items-center justify-center mr-4"
        style={{ backgroundColor: isExpense ? '#FB718520' : '#00E67620' }}
      >
        <AntDesign
          name={icon as any}
          size={22}
          color={iconBgColor}
        />
      </View>

      <View className="flex-1">
        <Text className="text-dark-ink text-body-bold" numberOfLines={1}>
          {transaction.title}
        </Text>
        {transaction.subtitle && (
          <Text className="text-dark-ink-faint text-caption mt-0.5" numberOfLines={1}>
            {transaction.subtitle}
          </Text>
        )}
        <Text className="text-dark-ink-muted text-small mt-0.5">{transaction.timestamp}</Text>
      </View>

      <Text
        className={`text-subhead font-bold ml-3 ${
          isExpense ? 'text-dark-ink' : 'text-dark-success'
        }`}
      >
        {isExpense ? '-' : '+'}{fmt(transaction.amount)}
      </Text>
    </TouchableOpacity>
  );
};

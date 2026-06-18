import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { AntDesign } from '@expo/vector-icons';

export interface ParsedSms {
  id: string;
  transaction: string;
  amount: string;
  source: string;
  timestamp?: string;
}

interface SMSDetectionWidgetProps {
  sms: ParsedSms | null;
  pendingCount?: number;
  onApprove?: (id: string) => void;
  onRecategorize?: (id: string) => void;
  className?: string;
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

export const SMSDetectionWidget: React.FC<SMSDetectionWidgetProps> = ({
  sms,
  pendingCount = 0,
  onApprove,
  onRecategorize,
  className = '',
}) => {
  if (!sms) {
    return (
      <View
        className={`mx-5 px-5 py-4 rounded-xl bg-dark-surface ${className}`}
        style={shadowStyle}
      >
        <View className="flex-row items-center">
          <View className="w-10 h-10 rounded-full bg-dark-surface-raised items-center justify-center mr-4">
            <AntDesign name="scan1" size={20} color="#7C3AED"  />
          </View>
          <View className="flex-1">
            <Text className="text-dark-ink text-body-bold">No new SMS detected</Text>
            <Text className="text-dark-ink-faint text-caption mt-0.5">
              Turn on SMS permissions in Settings
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View
      className={`mx-5 px-5 py-4 rounded-xl bg-dark-surface ${className}`}
      style={shadowStyle}
    >
      <View className="flex-row items-start">
        <View className="w-10 h-10 rounded-full bg-dark-surface-raised items-center justify-center mr-4">
          <AntDesign name="message1" size={20} color="#7C3AED"  />
        </View>

        <View className="flex-1">
          <View className="flex-row items-center mb-1">
            <Text className="text-dark-ink text-micro font-semibold uppercase tracking-wider">
              SMS Detected
            </Text>
            {pendingCount > 1 && (
              <View className="ml-2 px-2 py-0.5 rounded-pill bg-dark-expense-light">
                <Text className="text-dark-expense text-micro font-bold">
                  +{pendingCount - 1} more
                </Text>
              </View>
            )}
          </View>

          <Text className="text-dark-ink-muted text-body leading-5" numberOfLines={2}>
            Auto-categorized{' '}
            <Text className="text-dark-ink font-semibold">₹{sms.amount}</Text> at{' '}
            {sms.transaction} via {sms.source}
          </Text>

          {sms.timestamp && (
            <Text className="text-dark-ink-faint text-small mt-1">{sms.timestamp}</Text>
          )}
        </View>
      </View>

      <View className="flex-row justify-end mt-3 gap-3">
        <TouchableOpacity
          onPress={() => onRecategorize?.(sms.id)}
          activeOpacity={0.7}
          className="px-4 py-2 rounded-pill border border-dark-border-default flex-row items-center"
        >
          <AntDesign name="edit" size={14} color="#94A3B8"  />
          <Text className="text-dark-ink-muted text-caption-bold ml-1.5">Recategorize</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onApprove?.(sms.id)}
          activeOpacity={0.7}
          className="px-4 py-2 rounded-pill bg-dark-success flex-row items-center"
        >
          <AntDesign name="check" size={14} color="#000000"  />
          <Text className="text-black text-caption-bold ml-1.5">Approve</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

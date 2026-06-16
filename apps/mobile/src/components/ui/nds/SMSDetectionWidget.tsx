import React from 'react';
import { View, Text, TouchableOpacity, useColorScheme } from 'react-native';
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

export const SMSDetectionWidget: React.FC<SMSDetectionWidgetProps> = ({
  sms,
  pendingCount = 0,
  onApprove,
  onRecategorize,
  className = '',
}) => {
  const isDark = useColorScheme() === 'dark';

  const bgCard = isDark ? '#161224' : '#FFFFFF';
  const bgIcon = isDark ? '#1F1A3A' : '#F0EEF8';
  const textPrimary = isDark ? '#F1F0F7' : '#0B0813';
  const textSecondary = isDark ? '#B8B0CC' : '#5A5280';
  const textTertiary = isDark ? '#7A7194' : '#8A84A0';
  const borderColor = isDark ? '#2B2442' : '#D4CFE0';
  const brandColor = isDark ? '#8B6FE8' : '#8B5CF6';
  const iconColor = isDark ? '#0B0813' : '#FFFFFF';

  if (!sms) {
    return (
      <View
        className={`mx-5 px-5 py-4 rounded-[20px] ${className}`}
        style={{
          backgroundColor: bgCard,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: isDark ? 0.3 : 0.08,
          shadowRadius: isDark ? 16 : 8,
          elevation: isDark ? 4 : 2,
        }}
      >
        <View className="flex-row items-center">
          <View
            className="w-10 h-10 rounded-full items-center justify-center mr-4"
            style={{ backgroundColor: bgIcon }}
          >
            <AntDesign  name="scan1" size={20} color={brandColor} />
          </View>
          <View className="flex-1">
            <Text style={{ color: textPrimary }} className="text-sm font-semibold">
              No new SMS detected
            </Text>
            <Text style={{ color: textTertiary }} className="text-xs mt-0.5">
              Turn on SMS permissions in Settings
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View
      className={`mx-5 px-5 py-4 rounded-[20px] ${className}`}
      style={{
        backgroundColor: bgCard,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: isDark ? 0.3 : 0.08,
        shadowRadius: isDark ? 16 : 8,
        elevation: isDark ? 4 : 2,
      }}
    >
      <View className="flex-row items-start">
        <View
          className="w-10 h-10 rounded-full items-center justify-center mr-4"
          style={{ backgroundColor: bgIcon }}
        >
          <AntDesign  name="message1" size={20} color={brandColor} />
        </View>

        <View className="flex-1">
          <View className="flex-row items-center mb-1">
            <Text
              style={{ color: textPrimary }}
              className="text-xs font-semibold uppercase tracking-wider"
            >
              SMS Detected
            </Text>
            {pendingCount > 1 && (
              <View className="ml-2 px-2 py-0.5 rounded-full bg-[#FB7185]/20">
                <Text className="text-[#FB7185] text-[10px] font-bold">
                  +{pendingCount - 1} more
                </Text>
              </View>
            )}
          </View>

          <Text
            style={{ color: textSecondary }}
            className="text-[13px] leading-5"
            numberOfLines={2}
          >
            Auto-categorized{' '}
            <Text style={{ color: textPrimary }} className="font-semibold">
              ₹{sms.amount}
            </Text>{' '}
            at {sms.transaction} via {sms.source}
          </Text>

          {sms.timestamp && (
            <Text style={{ color: textTertiary }} className="text-[10px] mt-1">
              {sms.timestamp}
            </Text>
          )}
        </View>
      </View>

      <View className="flex-row justify-end mt-3 gap-3">
        <TouchableOpacity
          onPress={() => onRecategorize?.(sms.id)}
          activeOpacity={0.7}
          className="px-4 py-2 rounded-full border flex-row items-center"
          style={{ borderColor: borderColor }}
        >
          <AntDesign  name="edit" size={14} color={textSecondary} />
          <Text style={{ color: textSecondary }} className="text-xs font-semibold ml-1.5">
            Recategorize
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onApprove?.(sms.id)}
          activeOpacity={0.7}
          className="px-4 py-2 rounded-full flex-row items-center"
          style={{ backgroundColor: '#34D399' }}
        >
          <AntDesign  name="check" size={14} color={iconColor} />
          <Text style={{ color: iconColor }} className="text-xs font-semibold ml-1.5">
            Approve
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

interface UpgradePromptProps {
  feature?: string;
  compact?: boolean;
}

export function UpgradePrompt({ feature, compact = false }: UpgradePromptProps) {
  const navigation = useNavigation<any>();

  if (compact) {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => navigation.navigate('Premium')}
        style={{
          backgroundColor: '#1E1030', borderRadius: 14, padding: 14,
          flexDirection: 'row', alignItems: 'center', gap: 10,
          borderWidth: 1, borderColor: '#8B5CF630',
        }}
      >
        <View style={{
          width: 36, height: 36, borderRadius: 12, backgroundColor: '#8B5CF620',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <AntDesign  name="diamond" size={18} color="#8B5CF6" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFF' }}>
            {feature ? `Unlock ${feature}` : 'Upgrade to Premium'}
          </Text>
          <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
            Get AI insights, unlimited goals, and more
          </Text>
        </View>
        <AntDesign  name="right" size={16} color="#8B5CF6" />
      </TouchableOpacity>
    );
  }

  return (
    <View style={{
      margin: 16, backgroundColor: '#1E1030', borderRadius: 20, padding: 24,
      borderWidth: 1, borderColor: '#8B5CF630', alignItems: 'center', gap: 12,
    }}>
      <View style={{
        width: 56, height: 56, borderRadius: 18, backgroundColor: '#8B5CF620',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <AntDesign  name="diamond" size={28} color="#8B5CF6" />
      </View>
      <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFF', textAlign: 'center' }}>
        {feature ? `${feature}` : 'Dabbu Premium'}
      </Text>
      <Text style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 18 }}>
        {feature
          ? `Upgrade to Premium to unlock ${feature.toLowerCase()}. Get AI-powered financial planning, unlimited goals, and priority support.`
          : 'Get AI-powered financial planning, unlimited goals, baby planner, house planner, car planner, retirement planner, and priority support.'}
      </Text>
      <TouchableOpacity
        onPress={() => navigation.navigate('Premium')}
        style={{
          backgroundColor: '#8B5CF6', borderRadius: 14, paddingVertical: 14,
          paddingHorizontal: 32, marginTop: 4,
        }}
      >
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFF' }}>View Plans</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={{ fontSize: 12, color: '#64748B' }}>Maybe later</Text>
      </TouchableOpacity>
    </View>
  );
}

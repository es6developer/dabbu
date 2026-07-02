import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface PaywallCardProps {
  title: string;
  subtitle?: string;
  featureKey: string;
  tier?: 'PREMIUM' | 'FAMILY';
}

export function PaywallCard({ title, subtitle, featureKey, tier = 'PREMIUM' }: PaywallCardProps) {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const color = tier === 'FAMILY' ? '#C084FC' : '#FFD700';

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.card}>
        <View style={[styles.iconWrap, { backgroundColor: color + '15' }]}>
          <AntDesign name="lock1" size={20} color={color} />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: color }]}
          onPress={() => navigation.navigate('Premium')}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>Upgrade</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 14,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  btn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  btnText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '700',
  },
});

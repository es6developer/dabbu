import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function CoupleBudgetAdjustScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Adjust Budget</Text>
        </View>
      </View>
      <View style={styles.placeholder}>
        <Ionicons name="options-outline" size={48} color="#8B5CF6" />
        <Text style={styles.placeholderTitle}>Coming Soon</Text>
        <Text style={styles.placeholderText}>
          Budget adjustment form will be available in the next update.
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0D0B1A' },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 12 },
  placeholderTitle: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  placeholderText: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20 },
  backButton: {
    marginTop: 16,
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  backButtonText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
});

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';

const CATEGORIES = [
  { name: 'Food', icon: 'fast-food-outline', color: '#FF6B6B' },
  { name: 'Groceries', icon: 'cart-outline', color: '#34C759' },
  { name: 'Travel', icon: 'airplane-outline', color: '#60A5FA' },
  { name: 'Home', icon: 'home-outline', color: '#A78BFA' },
  { name: 'Bills', icon: 'receipt-outline', color: '#F59E0B' },
  { name: 'Internet', icon: 'wifi-outline', color: '#38BDF8' },
  { name: 'Entertainment', icon: 'film-outline', color: '#8B5CF6' },
  { name: 'Medical', icon: 'medkit-outline', color: '#FF4D4F' },
  { name: 'Shopping', icon: 'bag-outline', color: '#F472B6' },
  { name: 'Education', icon: 'school-outline', color: '#6366F1' },
  { name: 'Transport', icon: 'car-outline', color: '#14B8A6' },
  { name: 'Rent', icon: 'business-outline', color: '#FB923C' },
];

export function CategorySelectionScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');

  const filtered = CATEGORIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.primary }]}>
      <LinearGradient
        colors={['#6C3EF4', '#8B5CF6']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top + 12, paddingBottom: 20, paddingHorizontal: 20 }}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Category</Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={[styles.searchBar, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
          <Ionicons name="search" size={18} color="rgba(255,255,255,0.6)" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search categories"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </LinearGradient>

      <FlatList
        data={filtered}
        numColumns={3}
        keyExtractor={(item) => item.name}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16, gap: 12 }}
        columnWrapperStyle={{ gap: 12 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.categoryCard, { backgroundColor: colors.bg.card }]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('NewAddExpense', { category: item.name })}
          >
            <View style={[styles.catIcon, { backgroundColor: `${item.color}15` }]}>
              <Ionicons name={item.icon as any} size={24} color={item.color} />
            </View>
            <Text style={[styles.catName, { color: colors.text.primary }]}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  backBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, borderRadius: 12, height: 40 },
  searchInput: { flex: 1, color: '#FFF', fontSize: 14 },
  categoryCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    borderRadius: 18,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  catIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});

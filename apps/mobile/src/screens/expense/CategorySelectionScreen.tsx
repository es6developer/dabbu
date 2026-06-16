import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../config/categoryIcons';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_W } = Dimensions.get('window');
const PURPLE = '#8B5CF6';
const PURPLE_DARK = '#6D28D9';

export function CategorySelectionScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');

  const transactionType: 'expense' | 'income' = route.params?.type || 'expense';
  const currentCats = transactionType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const isExpense = transactionType === 'expense';

  const filtered = currentCats.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  const data = [{ isAdd: true }, ...filtered.map((c) => ({ isAdd: false, ...c }))];

  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary }]}>
      {/* Header */}
      <LinearGradient
        colors={[isExpense ? PURPLE : '#10B981', isExpense ? PURPLE_DARK : '#059669']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={{ paddingTop: insets.top + 12, paddingBottom: 24, paddingHorizontal: 20 }}>
          <View style={s.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
              <Ionicons name="close-outline" size={22} color="#FFF" />
            </TouchableOpacity>
            <Text style={s.headerTitle}>Select Category</Text>
            <View style={{ width: 34 }} />
          </View>
        </View>
      </LinearGradient>

      {/* Search */}
      <View style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
        <View
          style={[
            s.searchBar,
            { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle },
          ]}
        >
          <Ionicons name="search-outline" size={16} color={colors.text.tertiary} />
          <TextInput
            style={[s.searchInput, { color: colors.text.primary }]}
            placeholder="Search categories"
            placeholderTextColor={colors.text.tertiary}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Grid */}
      <FlatList
        data={data}
        numColumns={4}
        keyExtractor={(_, i) => String(i)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 8 }}
        columnWrapperStyle={{ gap: 8 }}
        renderItem={({ item }: any) => {
          if (item.isAdd) {
            return (
              <TouchableOpacity
                style={[s.addCard, { borderColor: colors.border.subtle }]}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('CreateCategory', { type: transactionType })}
              >
                <View style={[s.catIcon, { backgroundColor: `${PURPLE}15` }]}>
                  <Ionicons name="add-outline" size={24} color={PURPLE} />
                </View>
                <Text style={[s.catName, { color: colors.text.secondary }]}>Add New</Text>
              </TouchableOpacity>
            );
          }
          return (
            <TouchableOpacity
              style={[s.categoryCard, { backgroundColor: colors.bg.card }]}
              activeOpacity={0.7}
              onPress={() =>
                navigation.navigate('NewAddExpense', { category: item.name, type: transactionType })
              }
            >
              <View style={[s.catIcon, { backgroundColor: `${item.color}18` }]}>
                <Ionicons name={item.icon as any} size={24} color={item.color} />
              </View>
              <Text style={[s.catName, { color: colors.text.primary }]} numberOfLines={1}>
                {item.name}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#FFF', fontSize: 17, fontWeight: '700' },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '500' },

  categoryCard: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  catIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catName: { fontSize: 10, fontWeight: '600', textAlign: 'center', lineHeight: 13 },

  addCard: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: 'dashed',
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  addIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

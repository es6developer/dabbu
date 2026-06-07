import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, FlatList, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { CATEGORY_ICONS, getCategoryColor } from '../../config/categoryIcons';

const CATEGORY_NAMES = ['Food', 'Groceries', 'Travel', 'Gym', 'Water', 'Internet', 'Rent', 'Bills', 'Shopping', 'Entertainment', 'Medical', 'Education'];
const CATEGORIES = CATEGORY_NAMES.map((name) => ({ name, icon: CATEGORY_ICONS[name], color: getCategoryColor(name) }));

export function CategorySelectionScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState('');

  const filtered = CATEGORIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const data = [{ isAdd: true }, ...filtered.map(c => ({ isAdd: false, ...c }))];

  function handleCustomAdd() {
    if (customName.trim()) {
      navigation.navigate('NewAddExpense', { category: customName.trim(), isCustom: true });
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.primary }]}>
      <LinearGradient
        colors={['#5D38B5', '#7A52D1']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top + 12, paddingBottom: 24, paddingHorizontal: 20 }}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="close" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Category</Text>
          <View style={{ width: 34 }} />
        </View>
        <View style={[styles.searchBar, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
          <Ionicons name="search" size={16} color="rgba(255,255,255,0.6)" />
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
        data={data}
        numColumns={4}
        keyExtractor={(_, i) => String(i)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 20, gap: 8 }}
        columnWrapperStyle={{ gap: 8 }}
        renderItem={({ item }: any) => {
          if (item.isAdd) {
            return (
              <TouchableOpacity
                style={[styles.addCard, { borderColor: colors.border.subtle }]}
                activeOpacity={0.7}
                onPress={() => setShowCustom(true)}
              >
                <View style={styles.addIcon}>
                  <Text style={styles.addIconText}>+</Text>
                </View>
                <Text style={[styles.catName, { color: colors.text.secondary }]}>Add New</Text>
              </TouchableOpacity>
            );
          }
          return (
            <TouchableOpacity
              style={[styles.categoryCard, { backgroundColor: colors.bg.card }]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('NewAddExpense', { category: item.name })}
            >
              <View style={[styles.catIcon, { backgroundColor: `${item.color}15` }]}>
                <Ionicons name={item.icon as any} size={22} color={item.color} />
              </View>
              <Text style={[styles.catName, { color: colors.text.primary }]} numberOfLines={1}>{item.name}</Text>
            </TouchableOpacity>
          );
        }}
      />

      <Modal visible={showCustom} transparent animationType="slide">
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowCustom(false)}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}} style={[styles.sheet, { backgroundColor: colors.bg.primary }]}>
            <View style={[styles.handle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }]} />
            <Text style={[styles.sheetTitle, { color: colors.text.primary }]}>Add Custom Category</Text>
            <TextInput
              style={[styles.customInput, { backgroundColor: colors.bg.card, color: colors.text.primary, borderColor: colors.border.default }]}
              placeholder="Category name"
              placeholderTextColor={colors.text.tertiary}
              value={customName}
              onChangeText={setCustomName}
              autoFocus
            />
            <View style={styles.sheetActions}>
              <TouchableOpacity style={[styles.sheetBtn, { backgroundColor: colors.bg.tertiary }]} onPress={() => setShowCustom(false)}>
                <Text style={[styles.sheetBtnText, { color: colors.text.secondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.sheetBtn, { backgroundColor: '#5D38B5' }]} onPress={handleCustomAdd}>
                <Text style={[styles.sheetBtnText, { color: '#FFF' }]}>Add</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 34, height: 34, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 14, height: 40, marginTop: 14 },
  searchInput: { flex: 1, fontSize: 14, color: '#FFF' },

  categoryCard: { flex: 1, alignItems: 'center', gap: 8, borderRadius: 18, paddingVertical: 16, paddingHorizontal: 6 },
  catIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  catName: { fontSize: 11, fontWeight: '600', textAlign: 'center' },

  addCard: { flex: 1, alignItems: 'center', gap: 8, borderRadius: 18, borderWidth: 1, borderStyle: 'dashed', paddingVertical: 16, paddingHorizontal: 6 },
  addIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#F5F0FF', alignItems: 'center', justifyContent: 'center' },
  addIconText: { fontSize: 24, fontWeight: '700', color: '#5D38B5' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, paddingBottom: 40, gap: 16 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
  sheetTitle: { fontSize: 18, fontWeight: '700' },
  customInput: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15 },
  sheetActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  sheetBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  sheetBtnText: { fontSize: 15, fontWeight: '700' },
});

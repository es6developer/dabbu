import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, RefreshControl,
  StyleSheet, ActivityIndicator, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { Card } from '../../components/ui/Card';

interface GroceryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  estimatedPrice: number;
  completed: boolean;
  assignedTo?: { id: string; name: string };
}

interface GroceryList {
  id: string;
  name: string;
  items: GroceryItem[];
  createdAt: string;
  totalEstimatedPrice: number;
}

export function AiGroceryScreen() {
  const { colors, spacing, borderRadius: br, typography } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: { groupId: string } }, 'params'>>();
  const { groupId } = route.params;

  const [lists, setLists] = useState<GroceryList[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedListId, setExpandedListId] = useState<string | null>(null);
  const [newListName, setNewListName] = useState('');
  const [showCreateList, setShowCreateList] = useState(false);
  const [creatingList, setCreatingList] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const [addingItemToListId, setAddingItemToListId] = useState<string | null>(null);
  const [togglingItemId, setTogglingItemId] = useState<string | null>(null);

  const fetchLists = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const res = await api.get<GroceryList[]>(`/ai-insights/groups/${groupId}/grocery-lists`);
      setLists(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load grocery lists');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [groupId]);

  useFocusEffect(
    useCallback(() => {
      fetchLists();
    }, [fetchLists])
  );

  async function handleCreateList() {
    if (!newListName.trim()) return;
    setCreatingList(true);
    try {
      await api.post(`/ai-insights/groups/${groupId}/grocery-lists`, { name: newListName.trim() });
      setNewListName('');
      setShowCreateList(false);
      fetchLists();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create list');
    } finally {
      setCreatingList(false);
    }
  }

  async function handleToggleItem(listId: string, itemId: string, currentCompleted: boolean) {
    if (togglingItemId) return;
    setTogglingItemId(itemId);
    try {
      setLists(prev => prev.map(list => {
        if (list.id !== listId) return list;
        return {
          ...list,
          items: list.items.map(item =>
            item.id === itemId ? { ...item, completed: !currentCompleted } : item
          ),
        };
      }));
    } finally {
      setTogglingItemId(null);
    }
  }

  async function handleAddItem(listId: string) {
    if (!newItemText.trim()) return;
    const text = newItemText.trim();
    setNewItemText('');
    try {
      setLists(prev => prev.map(list => {
        if (list.id !== listId) return list;
        return {
          ...list,
          items: [...list.items, {
            id: `temp-${Date.now()}`,
            name: text,
            quantity: 1,
            unit: 'pcs',
            estimatedPrice: 0,
            completed: false,
          }],
        };
      }));
    } catch (_e) {
      // ignore
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  if (loading && !lists.length) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg.primary }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error && !lists.length) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg.primary }]}>
        <View style={styles.loadingContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.status.error} />
          <Text style={[typography.callout, { color: colors.text.secondary, marginTop: spacing.md }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.accent.primary }]}
            onPress={() => fetchLists()}
          >
            <Text style={[typography.buttonSmall, { color: '#FFFFFF' }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const completedCount = (list: GroceryList) => list.items.filter(i => i.completed).length;
  const totalCount = (list: GroceryList) => list.items.length;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg.primary }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchLists(true)}
            tintColor={colors.accent.primary}
            colors={[colors.accent.primary]}
          />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[typography.h3, { color: colors.text.primary }]}>Grocery Lists</Text>
          <TouchableOpacity onPress={() => setShowCreateList(true)}>
            <Ionicons name="add-circle" size={28} color={colors.accent.primary} />
          </TouchableOpacity>
        </View>

        {showCreateList && (
          <Card variant="elevated" padding="lg" style={styles.createCard}>
            <TextInput
              style={[styles.createInput, { backgroundColor: colors.bg.tertiary, color: colors.text.primary }]}
              value={newListName}
              onChangeText={setNewListName}
              placeholder="List name"
              placeholderTextColor={colors.text.tertiary}
              autoFocus
            />
            <View style={styles.createActions}>
              <TouchableOpacity
                onPress={() => { setShowCreateList(false); setNewListName(''); }}
              >
                <Text style={[typography.calloutBold, { color: colors.text.tertiary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createBtn, { backgroundColor: colors.accent.primary, opacity: creatingList || !newListName.trim() ? 0.5 : 1 }]}
                onPress={handleCreateList}
                disabled={creatingList || !newListName.trim()}
              >
                {creatingList ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={[typography.buttonSmall, { color: '#FFFFFF' }]}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {lists.length === 0 && !showCreateList ? (
          <View style={styles.emptyState}>
            <Ionicons name="basket-outline" size={48} color={colors.text.tertiary} />
            <Text style={[typography.callout, { color: colors.text.tertiary, marginTop: spacing.md }]}>
              No grocery lists yet
            </Text>
            <TouchableOpacity
              style={[styles.createFirstBtn, { backgroundColor: colors.accent.primary }]}
              onPress={() => setShowCreateList(true)}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={[typography.buttonSmall, { color: '#FFFFFF', marginLeft: 6 }]}>Create List</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.listsContainer}>
            {lists.map(list => {
              const isExpanded = expandedListId === list.id;
              const completed = completedCount(list);
              const total = totalCount(list);
              const progress = total > 0 ? (completed / total) * 100 : 0;

              return (
                <Card key={list.id} variant="elevated" padding="lg" style={{ marginBottom: 14 }}>
                  <TouchableOpacity
                    style={styles.listHeader}
                    onPress={() => setExpandedListId(isExpanded ? null : list.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.listHeaderLeft}>
                      <View style={[styles.listIcon, { backgroundColor: colors.accent.primary + '15' }]}>
                        <Ionicons name="basket" size={18} color={colors.accent.primary} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[typography.bodyBold, { color: colors.text.primary }]}>
                          {list.name}
                        </Text>
                        <Text style={[typography.subhead, { color: colors.text.tertiary, marginTop: 2 }]}>
                          {completed}/{total} items · Est. {formatPrice(list.totalEstimatedPrice)}
                        </Text>
                      </View>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={colors.text.tertiary}
                      />
                    </View>
                    <View style={[styles.progressBg, { backgroundColor: colors.bg.tertiary, marginTop: 12 }]}>
                      <View style={[styles.progressFill, { width: `${Math.max(progress, 2)}%`, backgroundColor: progress === 100 ? colors.status.success : colors.accent.primary }]} />
                    </View>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={[styles.listItems, { borderTopColor: colors.border.subtle }]}>
                      {list.items.map(item => (
                        <TouchableOpacity
                          key={item.id}
                          style={[styles.itemRow, { borderBottomColor: colors.border.subtle }]}
                          onPress={() => handleToggleItem(list.id, item.id, item.completed)}
                          disabled={togglingItemId === item.id}
                        >
                          <View style={[styles.checkbox, {
                            backgroundColor: item.completed ? colors.status.success : 'transparent',
                            borderColor: item.completed ? colors.status.success : colors.border.default,
                          }]}>
                            {item.completed && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                          </View>
                          <Text style={[
                            typography.callout,
                            {
                              color: item.completed ? colors.text.tertiary : colors.text.primary,
                              textDecorationLine: item.completed ? 'line-through' : 'none',
                              flex: 1, marginLeft: 12,
                            },
                          ]}>
                            {item.name}
                          </Text>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[typography.subheadBold, { color: item.completed ? colors.text.tertiary : colors.text.secondary }]}>
                              {item.quantity} {item.unit}
                            </Text>
                            {item.estimatedPrice > 0 && (
                              <Text style={[typography.caption1, { color: colors.text.tertiary }]}>
                                {formatPrice(item.estimatedPrice)}
                              </Text>
                            )}
                          </View>
                        </TouchableOpacity>
                      ))}

                      <View style={[styles.addItemRow, { backgroundColor: colors.bg.tertiary }]}>
                        <TextInput
                          style={[styles.addItemInput, { color: colors.text.primary }]}
                          value={addingItemToListId === list.id ? newItemText : ''}
                          onChangeText={setNewItemText}
                          placeholder="Add item..."
                          placeholderTextColor={colors.text.tertiary}
                          onFocus={() => setAddingItemToListId(list.id)}
                        />
                        <TouchableOpacity
                          style={[styles.addItemBtn, { backgroundColor: colors.accent.primary }]}
                          onPress={() => {
                            handleAddItem(list.id);
                            setAddingItemToListId(null);
                          }}
                        >
                          <Ionicons name="add" size={18} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </Card>
              );
            })}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  retryButton: { marginTop: 20, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100, paddingHorizontal: 40 },
  createFirstBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  createCard: { marginHorizontal: 20, marginTop: 8 },
  createInput: { padding: 16, borderRadius: 14, fontSize: 15, fontWeight: '500' },
  createActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 12, gap: 12 },
  createBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  listsContainer: { paddingHorizontal: 20, marginTop: 8 },
  listHeader: {},
  listHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  listIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  progressBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  listItems: { marginTop: 14, borderTopWidth: 1, paddingTop: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  checkbox: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  addItemRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, borderRadius: 12, paddingLeft: 14, overflow: 'hidden' },
  addItemInput: { flex: 1, paddingVertical: 12, fontSize: 14, fontWeight: '500' },
  addItemBtn: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', margin: 4 },
});

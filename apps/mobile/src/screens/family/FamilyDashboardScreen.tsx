import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { DashboardSkeleton } from '../../components/ui/AnimatedSkeleton';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { spacing, borderRadius } from '../../theme/design';
import { Avatar } from '../../components/ui/Avatar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function FamilyDashboardScreen() {
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [families, setFamilies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (accessToken) {
      setAccessToken(accessToken);
    }
    loadFamilies();
  }, [accessToken]);

  async function loadFamilies() {
    try {
      const res = await api.get<any>('/family');
      setFamilies(Array.isArray(res) ? res : []);
    } catch (e) {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg.primary }]}>
        <DashboardSkeleton />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <FlatList
        data={families}
        keyExtractor={(f) => f.id}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={loadFamilies}
            tintColor={colors.accent.primary}
          />
        }
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Family Groups</Text>
            <Text style={[styles.headerSub, { color: colors.text.tertiary }]}>
              {families.length} {families.length === 1 ? 'group' : 'groups'}
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.bg.secondary,
                shadowColor: colors.text.primary,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.cardHeader}
              onPress={() => navigation.navigate('FamilyChat', { familyId: item.id })}
              activeOpacity={0.7}
            >
              <Avatar name={item.name} size={48} />
              <View style={styles.cardInfo}>
                <Text style={[styles.cardName, { color: colors.text.primary }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <View style={styles.cardMetaRow}>
                  <AntDesign  name="team" size={12} color={colors.text.tertiary} />
                  <Text style={[styles.cardMeta, { color: colors.text.tertiary }]}>
                    {item._count?.members || 0} members
                  </Text>
                </View>
              </View>
              <AntDesign  name="right" size={18} color={colors.text.tertiary} />
            </TouchableOpacity>
            <View style={[styles.cardActions, { borderTopColor: colors.border.subtle }]}>
              <TouchableOpacity
                style={styles.action}
                onPress={() => navigation.navigate('FamilyChat', { familyId: item.id })}
              >
                <View
                  style={[styles.actionIcon, { backgroundColor: `${colors.accent.primary}18` }]}
                >
                  <AntDesign  name="message1" size={18} color={colors.accent.primary} />
                </View>
                <Text style={[styles.actionLabel, { color: colors.text.secondary }]}>Chat</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.action}
                onPress={() => navigation.navigate('TasksList', { familyId: item.id })}
              >
                <View style={[styles.actionIcon, { backgroundColor: `${colors.accent.primary}18` }]}>
                  <AntDesign  name="check" size={18} color={colors.accent.primary} />
                </View>
                <Text style={[styles.actionLabel, { color: colors.text.secondary }]}>Tasks</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.action}
                onPress={() => navigation.navigate('CreateTask', { familyId: item.id })}
              >
                <View
                  style={[styles.actionIcon, { backgroundColor: `${colors.status.warning}18` }]}
                >
                  <AntDesign  name="clockcircleo" size={18} color={colors.status.warning} />
                </View>
                <Text style={[styles.actionLabel, { color: colors.text.secondary }]}>New Task</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIconWrap, { backgroundColor: `${colors.accent.primary}12` }]}>
              <AntDesign  name="team" size={44} color={colors.accent.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>No family group</Text>
            <Text style={[styles.emptyDesc, { color: colors.text.tertiary }]}>
              Create a family to share reminders{'\n'}and tasks together
            </Text>
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: colors.accent.primary }]}
              onPress={() => navigation.navigate('CreateFamily')}
              activeOpacity={0.85}
            >
              <AntDesign  name="plus" size={18} color={colors.text.inverse} />
              <Text style={[styles.emptyBtnText, { color: colors.text.inverse }]}>
                Create Family
              </Text>
            </TouchableOpacity>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: 16, paddingTop: 8 },
  header: { paddingVertical: 16, paddingHorizontal: 4 },
  headerTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  headerSub: { fontSize: 13, marginTop: 4, fontWeight: '500' },
  card: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardInfo: { flex: 1, marginLeft: 14 },
  cardName: { fontSize: 17, fontWeight: '700' },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  cardMeta: { fontSize: 12, fontWeight: '500' },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 14,
  },
  action: { alignItems: 'center', gap: 6 },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { fontSize: 11, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700' },
  emptyDesc: { fontSize: 14, textAlign: 'center', paddingHorizontal: 40, lineHeight: 20 },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    marginTop: 12,
  },
  emptyBtnText: { fontSize: 15, fontWeight: '700' },
});

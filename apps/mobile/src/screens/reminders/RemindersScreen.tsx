import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { Card } from '../../components/ui/Card';

const MOCK_REMINDERS: Array<{ id: string; title: string; date: string; priority: string }> = [];

export function RemindersScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const [reminders] = useState<any[]>(MOCK_REMINDERS);
  const [loading] = useState(false);

  const priorityColor = (p: string) => {
    switch (p) {
      case 'high': return colors.status.error;
      case 'medium': return colors.status.warning;
      default: return colors.status.info;
    }
  };

  if (loading) return (
    <View style={[styles.loading, { backgroundColor: colors.bg.primary }]}>
      <ActivityIndicator color={colors.accent.primary} size="large" />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <FlatList
        data={reminders}
        keyExtractor={(r) => r.id}
        contentContainerStyle={reminders.length === 0 ? styles.emptyContainer : { paddingTop: 8, paddingBottom: 100 }}
        ListHeaderComponent={
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: colors.text.primary }]}>Reminders</Text>
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.accent.primary }]} onPress={() => navigation.navigate('CreateReminder')}>
              <Ionicons name="add" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <Card variant="glass" padding="lg" style={styles.reminderCard}>
            <View style={styles.reminderRow}>
              <View style={[styles.priorityDot, { backgroundColor: priorityColor(item.priority) }]} />
              <View style={styles.reminderInfo}>
                <Text style={[styles.reminderTitle, { color: colors.text.primary }]}>{item.title}</Text>
                <Text style={[styles.reminderDate, { color: colors.text.tertiary }]}>{item.date}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIconWrap, { backgroundColor: `${colors.accent.primary}12` }]}>
              <Ionicons name="notifications-off-outline" size={48} color={colors.accent.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>No reminders yet</Text>
            <Text style={[styles.emptyDesc, { color: colors.text.tertiary }]}>
              Create your first reminder to stay on top of things
            </Text>
            <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: colors.accent.primary }]} onPress={() => navigation.navigate('CreateReminder')}>
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.emptyBtnText}>Create Reminder</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: '700' },
  addBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  reminderCard: { marginHorizontal: 16, marginVertical: 4 },
  reminderRow: { flexDirection: 'row', alignItems: 'center' },
  priorityDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  reminderInfo: { flex: 1 },
  reminderTitle: { fontSize: 15, fontWeight: '500' },
  reminderDate: { fontSize: 12, marginTop: 2 },
  emptyContainer: { flexGrow: 1 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, gap: 12 },
  emptyIconWrap: { width: 96, height: 96, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyTitle: { fontSize: 20, fontWeight: '600' },
  emptyDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 14, marginTop: 8 },
  emptyBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});

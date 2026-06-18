import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { spacing } from '../../theme/design';
import { api } from '../../services/api';
import { WidgetWrapper } from './WidgetWrapper';
import { WidgetType, PERSONAL_WIDGETS, COUPLE_WIDGETS, FAMILY_WIDGETS } from './WidgetRegistry';

interface DashboardGridProps {
  data: any;
  mode: 'personal' | 'couple' | 'family';
  refreshing: boolean;
  onRefresh: () => void;
  onWidgetPress?: (type: WidgetType) => void;
  onNavigate: (screen: string, params?: any) => void;
  onToggleWidget?: (type: WidgetType) => void;
  dashboardLayout?: WidgetType[];
}

export function DashboardGrid({ data, mode, refreshing, onRefresh, onWidgetPress, onNavigate, onToggleWidget, dashboardLayout }: DashboardGridProps) {
  const { colors } = useTheme();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [widgetOrder, setWidgetOrder] = useState<WidgetType[]>(() => {
    if (dashboardLayout && dashboardLayout.length > 0) return dashboardLayout;
    const orderKey = mode === 'family' ? 'familyWidgetOrder' : mode === 'couple' ? 'coupleWidgetOrder' : 'widgetOrder';
    const saved = data?.widgetOrder?.[orderKey];
    if (saved && Array.isArray(saved) && saved.length > 0) return saved;
    if (mode === 'family') return [...FAMILY_WIDGETS];
    if (mode === 'couple') return [...COUPLE_WIDGETS];
    return [...PERSONAL_WIDGETS];
  });

  const [disabledWidgets, setDisabledWidgets] = useState<Set<string>>(new Set());
  const [editMode, setEditMode] = useState(false);

  const visibleWidgets = widgetOrder.filter((w) => !disabledWidgets.has(w));

  const persistLayout = useCallback((order: WidgetType[]) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaving(true);
    saveTimerRef.current = setTimeout(() => {
      api.put('/user/preferences/dashboard', { layout: order }).catch(() => {}).finally(() => {
        setSaving(false);
      });
    }, 500);
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const toggleWidget = useCallback((type: WidgetType) => {
    setDisabledWidgets((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
    const idx = widgetOrder.indexOf(type);
    if (idx === -1) {
      const newOrder = [...widgetOrder, type];
      setWidgetOrder(newOrder);
      persistLayout(newOrder);
    } else {
      persistLayout(widgetOrder);
    }
  }, [widgetOrder, persistLayout]);

  const moveWidget = useCallback((index: number, direction: 'up' | 'down') => {
    setWidgetOrder((prev) => {
      const next = [...prev];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      persistLayout(next);
      return next;
    });
  }, [persistLayout]);

  const getTitle = () => {
    if (mode === 'family') return 'Family Dashboard';
    if (mode === 'couple') return 'Couple Dashboard';
    return 'Dashboard';
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.scroll, { paddingBottom: 100 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent.primary} />}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>{getTitle()}</Text>
        <View style={styles.headerActions}>
          {saving && <ActivityIndicator size="small" color={colors.text.tertiary} style={{ marginRight: 4 }} />}
          <TouchableOpacity onPress={() => setEditMode(!editMode)} style={[styles.editBtn, { backgroundColor: colors.bg.tertiary }]}>
            <Ionicons name={editMode ? 'checkmark' : 'settings-outline'} size={18} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      {visibleWidgets.map((type, index) => (
        <View key={type}>
          {editMode && (
            <View style={[styles.editBar, { backgroundColor: colors.bg.tertiary }]}>
              <TouchableOpacity
                onPress={() => {
                  const idx = widgetOrder.indexOf(type);
                  moveWidget(idx, 'up');
                }}
                disabled={index === 0}
                style={[styles.moveBtn, { opacity: index === 0 ? 0.3 : 1 }]}
              >
                <Ionicons name="chevron-up" size={16} color={colors.text.secondary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  const idx = widgetOrder.indexOf(type);
                  moveWidget(idx, 'down');
                }}
                disabled={index === visibleWidgets.length - 1}
                style={[styles.moveBtn, { opacity: index === visibleWidgets.length - 1 ? 0.3 : 1 }]}
              >
                <Ionicons name="chevron-down" size={16} color={colors.text.secondary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  Alert.alert('Remove Widget', `Hide "${type}" widget?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Hide', style: 'destructive', onPress: () => toggleWidget(type) },
                  ]);
                }}
                style={styles.removeBtn}
              >
                <Ionicons name="eye-off-outline" size={16} color="#EF4444" />
              </TouchableOpacity>
            </View>
          )}
          <WidgetWrapper
            type={type}
            data={data}
            onPress={() => onWidgetPress?.(type)}
            isDraggable={editMode}
          />
        </View>
      ))}

      {editMode && (
        <TouchableOpacity style={[styles.doneBtn, { backgroundColor: colors.accent.primary }]} onPress={() => setEditMode(false)}>
          <Ionicons name="checkmark-circle" size={18} color="#FFF" />
          <Text style={styles.doneText}>Done Editing</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, marginTop: 4 },
  headerTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  editBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  editBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    paddingVertical: 4, paddingHorizontal: 8, borderRadius: 10, marginBottom: 4, gap: 6,
  },
  moveBtn: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  removeBtn: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  doneBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 14, borderRadius: 16, marginTop: 8,
  },
  doneText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ListSkeleton } from '../../components/ui/AnimatedSkeleton';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { useTheme } from '../../theme';
import { api, setAccessToken, getAccessToken } from '../../services/api';
import { usePreferences, TabConfig } from '../../store/PreferencesContext';
import { useToast } from '../../store/ToastContext';

const BOTTOM_MENU_CACHE_KEY = '@dabbu_bottom_menu_config';

const TAB_META: Record<string, { label: string; icon: string; desc: string }> = {
  Dashboard: { label: 'Dashboard', icon: 'compass', desc: 'Home screen with overview' },
  Expense: { label: 'Expenses', icon: 'filetext1', desc: 'Transactions & accounts' },
  QuickAction: { label: 'Quick Action', icon: 'pluscircle', desc: 'Center FAB with quick actions' },
  Spaces: { label: 'Spaces', icon: 'grid', desc: 'Split expenses & shared accounts' },
  Settings: { label: 'Settings', icon: 'settings', desc: 'Profile, preferences & more' },
};

export function CustomiseBottomMenuScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { refresh, updateTabConfig } = usePreferences();
  const [tabs, setTabs] = useState<TabConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setAccessToken(getAccessToken());
    try {
      const res = await api.get<any>('/user/preferences');
      const config: TabConfig[] = (res?.bottomMenuConfig || []).sort(
        (a: any, b: any) => a.order - b.order,
      );
      if (config.length > 0) {
        setTabs(migrateConfig(config));
      } else {
        setTabs(getDefaultTabs());
      }
      AsyncStorage.setItem(BOTTOM_MENU_CACHE_KEY, JSON.stringify(config)).catch(() => {});
    } catch {
      try {
        const cached = await AsyncStorage.getItem(BOTTOM_MENU_CACHE_KEY);
        if (cached) {
          const parsed: TabConfig[] = JSON.parse(cached);
          setTabs(migrateConfig(parsed).sort((a: any, b: any) => a.order - b.order));
        } else {
          setTabs(getDefaultTabs());
        }
      } catch {
        setTabs(getDefaultTabs());
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    setSaving(true);
    const config = tabs.map((t, i) => ({
      id: t.id,
      visible: t.visible,
      order: i,
      locked: t.locked,
    }));
    updateTabConfig(config);
    AsyncStorage.setItem(BOTTOM_MENU_CACHE_KEY, JSON.stringify(config)).catch(() => {});
    try {
      await api.put('/user/preferences/bottom-menu', { config });
      showToast('Menu saved');
      await refresh();
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save');
      await refresh();
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  const toggleVisibility = (index: number) => {
    setTabs((prev) => prev.map((t, i) => (i === index ? { ...t, visible: !t.visible } : t)));
  };

  const renderItem = ({ item, drag, isActive, getIndex }: RenderItemParams<TabConfig>) => {
    const meta = TAB_META[item.id] || { label: item.id, icon: 'help', desc: '' };
    const idx = getIndex() ?? 0;
    const isSettings = item.id === 'Settings';
    const isQa = item.id === 'QuickAction';
    return (
      <ScaleDecorator>
        <TouchableOpacity
          onLongPress={isSettings ? undefined : drag}
          disabled={isActive || isSettings}
          style={[
            styles.tabItem,
            {
              backgroundColor: isActive ? `${colors.accent.primary}15` : colors.bg.secondary,
              borderColor: isActive ? colors.accent.primary : colors.border.subtle,
              opacity: item.visible ? 1 : 0.5,
            },
          ]}
        >
          <AntDesign
            name={(isSettings ? 'lock' : isQa ? 'bulb1' : 'menufold') as any}
            size={20}
            color={isSettings ? colors.text.tertiary : colors.text.tertiary}
            style={{ marginRight: 12 }}
          />
          <View style={[styles.tabIcon, { backgroundColor: `${colors.accent.primary}18` }]}>
            <AntDesign name={meta.icon as any} size={20} color={colors.accent.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.tabLabel, { color: colors.text.primary }]}>
              {meta.label}
              {isSettings ? ' (always last)' : ''}
            </Text>
            <Text style={[styles.tabDesc, { color: colors.text.tertiary }]}>{meta.desc}</Text>
          </View>
          <TouchableOpacity
            onPress={() => !isSettings && toggleVisibility(idx)}
            style={styles.eyeBtn}
          >
            <AntDesign
              name={item.visible ? 'eye' : 'eyeo'}
              size={20}
              color={
                isSettings
                  ? colors.text.tertiary
                  : item.visible
                    ? colors.accent.primary
                    : colors.text.tertiary
              }
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </ScaleDecorator>
    );
  };

  if (loading) {
    return (
      <View
        style={[styles.container, { backgroundColor: colors.bg.primary, paddingTop: insets.top }]}
      >
        <ListSkeleton />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <AntDesign  name="left" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text.primary }]}>Customise Bottom Menu</Text>
        <View style={{ width: 40 }} />
      </View>
      <Text style={[styles.subtitle, { color: colors.text.tertiary }]}>
        Drag to reorder. Settings is always last.
      </Text>

      <DraggableFlatList
        data={tabs}
        onDragEnd={({ data }) => {
          const withoutSettings = data.filter((t) => t.id !== 'Settings');
          const settings = data.find((t) => t.id === 'Settings');
          setTabs(settings ? [...withoutSettings, settings] : withoutSettings);
        }}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 20, gap: 10 }}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.accent.primary }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={[styles.saveText, { color: '#FFF' }]}>Save Menu Layout</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function migrateConfig(config: TabConfig[]): TabConfig[] {
  const oldKeyMap: Record<string, string> = {
    Accounts: 'Expense',
    Shared: 'Spaces',
  };
  return config.map((t) => ({
    ...t,
    id: oldKeyMap[t.id] || t.id,
  }));
}

function getDefaultTabs(): TabConfig[] {
  return [
    { id: 'Dashboard', visible: true, order: 0, locked: false },
    { id: 'Expense', visible: true, order: 1, locked: false },
    { id: 'QuickAction', visible: true, order: 2, locked: false },
    { id: 'Spaces', visible: true, order: 3, locked: false },
    { id: 'Settings', visible: true, order: 4, locked: true },
  ];
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 20, fontWeight: '800' },
  subtitle: { fontSize: 13, textAlign: 'center', paddingHorizontal: 24, marginBottom: 8 },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  tabIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tabLabel: { fontSize: 15, fontWeight: '700' },
  tabDesc: { fontSize: 11, marginTop: 2 },
  eyeBtn: { padding: 8 },
  footer: { paddingHorizontal: 20, paddingTop: 12 },
  saveBtn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  saveText: { fontSize: 16, fontWeight: '700' },
});

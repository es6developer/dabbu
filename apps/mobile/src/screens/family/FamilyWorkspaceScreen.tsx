import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { api } from '../../services/api';

export function FamilyWorkspaceScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const [workspace, setWorkspace] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkspace();
  }, []);

  const loadWorkspace = async () => {
    setLoading(true);
    try {
      const families: any[] = await api.get('/family');
      const familyId = families?.[0]?.id;
      if (!familyId) { setLoading(false); return; }
      const ws: any = await api.get(`/family/workspace/${familyId}`);
      setWorkspace(ws?.data || ws);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg.primary, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  if (!workspace) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg.primary, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#05966915', alignItems: 'center', justifyContent: 'center' }}>
          <AntDesign name="team" size={36} color="#059669" />
        </View>
        <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text.primary, textAlign: 'center' }}>No Workspace Yet</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateFamilyWorkspace')}
          style={{ backgroundColor: '#059669', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 16, flexDirection: 'row', gap: 8, alignItems: 'center' }}
        >
          <AntDesign name="plus" size={16} color="#FFF" />
          <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '700' }}>Create Workspace</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={loadWorkspace} tintColor="#059669" />}
      >
        <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.bg.card, alignItems: 'center', justifyContent: 'center' }}>
            <AntDesign name="arrowleft" size={18} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        <View style={{ alignItems: 'center', paddingHorizontal: 24, marginTop: 20, gap: 8 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: (workspace.coverColor || '#059669') + '20', alignItems: 'center', justifyContent: 'center' }}>
            <AntDesign name={(workspace.icon || 'team') as any} size={36} color={workspace.coverColor || '#059669'} />
          </View>
          <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text.primary }}>{workspace.name}</Text>
          {workspace.description && (
            <Text style={{ fontSize: 14, color: colors.text.tertiary, textAlign: 'center' }}>{workspace.description}</Text>
          )}
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: 28, gap: 12 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>Quick Actions</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {[
              { label: 'Household Expense', icon: 'minuscircle', color: '#059669', screen: 'AddExpense', params: { type: 'family' } },
              { label: 'Add Bill', icon: 'filetext1', color: '#F59E0B', screen: 'AddBill' },
              { label: 'Family Goal', icon: 'flag', color: '#3B82F6', screen: 'GoalsList' },
              { label: 'Allowance', icon: 'gift', color: '#8B5CF6', screen: 'SpacesDashboard' },
            ].map((action) => (
              <TouchableOpacity
                key={action.label}
                onPress={() => navigation.navigate('WalletTab', { screen: action.screen, params: action.params })}
                style={{ width: '48%', backgroundColor: colors.bg.card, borderRadius: 18, padding: 16, alignItems: 'center', gap: 8 }}
                activeOpacity={0.7}
              >
                <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: action.color + '15', alignItems: 'center', justifyContent: 'center' }}>
                  <AntDesign name={action.icon as any} size={22} color={action.color} />
                </View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text.primary, textAlign: 'center' }}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

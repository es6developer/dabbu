import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, Dimensions } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { spacing, borderRadius } from '../../theme/design';
import { api } from '../../services/api';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { UpgradeBanner } from '../../components/ui/UpgradeBanner';
import { useToast } from '../../store/ToastContext';

import { alertService } from "../../components/ui";
const { width: SCREEN_W } = Dimensions.get('window');

function fmt(v: number) {
  return `\u20B9${(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function fmtDate(d: string) {
  const dt = new Date(d);
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface IncomeCategory {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

interface IncomeEntry {
  id: string;
  source: string;
  amount: number;
  date: string;
  categoryId: string | null;
  category: IncomeCategory | null;
  assignedTo: string | null;
  creator: { id: string; firstName: string; lastName: string } | null;
}

export function CoupleIncomeScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [incomes, setIncomes] = useState<IncomeEntry[]>([]);
  const [categories, setCategories] = useState<IncomeCategory[]>([]);
  const [groupInfo, setGroupInfo] = useState<{
    id: string;
    partner1Id: string;
    partner2Id: string;
    partner1Name: string;
    partner2Name: string;
  } | null>(null);
  const { showToast } = useToast();

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) {
      setLoading(true);
    }
    try {
      const groups: any[] = await api.get('/shared-finance/groups');
      const coupleGroup = Array.isArray(groups)
        ? groups.find((g: any) => g.type === 'couple' && g.status === 'ACTIVE')
        : null;
      if (!coupleGroup) {
        setIncomes([]);
        setGroupInfo(null);
        return;
      }
      const groupId = coupleGroup.id;
      const dashboard = await api.get<any>(`/shared-finance/groups/${groupId}/couple/dashboard`);
      const profile = dashboard?.profile;
      let p1Name = 'Partner 1',
        p2Name = 'Partner 2',
        p1Id = 'p1',
        p2Id = 'p2';
      if (profile) {
        p1Name = profile.partner1?.firstName || profile.partner1?.email || 'Partner 1';
        p2Name = profile.partner2?.firstName || profile.partner2?.email || 'Partner 2';
        p1Id = profile.partner1?.id || 'p1';
        p2Id = profile.partner2?.id || 'p2';
      }
      setGroupInfo({
        id: groupId,
        partner1Id: p1Id,
        partner2Id: p2Id,
        partner1Name: p1Name,
        partner2Name: p2Name,
      });

      const catData = await api.get<any[]>('/categories?type=income');
      if (Array.isArray(catData)) {
        setCategories(catData);
      }

      const incomeResp = await api.get<any>(`/shared-finance/groups/${groupId}/couple/incomes`);
      const incomeList: IncomeEntry[] =
        incomeResp?.incomes || (Array.isArray(incomeResp) ? incomeResp : []);
      setIncomes(incomeList);
    } catch (e: any) {
      if (e.message !== 'Session expired. Please login again.') {
        alertService.alert('Error', e.message || 'Failed to load data');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
  const p1Income = incomes
    .filter((i) => i.assignedTo === groupInfo?.partner1Id)
    .reduce((sum, i) => sum + i.amount, 0);
  const p2Income = incomes
    .filter((i) => i.assignedTo === groupInfo?.partner2Id)
    .reduce((sum, i) => sum + i.amount, 0);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.primary }]}>
      <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack}>
          <AntDesign name="arrowleft" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Income</Text>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchData(true);
            }}
            tintColor={colors.accent.primary}
          />
        }
      >
        <View style={{ paddingHorizontal: 20, marginTop: 12 }}>
          <View style={[styles.summaryCard, { backgroundColor: '#FFEBB4' }]}>
            <Text style={styles.summaryTotalLabel}>Total Monthly Income</Text>
            <Text style={styles.summaryTotalAmount}>{fmt(totalIncome)}</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <View style={[styles.summaryDot, { backgroundColor: colors.accent.primary }]} />
                <Text style={styles.summaryPartnerLabel}>
                  {groupInfo?.partner1Name || 'Partner 1'}
                </Text>
                <Text style={styles.summaryPartnerAmount}>{fmt(p1Income)}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <View style={[styles.summaryDot, { backgroundColor: colors.accent.primary }]} />
                <Text style={styles.summaryPartnerLabel}>
                  {groupInfo?.partner2Name || 'Partner 2'}
                </Text>
                <Text style={styles.summaryPartnerAmount}>{fmt(p2Income)}</Text>
              </View>
            </View>
          </View>
        </View>

        <UpgradeBanner message="Premium analytics, reports & AI insights for couple finance" />

        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <TouchableOpacity
            style={styles.addBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('CoupleTransactionForm', { prefill: { groupId: groupInfo?.id, type: 'arrowdown' } })}
          >
            <AntDesign  name="pluscircleo" size={20} color="#FFF" />
            <Text style={styles.addBtnText}>Add Income</Text>
          </TouchableOpacity>
        </View>

        {incomes.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <AntDesign  name="wallet" size={52} color={colors.text.tertiary} />
            <Text style={[styles.emptyText, { color: colors.text.secondary, marginTop: 12 }]}>
              No income entries yet
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.text.tertiary }]}>
              Tap "Add Income" to get started
            </Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 20, marginTop: 20, gap: spacing.lg }}>
            {incomes.map((item) => {
              const cat = item.category;
              const iconName = cat?.icon || (item.categoryId ? 'wallet' : 'wallet');
              const catColor = cat?.color || colors.text.secondary;
              return (
                <View
                  key={item.id}
                  style={[styles.incomeCard, { backgroundColor: colors.bg.card }]}
                >
                  <View style={[styles.incomeIconWrap, { backgroundColor: `${catColor}18` }]}>
                    <AntDesign name={iconName as any} size={20} color={catColor} />
                  </View>
                  <View style={styles.incomeInfo}>
                    <Text style={[styles.incomeSource, { color: colors.text.primary }]}>
                      {item.source}
                    </Text>
                    {cat ? (
                      <Text style={[styles.incomeCategoryLabel, { color: catColor }]}>
                        {cat.name}
                      </Text>
                    ) : null}
                    <Text style={[styles.incomeDate, { color: colors.text.tertiary }]}>
                      {fmtDate(item.date)}
                    </Text>
                  </View>
                  <View style={styles.incomeRight}>
                    <Text style={[styles.incomeAmount, { color: colors.status.success }]}>
                      +{fmt(item.amount)}
                    </Text>
                    {groupInfo && (
                      <View
                        style={[
                          styles.partnerChip,
                          { backgroundColor: `${colors.accent.primary}18` },
                        ]}
                      >
                        <Text style={[styles.partnerChipText, { color: colors.accent.primary }]}>
                          {item.assignedTo === groupInfo.partner1Id
                            ? groupInfo.partner1Name
                            : groupInfo.partner2Name}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  headerBack: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },

  summaryCard: {
    borderRadius: 24,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryTotalLabel: { fontSize: 12, fontWeight: '600', color: '#F97316', letterSpacing: 0.3 },
  summaryTotalAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#F97316',
    letterSpacing: -1,
    marginTop: 4,
    marginBottom: 18,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center', gap: 4 },
  summaryDot: { width: 8, height: 8, borderRadius: 4 },
  summaryPartnerLabel: { fontSize: 11, fontWeight: '600', color: '#F97316', marginTop: 2 },
  summaryPartnerAmount: { fontSize: 16, fontWeight: '800', color: '#F97316' },
  summaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(93,56,181,0.15)',
    marginHorizontal: 12,
  },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F97316',
    paddingVertical: 16,
    borderRadius: 18,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  addBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  incomeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  incomeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  incomeInfo: { flex: 1, gap: 2 },
  incomeSource: { fontSize: 15, fontWeight: '700' },
  incomeCategoryLabel: { fontSize: 11, fontWeight: '600', marginTop: 1 },
  incomeDate: { fontSize: 11, fontWeight: '500', marginTop: 1 },
  incomeRight: { alignItems: 'flex-end', gap: 6 },
  incomeAmount: { fontSize: 16, fontWeight: '800' },
  partnerChip: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  partnerChipText: { fontSize: 10, fontWeight: '700' },

  emptyText: { fontSize: 17, fontWeight: '700' },
  emptySubtext: { fontSize: 13, marginTop: 4 },
});

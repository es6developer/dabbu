import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { DetailSkeleton } from '../../components/ui/AnimatedSkeleton';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../../store/ToastContext';
import { PADDING, borderRadius, shadows } from '../../theme/design';

function fmt(v: number) {
  return `\u20B9${(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

const categoryIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  Food: 'fast-food',
  Transport: 'car',
  Shopping: 'bag',
  Bills: 'document-text',
  Entertainment: 'film',
  Health: 'fitness',
  Education: 'school',
  Travel: 'airplane',
  Groceries: 'cart',
  Rent: 'home',
  Utilities: 'flash',
  Insurance: 'shield',
  Dining: 'restaurant',
  Other: 'ellipsis-horizontal',
};

export function BudgetDetailScreen() {
  const { colors } = useTheme();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const insets = useSafeAreaInsets();
  const { budgetId } = route.params || {};
  const [budget, setBudget] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const { showToast } = useToast();

  const loadBudget = useCallback(async () => {
    if (accessToken) {
      setAccessToken(accessToken);
    }
    try {
      const res = await api.get<any>(`/budgets/${budgetId}`);
      setBudget(res);
    } catch (e) {
      /* empty */
    } finally {
      setLoading(false);
    }
  }, [budgetId, accessToken]);

  useFocusEffect(
    useCallback(() => {
      loadBudget();
    }, [loadBudget]),
  );

  async function handleDelete() {
    Alert.alert('Delete Budget', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            if (accessToken) {
              setAccessToken(accessToken);
            }
            await api.delete(`/budgets/${budgetId}`);
            navigation.goBack();
            showToast('Budget deleted');
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to delete');
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={[s.loading, { backgroundColor: colors.bg.primary, paddingHorizontal: PADDING }]}>
        <DetailSkeleton />
      </View>
    );
  }
  if (!budget) {
    return (
      <View style={[s.loading, { backgroundColor: colors.bg.primary }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.status.error} />
        <Text
          style={{ fontSize: 16, fontWeight: '600', color: colors.status.error, marginTop: 12 }}
        >
          Budget not found
        </Text>
      </View>
    );
  }

  const spent = Number(budget.spent || budget._sum?.amount || 0);
  const limit = Number(budget.limit || budget.amount || 0);
  const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
  const remaining = Math.max(limit - spent, 0);
  const barColor = pct > 90 ? '#FF4D4F' : pct > 70 ? '#F59E0B' : '#34C759';
  const catName = budget.category?.name || budget.category || 'budget';

  return (
    <ScrollView style={[s.container, { backgroundColor: colors.bg.primary }]}>
      {/* Header */}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: PADDING, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: `${colors.accent.primary}10`,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="chevron-back" size={20} color={colors.accent.primary} />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text.primary, flex: 1 }}>
            Budget Details
          </Text>
          <TouchableOpacity
            onPress={handleDelete}
            disabled={deleting}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: `${colors.status.error}10`,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {deleting ? (
              <ActivityIndicator size="small" color={colors.status.error} />
            ) : (
              <Ionicons name="trash-outline" size={18} color={colors.status.error} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Hero Card */}
      <View
        style={{
          marginHorizontal: PADDING,
          borderRadius: borderRadius.xl,
          padding: 24,
          backgroundColor:
            barColor === '#FF4D4F'
              ? colors.card.expense
              : barColor === '#F59E0B'
                ? `${colors.status.warning}18`
                : colors.card.savings,
          marginBottom: 16,
          ...shadows.lg,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 16,
          }}
        >
          <View>
            <Text
              style={{
                fontSize: 20,
                fontWeight: '700',
                color: colors.text.primary,
                marginBottom: 2,
              }}
            >
              {budget.name || catName}
            </Text>
            <View
              style={{
                alignSelf: 'flex-start',
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 8,
                backgroundColor: `${colors.accent.primary}12`,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color: colors.accent.primary,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                {budget.period || 'Monthly'}
              </Text>
            </View>
          </View>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              backgroundColor: `${colors.accent.primary}12`,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons
              name={categoryIcons[catName] || 'wallet-outline'}
              size={22}
              color={colors.accent.primary}
            />
          </View>
        </View>

        <View
          style={{
            height: 14,
            backgroundColor: 'rgba(0,0,0,0.08)',
            borderRadius: 7,
            overflow: 'hidden',
            marginBottom: 12,
          }}
        >
          <View
            style={{ height: '100%', borderRadius: 7, width: `${pct}%`, backgroundColor: barColor }}
          />
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
          <View>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '600',
                color: colors.text.tertiary,
                letterSpacing: 0.3,
              }}
            >
              USED
            </Text>
            <Text
              style={{
                fontSize: 24,
                fontWeight: '800',
                color: colors.text.primary,
                letterSpacing: -0.5,
              }}
            >
              {Math.round(pct)}%
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '600',
                color: colors.text.tertiary,
                letterSpacing: 0.3,
              }}
            >
              STATUS
            </Text>
            <Text style={{ fontSize: 16, fontWeight: '700', color: barColor }}>
              {pct > 90 ? 'Over Budget' : pct > 70 ? 'Warning' : 'On Track'}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.04)',
              borderRadius: borderRadius.md,
              padding: 12,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '600',
                color: colors.text.tertiary,
                marginBottom: 4,
              }}
            >
              SPENT
            </Text>
            <Text style={{ fontSize: 18, fontWeight: '800', color: barColor }}>{fmt(spent)}</Text>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.04)',
              borderRadius: borderRadius.md,
              padding: 12,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '600',
                color: colors.text.tertiary,
                marginBottom: 4,
              }}
            >
              REMAINING
            </Text>
            <Text
              style={{
                fontSize: 18,
                fontWeight: '800',
                color: remaining > 0 ? '#34C759' : '#FF4D4F',
              }}
            >
              {fmt(remaining)}
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.04)',
              borderRadius: borderRadius.md,
              padding: 12,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '600',
                color: colors.text.tertiary,
                marginBottom: 4,
              }}
            >
              LIMIT
            </Text>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text.primary }}>
              {fmt(limit)}
            </Text>
          </View>
        </View>
      </View>

      {/* Details Section */}
      <View
        style={{
          marginHorizontal: PADDING,
          backgroundColor: colors.bg.card,
          borderRadius: borderRadius.lg,
          padding: 20,
          marginBottom: 16,
          ...shadows.sm,
        }}
      >
        <Text
          style={{ fontSize: 14, fontWeight: '700', color: colors.text.primary, marginBottom: 16 }}
        >
          Details
        </Text>
        {budget.category && (
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: 10,
              borderBottomWidth: 1,
              borderBottomColor: colors.border.subtle,
            }}
          >
            <Text style={{ fontSize: 14, color: colors.text.tertiary }}>Category</Text>
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 8,
                backgroundColor: `${colors.accent.primary}12`,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.accent.primary }}>
                {budget.category.name || budget.category}
              </Text>
            </View>
          </View>
        )}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: colors.border.subtle,
          }}
        >
          <Text style={{ fontSize: 14, color: colors.text.tertiary }}>Period</Text>
          <Text
            style={{
              fontSize: 14,
              fontWeight: '600',
              color: colors.text.primary,
              textTransform: 'capitalize',
            }}
          >
            {budget.period || 'Monthly'}
          </Text>
        </View>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: colors.border.subtle,
          }}
        >
          <Text style={{ fontSize: 14, color: colors.text.tertiary }}>Start Date</Text>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary }}>
            {new Date(budget.startDate).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
        </View>
        {budget.endDate && (
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: 10,
            }}
          >
            <Text style={{ fontSize: 14, color: colors.text.tertiary }}>End Date</Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary }}>
              {new Date(budget.endDate).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </Text>
          </View>
        )}
      </View>

      {/* Transactions */}
      {budget.transactions && budget.transactions.length > 0 && (
        <View
          style={{
            marginHorizontal: PADDING,
            backgroundColor: colors.bg.card,
            borderRadius: borderRadius.lg,
            padding: 20,
            marginBottom: 16,
            ...shadows.sm,
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: '700',
              color: colors.text.primary,
              marginBottom: 16,
            }}
          >
            Recent Transactions ({budget.transactions.length})
          </Text>
          {budget.transactions.map((txn: any, i: number) => (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 10,
                borderBottomWidth: i < budget.transactions.length - 1 ? 1 : 0,
                borderBottomColor: colors.border.subtle,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary }}
                  numberOfLines={1}
                >
                  {txn.description || 'Transaction'}
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '500',
                    color: colors.text.tertiary,
                    marginTop: 2,
                  }}
                >
                  {new Date(txn.date || txn.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '700',
                  color: txn.transactionType === 'credit' ? '#34C759' : '#FF4D4F',
                }}
              >
                {txn.transactionType === 'credit' ? '+' : '-'}
                {fmt(Number(txn.amount))}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Actions */}
      <View style={{ paddingHorizontal: PADDING, gap: 10, marginBottom: 40 }}>
        <TouchableOpacity
          style={{
            paddingVertical: 16,
            borderRadius: borderRadius.md,
            backgroundColor: colors.accent.primary,
            alignItems: 'center',
            ...shadows.md,
            shadowColor: colors.accent.primary,
          }}
          onPress={() => navigation.navigate('CreateBudget', { budget })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="create-outline" size={16} color="#FFF" />
            <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '700' }}>Edit Budget</Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

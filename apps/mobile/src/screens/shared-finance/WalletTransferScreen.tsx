import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { api } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { PageContainer } from '../../components/ui/PageContainer';
import { KeyboardAvoidingContainer } from '../../components/ui/KeyboardAvoidingContainer';

export function WalletTransferScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { accessToken } = useAuth();
  const { colors } = useTheme();
  const { fromWalletId, groupId } = route.params;

  const [wallets, setWallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetWalletId, setTargetWalletId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadWallets = useCallback(async () => {
    if (accessToken) {
      const res = await api.get<any>(`/shared-finance/groups/${groupId}/wallets`);
      const all = Array.isArray(res) ? res : [];
      setWallets(all.filter((w: any) => w.id !== fromWalletId));
    }
    setLoading(false);
  }, [groupId, accessToken, fromWalletId]);

  React.useEffect(() => {
    loadWallets();
  }, [loadWallets]);

  const handleTransfer = async () => {
    if (!targetWalletId || !amount) {
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/shared-finance/groups/${groupId}/wallets/${fromWalletId}/transfer`, {
        targetWalletId,
        amount: parseFloat(amount),
        description: description || undefined,
      });
      Alert.alert('Success', 'Transfer completed', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Transfer failed');
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = (v: number) => '₹' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

  return (
    <PageContainer noPadding>
      <KeyboardAvoidingContainer>
        <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text.primary }]}>Transfer Funds</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={{ padding: 16 }}>
            <Text style={[styles.sectionLabel, { color: colors.text.secondary }]}>
              Select destination wallet
            </Text>
          </View>

          {loading ? (
            <Text style={[styles.loadingText, { color: colors.text.tertiary }]}>
              Loading wallets...
            </Text>
          ) : (
            <FlatList
              data={wallets}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                  <Ionicons name="wallet-outline" size={40} color={colors.text.tertiary} />
                  <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>
                    No other wallets available
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.walletItem,
                    {
                      backgroundColor:
                        targetWalletId === item.id
                          ? `${colors.accent.primary}20`
                          : colors.bg.secondary,
                      borderColor:
                        targetWalletId === item.id ? colors.accent.primary : colors.border.subtle,
                    },
                  ]}
                  onPress={() => setTargetWalletId(item.id)}
                >
                  <LinearGradient
                    colors={[`${colors.accent.primary}25`, `${colors.accent.secondary}15`]}
                    style={styles.iconWrap}
                  >
                    <Ionicons name="wallet" size={22} color={colors.accent.primary} />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.walletName, { color: colors.text.primary }]}>
                      {item.name}
                    </Text>
                    <Text style={[styles.walletBal, { color: colors.accent.primary }]}>
                      {fmt(Number(item.balance))}
                    </Text>
                  </View>
                  {targetWalletId === item.id && (
                    <Ionicons name="checkmark-circle" size={22} color={colors.status.success} />
                  )}
                </TouchableOpacity>
              )}
              windowSize={10}
              maxToRenderPerBatch={10}
            />
          )}

          <View
            style={[
              styles.form,
              { backgroundColor: colors.bg.secondary, borderTopColor: colors.border.subtle },
            ]}
          >
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.bg.tertiary,
                  color: colors.text.primary,
                  borderColor: colors.border.subtle,
                },
              ]}
              placeholder="Amount"
              placeholderTextColor={colors.text.tertiary}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.bg.tertiary,
                  color: colors.text.primary,
                  borderColor: colors.border.subtle,
                },
              ]}
              placeholder="Description (optional)"
              placeholderTextColor={colors.text.tertiary}
              value={description}
              onChangeText={setDescription}
            />
            <TouchableOpacity
              style={[
                styles.transferBtn,
                {
                  backgroundColor:
                    targetWalletId && amount ? colors.accent.primary : colors.bg.tertiary,
                },
              ]}
              onPress={handleTransfer}
              disabled={!targetWalletId || !amount || submitting}
            >
              <Text style={styles.transferBtnText}>
                {submitting ? 'Transferring...' : 'Transfer'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingContainer>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 20, fontWeight: '800' },
  sectionLabel: { fontSize: 14, fontWeight: '600' },
  loadingText: { textAlign: 'center', marginTop: 60, fontSize: 14 },
  emptyText: { fontSize: 14, marginTop: 12 },
  walletItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletName: { fontSize: 15, fontWeight: '600' },
  walletBal: { fontSize: 16, fontWeight: '800', marginTop: 2 },
  form: { padding: 20, gap: 12, borderTopWidth: 1 },
  input: { height: 48, borderRadius: 12, paddingHorizontal: 16, fontSize: 15, borderWidth: 1 },
  transferBtn: {
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  transferBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});

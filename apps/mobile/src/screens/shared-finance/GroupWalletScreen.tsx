import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { api } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { PageContainer } from '../../components/ui/PageContainer';
import { KeyboardAvoidingContainer } from '../../components/ui/KeyboardAvoidingContainer';

export function GroupWalletScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { accessToken } = useAuth();
  const { colors } = useTheme();
  const groupId = route.params?.groupId;

  const [wallets, setWallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [walletName, setWalletName] = useState('');
  const [walletDesc, setWalletDesc] = useState('');
  const [selectedWallet, setSelectedWallet] = useState<any>(null);
  const [showContribute, setShowContribute] = useState(false);
  const [contributeAmount, setContributeAmount] = useState('');
  const [showSpend, setShowSpend] = useState(false);
  const [spendAmount, setSpendAmount] = useState('');
  const [spendDesc, setSpendDesc] = useState('');

  const loadWallets = useCallback(async () => {
    if (accessToken) {
      const res = await api.get<any>(`/shared-finance/groups/${groupId}/wallets`);
      setWallets(Array.isArray(res) ? res : []);
    }
    setLoading(false);
  }, [groupId, accessToken]);

  React.useEffect(() => {
    loadWallets();
  }, [loadWallets]);

  const createWallet = async () => {
    if (!walletName.trim()) {
      return;
    }
    await api.post(`/shared-finance/groups/${groupId}/wallets`, {
      name: walletName,
      description: walletDesc,
    });
    setShowCreate(false);
    setWalletName('');
    setWalletDesc('');
    loadWallets();
  };

  const contribute = async () => {
    if (!contributeAmount || !selectedWallet) {
      return;
    }
    await api.post(`/shared-finance/groups/${groupId}/wallets/${selectedWallet.id}/contribute`, {
      amount: parseFloat(contributeAmount),
    });
    setShowContribute(false);
    setContributeAmount('');
    loadWallets();
  };

  const spend = async () => {
    if (!spendAmount || !spendDesc || !selectedWallet) {
      return;
    }
    await api.post(`/shared-finance/groups/${groupId}/wallets/${selectedWallet.id}/spend`, {
      amount: parseFloat(spendAmount),
      description: spendDesc,
    });
    setShowSpend(false);
    setSpendAmount('');
    setSpendDesc('');
    loadWallets();
  };

  const toggleLock = async (walletId: string) => {
    await api.post(`/shared-finance/groups/${groupId}/wallets/${walletId}/toggle-lock`);
    loadWallets();
  };

  const fmt = (v: number) => '₹' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

  if (loading) {
    return (
      <PageContainer>
        <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
          <Text style={[styles.loadingText, { color: colors.text.tertiary }]}>
            Loading wallets...
          </Text>
        </View>
      </PageContainer>
    );
  }

  return (
    <PageContainer noPadding>
      <KeyboardAvoidingContainer>
        <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text.primary }]}>Group Wallets</Text>
            <TouchableOpacity
              onPress={() => setShowCreate(true)}
              style={[styles.addBtn, { backgroundColor: colors.accent.primary }]}
            >
              <Ionicons name="add" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={wallets}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, gap: 12 }}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingVertical: 60 }}>
                <Ionicons name="wallet-outline" size={48} color={colors.text.tertiary} />
                <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>
                  No wallets yet. Create one!
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.walletCard,
                  { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
                ]}
                onPress={() => setSelectedWallet(selectedWallet?.id === item.id ? null : item)}
                activeOpacity={0.7}
              >
                <View style={styles.walletHeader}>
                  <View
                    
                    style={styles.walletIcon}
                  >
                    <Ionicons
                      name={item.isLocked ? 'lock-closed' : 'wallet'}
                      size={24}
                      color={colors.accent.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.walletName, { color: colors.text.primary }]}>
                      {item.name}
                    </Text>
                    <Text style={[styles.walletBalance, { color: colors.accent.primary }]}>
                      {fmt(Number(item.balance))}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => toggleLock(item.id)} style={styles.lockBtn}>
                    <Ionicons
                      name={item.isLocked ? 'lock-closed' : 'lock-open'}
                      size={18}
                      color={item.isLocked ? colors.status.error : colors.text.tertiary}
                    />
                  </TouchableOpacity>
                </View>
                {item.description && (
                  <Text style={[styles.walletDesc, { color: colors.text.tertiary }]}>
                    {item.description}
                  </Text>
                )}
                {selectedWallet?.id === item.id && (
                  <View style={styles.walletActions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: `${colors.status.success}20` }]}
                      onPress={() => {
                        setSelectedWallet(item);
                        setShowContribute(true);
                      }}
                    >
                      <Ionicons name="add-circle" size={16} color={colors.status.success} />
                      <Text style={[styles.actionText, { color: colors.status.success }]}>
                        Contribute
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: `${colors.status.error}20` }]}
                      onPress={() => {
                        setSelectedWallet(item);
                        setShowSpend(true);
                      }}
                    >
                      <Ionicons name="remove-circle" size={16} color={colors.status.error} />
                      <Text style={[styles.actionText, { color: colors.status.error }]}>Spend</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: `${colors.accent.primary}20` }]}
                      onPress={() =>
                        navigation.navigate('WalletTransfer', { fromWalletId: item.id, groupId })
                      }
                    >
                      <Ionicons name="swap-horizontal" size={16} color={colors.accent.primary} />
                      <Text style={[styles.actionText, { color: colors.accent.primary }]}>
                        Transfer
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
                <Text style={[styles.memberCount, { color: colors.text.tertiary }]}>
                  {item._count?.transactions || 0} transactions
                </Text>
              </TouchableOpacity>
            )}
            windowSize={10}
            maxToRenderPerBatch={10}
          />

          {/* Create Wallet Modal */}
          {showCreate && (
            <View style={[styles.overlay]}>
              <View style={[styles.modal, { backgroundColor: colors.bg.secondary }]}>
                <Text style={[styles.modalTitle, { color: colors.text.primary }]}>New Wallet</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.bg.tertiary,
                      color: colors.text.primary,
                      borderColor: colors.border.subtle,
                    },
                  ]}
                  placeholder="Wallet name"
                  placeholderTextColor={colors.text.tertiary}
                  value={walletName}
                  onChangeText={setWalletName}
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
                  value={walletDesc}
                  onChangeText={setWalletDesc}
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity onPress={() => setShowCreate(false)} style={styles.cancelBtn}>
                    <Text style={[styles.cancelText, { color: colors.text.secondary }]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={createWallet}
                    style={[styles.confirmBtn, { backgroundColor: colors.accent.primary }]}
                  >
                    <Text style={styles.confirmText}>Create</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Contribute Modal */}
          {showContribute && (
            <View style={[styles.overlay]}>
              <View style={[styles.modal, { backgroundColor: colors.bg.secondary }]}>
                <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
                  Contribute to {selectedWallet?.name}
                </Text>
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
                  value={contributeAmount}
                  onChangeText={setContributeAmount}
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    onPress={() => setShowContribute(false)}
                    style={styles.cancelBtn}
                  >
                    <Text style={[styles.cancelText, { color: colors.text.secondary }]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={contribute}
                    style={[styles.confirmBtn, { backgroundColor: colors.status.success }]}
                  >
                    <Text style={styles.confirmText}>Add</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Spend Modal */}
          {showSpend && (
            <View style={[styles.overlay]}>
              <View style={[styles.modal, { backgroundColor: colors.bg.secondary }]}>
                <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
                  Spend from {selectedWallet?.name}
                </Text>
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
                  value={spendAmount}
                  onChangeText={setSpendAmount}
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
                  placeholder="Description"
                  placeholderTextColor={colors.text.tertiary}
                  value={spendDesc}
                  onChangeText={setSpendDesc}
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity onPress={() => setShowSpend(false)} style={styles.cancelBtn}>
                    <Text style={[styles.cancelText, { color: colors.text.secondary }]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={spend}
                    style={[styles.confirmBtn, { backgroundColor: colors.status.error }]}
                  >
                    <Text style={styles.confirmText}>Spend</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {styles as any}
        </View>
      </KeyboardAvoidingContainer>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: { fontSize: 22, fontWeight: '800' },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 8 },
  walletHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  walletIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletName: { fontSize: 16, fontWeight: '600' },
  walletBalance: { fontSize: 20, fontWeight: '800', marginTop: 2 },
  walletDesc: { fontSize: 13, lineHeight: 18 },
  lockBtn: { padding: 8 },
  walletActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionText: { fontSize: 13, fontWeight: '600' },
  memberCount: { fontSize: 11, marginTop: 4 },
  loadingText: { textAlign: 'center', marginTop: 100, fontSize: 15 },
  emptyText: { fontSize: 14, marginTop: 12 },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: { width: '100%', borderRadius: 20, padding: 24, gap: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  input: { height: 48, borderRadius: 12, paddingHorizontal: 16, fontSize: 15, borderWidth: 1 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 12 },
  cancelText: { fontSize: 15, fontWeight: '600' },
  confirmBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  confirmText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});

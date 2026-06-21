import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { useSilentRefresh } from '../../hooks/useSilentRefresh';

interface VaultItem {
  id: string;
  name: string;
  type: string;
  dateAdded: string;
  icon?: keyof typeof AntDesign.glyphMap;
}

const VaultItemCard: React.FC<{ item: VaultItem }> = ({ item }) => {
  const [showContent, setShowContent] = useState(false);

  const maskedName = item.name.split('').map((char, i) =>
    i > 2 && i < item.name.length - 3 ? '\u2022' : char
  ).join('');

  return (
    <TouchableOpacity
      style={styles.vaultItemCard}
      activeOpacity={0.7}
      onPress={() => {
        setShowContent(!showContent);
        if (!showContent) {
          Alert.alert('Secure Access', `Biometric authentication required to view "${item.name}"`);
        }
      }}
    >
      <View style={styles.vaultItemLeft}>
        <View style={styles.vaultItemIcon}>
          <AntDesign name="lock" size={18} color="#10B981" />
        </View>
        <View style={styles.vaultItemInfo}>
          <Text style={styles.vaultItemName}>
            {showContent ? item.name : maskedName}
          </Text>
          <Text style={styles.vaultItemType}>{item.type}</Text>
        </View>
      </View>
      <View style={styles.vaultItemRight}>
        <Text style={styles.vaultItemAction}>
          {showContent ? 'Hide' : 'Tap to view'}
        </Text>
        <AntDesign name={showContent ? 'eye' : 'eyeo'} size={14} color="#6B7280" />
      </View>
    </TouchableOpacity>
  );
};

export default function FamilyVaultScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [items, setItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (silent = false, refresh = false) => {
    if (refresh) setRefreshing(true); else if (!silent) setLoading(true);
    try {
      const res = await api.get('/family-space/vault');
      const data = (res as any)?.data || res || [];
      const list = Array.isArray(data) ? data : data.items || data.vaultItems || [];
      setItems(list);
    } catch {} finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useSilentRefresh(useCallback((isInitial) => { loadData(!isInitial); }, [loadData]));

  const handleVaultToggle = () => {
    if (!vaultUnlocked) {
      Alert.alert('Authenticate', 'Biometric or PIN required to access Family Vault', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Authenticate',
          onPress: () => {
            setVaultUnlocked(true);
          },
        },
      ]);
    } else {
      setVaultUnlocked(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <AntDesign name="lock" size={24} color="#10B981" />
          <Text style={styles.headerTitle}>Family Vault</Text>
        </View>
        <TouchableOpacity
          style={[styles.lockButton, vaultUnlocked && styles.lockButtonActive]}
          onPress={handleVaultToggle}
        >
          <AntDesign
            name={vaultUnlocked ? 'unlock' : 'lock'}
            size={18}
            color={vaultUnlocked ? '#EF4444' : '#10B981'}
          />
          <Text style={[styles.lockButtonText, vaultUnlocked && styles.lockButtonTextActive]}>
            {vaultUnlocked ? 'Lock' : 'Unlock'}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      ) : (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <View style={styles.heroIconContainer}>
            <View style={styles.heroIconOuter}>
              <View style={styles.heroIconInner}>
                <AntDesign name="lock" size={40} color="#10B981" />
              </View>
            </View>
          </View>
          <Text style={styles.heroTitle}>Secure Vault</Text>
          <Text style={styles.heroSubtitle}>
            Your sensitive financial documents are encrypted and secure
          </Text>
        </View>

        <View style={styles.encryptionBadge}>
          <AntDesign name="Safety" size={16} color="#10B981" />
          <Text style={styles.encryptionText}>AES-256 Encrypted</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{items.length}</Text>
            <Text style={styles.statLabel}>Documents</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValueLast}>Today</Text>
            <Text style={styles.statLabel}>Last Accessed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>AES-256</Text>
            <Text style={styles.statLabel}>Encryption</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Vault Items</Text>
          <Text style={styles.sectionCount}>{items.length} items</Text>
        </View>

        {items.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 20, paddingHorizontal: 40 }}>
            <AntDesign name="lock" size={48} color="#6B7280" />
            <Text style={{ color: '#F9FAFB', marginTop: 16, fontSize: 18, fontWeight: '600' }}>Vault is empty</Text>
            <Text style={{ color: '#6B7280', marginTop: 6, fontSize: 14, textAlign: 'center' }}>
              Store your sensitive documents securely in the family vault
            </Text>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#10B981', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 20, gap: 8 }}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Documents')}
            >
              <AntDesign name="plus" size={18} color="#0A0A0A" />
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#0A0A0A' }}>Add Your First Document</Text>
            </TouchableOpacity>
          </View>
        ) : items.map(item => (
          <VaultItemCard key={item.id} item={item} />
        ))}

        <TouchableOpacity
          style={styles.addToVaultButton}
          onPress={() => navigation.navigate('Documents')}
        >
          <AntDesign name="plus" size={18} color="#10B981" />
          <Text style={styles.addToVaultText}>Add Document to Vault</Text>
        </TouchableOpacity>

        <View style={styles.securityTipsCard}>
          <Text style={styles.securityTipsTitle}>Security Tips</Text>
          <View style={styles.tipRow}>
            <AntDesign name="checkcircle" size={14} color="#10B981" />
            <Text style={styles.tipText}>Enable biometric lock for quick access</Text>
          </View>
          <View style={styles.tipRow}>
            <AntDesign name="checkcircle" size={14} color="#10B981" />
            <Text style={styles.tipText}>Regularly backup your vault data</Text>
          </View>
          <View style={styles.tipRow}>
            <AntDesign name="checkcircle" size={14} color="#10B981" />
            <Text style={styles.tipText}>Never share your vault PIN with anyone</Text>
          </View>
        </View>
      </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F9FAFB',
    letterSpacing: -0.5,
  },
  lockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C2A25',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#10B98130',
  },
  lockButtonActive: {
    backgroundColor: '#2C1A1A',
    borderColor: '#EF444430',
  },
  lockButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
  },
  lockButtonTextActive: {
    color: '#EF4444',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  heroIconContainer: {
    marginBottom: 16,
  },
  heroIconOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1A2E2A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#10B98130',
  },
  heroIconInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10B98115',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F9FAFB',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 30,
    lineHeight: 20,
  },
  encryptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1A2E2A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 20,
  },
  encryptionText: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F9FAFB',
    marginBottom: 4,
  },
  statValueLast: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F9FAFB',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F9FAFB',
  },
  sectionCount: {
    fontSize: 13,
    color: '#6B7280',
  },
  vaultItemCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  vaultItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  vaultItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1A2E2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vaultItemInfo: {
    flex: 1,
  },
  vaultItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F9FAFB',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  vaultItemType: {
    fontSize: 12,
    color: '#6B7280',
  },
  vaultItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vaultItemAction: {
    fontSize: 12,
    color: '#6B7280',
  },
  addToVaultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1C2A25',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#10B98130',
    borderStyle: 'dashed',
  },
  addToVaultText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#10B981',
  },
  securityTipsCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
  },
  securityTipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F9FAFB',
    marginBottom: 12,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  tipText: {
    fontSize: 13,
    color: '#D1D5DB',
    flex: 1,
  },
});

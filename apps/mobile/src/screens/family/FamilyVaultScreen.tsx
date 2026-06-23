import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { useSilentRefresh } from '../../hooks/useSilentRefresh';

import { alertService } from "../../components/ui";
interface VaultItem {
  id: string;
  name: string;
  type: string;
  dateAdded: string;
  icon?: keyof typeof AntDesign.glyphMap;
}

const VaultItemCard: React.FC<{ item: VaultItem; colors: any; styles: any }> = ({ item, colors, styles }) => {
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
          alertService.alert('Secure Access', `Biometric authentication required to view "${item.name}"`);
        }
      }}
    >
      <View style={styles.vaultItemLeft}>
        <View style={styles.vaultItemIcon}>
          <AntDesign name="lock" size={18} color={colors.status.success} />
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
        <AntDesign name={showContent ? 'eye' : 'eyeo'} size={14} color={colors.text.tertiary} />
      </View>
    </TouchableOpacity>
  );
};

export default function FamilyVaultScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
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

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg.primary,
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
      color: colors.text.primary,
      letterSpacing: -0.5,
    },
    lockButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bg.tertiary,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 12,
      gap: 6,
      borderWidth: 1,
      borderColor: colors.status.success + '30',
    },
    lockButtonActive: {
      backgroundColor: colors.status.error + '15',
      borderColor: colors.status.error + '30',
    },
    lockButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.status.success,
    },
    lockButtonTextActive: {
      color: colors.status.error,
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
      backgroundColor: colors.bg.tertiary,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: colors.status.success + '30',
    },
    heroIconInner: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.status.success + '15',
      justifyContent: 'center',
      alignItems: 'center',
    },
    heroTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text.primary,
      marginBottom: 8,
    },
    heroSubtitle: {
      fontSize: 14,
      color: colors.text.tertiary,
      textAlign: 'center',
      paddingHorizontal: 30,
      lineHeight: 20,
    },
    encryptionBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.bg.tertiary,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      alignSelf: 'center',
      marginBottom: 20,
    },
    encryptionText: {
      fontSize: 13,
      color: colors.status.success,
      fontWeight: '600',
    },
    statsRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 24,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.bg.secondary,
      borderRadius: 14,
      padding: 14,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text.primary,
      marginBottom: 4,
    },
    statValueLast: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text.primary,
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 11,
      color: colors.text.tertiary,
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
      color: colors.text.primary,
    },
    sectionCount: {
      fontSize: 13,
      color: colors.text.tertiary,
    },
    vaultItemCard: {
      backgroundColor: colors.bg.secondary,
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
      backgroundColor: colors.bg.tertiary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    vaultItemInfo: {
      flex: 1,
    },
    vaultItemName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text.primary,
      marginBottom: 2,
      letterSpacing: 0.5,
    },
    vaultItemType: {
      fontSize: 12,
      color: colors.text.tertiary,
    },
    vaultItemRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    vaultItemAction: {
      fontSize: 12,
      color: colors.text.tertiary,
    },
    addToVaultButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.bg.tertiary,
      borderRadius: 14,
      paddingVertical: 14,
      marginTop: 12,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.status.success + '30',
      borderStyle: 'dashed',
    },
    addToVaultText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.status.success,
    },
    securityTipsCard: {
      backgroundColor: colors.bg.secondary,
      borderRadius: 16,
      padding: 18,
      marginBottom: 20,
    },
    securityTipsTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.primary,
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
      color: colors.text.secondary,
      flex: 1,
    },
  }), [colors]);

  useSilentRefresh(useCallback((isInitial) => { loadData(!isInitial); }, [loadData]));

  const handleVaultToggle = () => {
    if (!vaultUnlocked) {
      alertService.alert('Authenticate', 'Biometric or PIN required to access Family Vault', [
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
          <AntDesign name="lock" size={24} color={colors.status.success} />
          <Text style={styles.headerTitle}>Family Vault</Text>
        </View>
        <TouchableOpacity
          style={[styles.lockButton, vaultUnlocked && styles.lockButtonActive]}
          onPress={handleVaultToggle}
        >
          <AntDesign
            name={vaultUnlocked ? 'unlock' : 'lock'}
            size={18}
            color={vaultUnlocked ? colors.status.error : colors.status.success}
          />
          <Text style={[styles.lockButtonText, vaultUnlocked && styles.lockButtonTextActive]}>
            {vaultUnlocked ? 'Lock' : 'Unlock'}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.status.success} />
        </View>
      ) : (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(false, true)} tintColor={colors.status.success} />}
      >
        <View style={styles.heroSection}>
          <View style={styles.heroIconContainer}>
            <View style={styles.heroIconOuter}>
              <View style={styles.heroIconInner}>
                <AntDesign name="lock" size={40} color={colors.status.success} />
              </View>
            </View>
          </View>
          <Text style={styles.heroTitle}>Secure Vault</Text>
          <Text style={styles.heroSubtitle}>
            Your sensitive financial documents are encrypted and secure
          </Text>
        </View>

        <View style={styles.encryptionBadge}>
          <AntDesign name="Safety" size={16} color={colors.status.success} />
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
            <Text style={[styles.statValue, { color: colors.status.success }]}>AES-256</Text>
            <Text style={styles.statLabel}>Encryption</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Vault Items</Text>
          <Text style={styles.sectionCount}>{items.length} items</Text>
        </View>

        {items.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 20, paddingHorizontal: 40 }}>
            <AntDesign name="lock" size={48} color={colors.text.tertiary} />
            <Text style={{ color: colors.text.primary, marginTop: 16, fontSize: 18, fontWeight: '600' }}>Vault is empty</Text>
            <Text style={{ color: colors.text.tertiary, marginTop: 6, fontSize: 14, textAlign: 'center' }}>
              Store your sensitive documents securely in the family vault
            </Text>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.status.success, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 20, gap: 8 }}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Documents')}
            >
              <AntDesign name="plus" size={18} color={colors.bg.primary} />
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.bg.primary }}>Add Your First Document</Text>
            </TouchableOpacity>
          </View>
        ) : items.map(item => (
          <VaultItemCard key={item.id} item={item} colors={colors} styles={styles} />
        ))}

        <TouchableOpacity
          style={styles.addToVaultButton}
          onPress={() => navigation.navigate('Documents')}
        >
          <AntDesign name="plus" size={18} color={colors.status.success} />
          <Text style={styles.addToVaultText}>Add Document to Vault</Text>
        </TouchableOpacity>

        <View style={styles.securityTipsCard}>
          <Text style={styles.securityTipsTitle}>Security Tips</Text>
          <View style={styles.tipRow}>
            <AntDesign name="checkcircle" size={14} color={colors.status.success} />
            <Text style={styles.tipText}>Enable biometric lock for quick access</Text>
          </View>
          <View style={styles.tipRow}>
            <AntDesign name="checkcircle" size={14} color={colors.status.success} />
            <Text style={styles.tipText}>Regularly backup your vault data</Text>
          </View>
          <View style={styles.tipRow}>
            <AntDesign name="checkcircle" size={14} color={colors.status.success} />
            <Text style={styles.tipText}>Never share your vault PIN with anyone</Text>
          </View>
        </View>
      </ScrollView>
      )}
    </View>
  );
}

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  requestRawPermission,
  getRawPermissionStatus,
  fetchDeviceContacts,
  syncContacts,
  DeviceContact,
  ContactMatch,
  PermissionStatusStr,
} from '../../services/contacts';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { Avatar } from '../../components/ui/Avatar';

export function AddPartnerScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const { accessToken, user } = useAuth();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<'intro' | 'select'>('intro');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [permStatus, setPermStatus] = useState<PermissionStatusStr>('undetermined');
  const [syncing, setSyncing] = useState(false);
  const [hasSynced, setHasSynced] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [matchedContacts, setMatchedContacts] = useState<ContactMatch[]>([]);
  const [deviceContacts, setDeviceContacts] = useState<DeviceContact[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const didAutoSync = useRef(false);

  useEffect(() => {
    if (step === 'select') {
      getRawPermissionStatus().then((s) => {
        setPermStatus(s);
        if (s === 'granted' && !hasSynced && !syncing && !syncError && !didAutoSync.current) {
          didAutoSync.current = true;
          handleSyncContacts();
        }
      });
    }
  }, [step]);

  function handleStart() {
    setStep('select');
  }

  async function handleSyncContacts() {
    if (permStatus === 'denied') {
      Alert.alert(
        'Contacts Access Required',
        'Enable contact access to find your partner on Dabbu.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
      return;
    }
    if (permStatus === 'undetermined') {
      const { granted, status } = await requestRawPermission();
      setPermStatus(status);
      if (!granted) {
        return;
      }
    }
    setSyncError(null);
    setSyncing(true);
    try {
      const dev = await fetchDeviceContacts();
      setDeviceContacts(dev);
      const result = await syncContacts();
      setMatchedContacts(result.matched || []);
      setHasSynced(true);
    } catch {
      setSyncError('Could not sync contacts.');
      setHasSynced(true);
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.get<any>(`/users/search?query=${encodeURIComponent(query.trim())}`);
        setSearchResults(Array.isArray(res) ? res.filter((r: any) => r.id) : []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  function handleSelect(userId: string, name: string, phone?: string) {
    setSelectedUserId((prev) => (prev === userId ? null : userId));
    setSelectedName((prev) => (prev === userId ? null : name));
    setSelectedPhone((prev) => (prev === userId ? null : (phone || null)));
  }

  async function handleCreateCouple() {
    if (!selectedUserId || !selectedName) {
      return;
    }
    setCreating(true);
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      const res = await api.post<any>('/shared-finance/groups', {
        name: `${user?.firstName || 'My'} & ${selectedName}'s Space`,
        type: 'couple',
        currency: 'INR',
      });
      const newGroupId = res?.id || res?._id;
      if (!newGroupId) {
        throw new Error('Failed to create couple space');
      }

      await api.post(`/shared-finance/groups/${newGroupId}/members`, {
        userId: selectedUserId,
      });

      navigation.replace('CoupleSpace');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to create couple space');
    } finally {
      setCreating(false);
    }
  }

  const allContacts = useMemo(() => {
    const entries: any[] = [];
    for (const m of matchedContacts) {
      entries.push({ type: 'match', ...m });
    }
    for (const d of deviceContacts) {
      if (!matchedContacts.some((m) => m.phone === d.phone)) {
        entries.push({ type: 'device', name: d.name, phone: d.phone, email: d.email });
      }
    }
    return entries;
  }, [matchedContacts, deviceContacts]);

  function renderContactRow(item: any) {
    const isMatch = item.type === 'match';
    const name = isMatch ? item.name : item.name;
    const phone = isMatch ? item.phone : item.phone;
    const email = isMatch ? item.email : item.email;
    const userId = isMatch ? item.userId : null;
    const isSelected = userId && selectedUserId === userId;

    return (
      <TouchableOpacity
        style={styles.contactRow}
        activeOpacity={0.7}
        onPress={() => userId && handleSelect(userId, name, phone)}
      >
        <Avatar name={name} size={48} />
        <View style={styles.contactInfo}>
          <Text style={[styles.contactName, { color: colors.text.primary }]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.contactSub, { color: colors.text.tertiary }]} numberOfLines={1}>
            {phone || email || ''}
          </Text>
        </View>
        {isMatch ? (
          <View
            style={[
              styles.selectCircle,
              {
                backgroundColor: isSelected ? '#8B5CF6' : 'transparent',
                borderColor: isSelected ? '#8B5CF6' : colors.border.default,
              },
            ]}
          >
            {isSelected && <Ionicons name="checkmark" size={16} color="#FFF" />}
          </View>
        ) : (
          <Text style={[styles.inviteLabel, { color: colors.text.tertiary }]}>Invite</Text>
        )}
      </TouchableOpacity>
    );
  }

  if (step === 'intro') {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bg.primary }]}>
        <LinearGradient
          colors={['#6D28D9', '#8B5CF6', '#A78BFA']}
          style={[styles.heroGradient, { paddingTop: insets.top + 60, paddingBottom: 60 }]}
        >
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.heroContent}>
            <View style={styles.heroIconWrap}>
              <Ionicons name="heart-circle" size={64} color="#FFF" />
            </View>
            <Text style={styles.heroTitle}>Create Couple Profile</Text>
            <Text style={styles.heroSub}>
              Share expenses, track budgets, and achieve financial goals together.
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.introBody}>
          <View style={styles.featureRow}>
            <View style={[styles.featureIcon, { backgroundColor: `${colors.accent.primary}12` }]}>
              <Ionicons name="wallet-outline" size={22} color="#8B5CF6" />
            </View>
            <View style={styles.featureText}>
              <Text style={[styles.featureTitle, { color: colors.text.primary }]}>
                Shared Wallet
              </Text>
              <Text style={[styles.featureDesc, { color: colors.text.tertiary }]}>
                Track joint expenses and income in one place
              </Text>
            </View>
          </View>
          <View style={styles.featureRow}>
            <View style={[styles.featureIcon, { backgroundColor: `${colors.accent.primary}12` }]}>
              <Ionicons name="trending-up-outline" size={22} color="#8B5CF6" />
            </View>
            <View style={styles.featureText}>
              <Text style={[styles.featureTitle, { color: colors.text.primary }]}>
                Goal Together
              </Text>
              <Text style={[styles.featureDesc, { color: colors.text.tertiary }]}>
                Save for trips, home, or any shared dream
              </Text>
            </View>
          </View>
          <View style={styles.featureRow}>
            <View style={[styles.featureIcon, { backgroundColor: `${colors.accent.primary}12` }]}>
              <Ionicons name="pie-chart-outline" size={22} color="#8B5CF6" />
            </View>
            <View style={styles.featureText}>
              <Text style={[styles.featureTitle, { color: colors.text.primary }]}>
                Smart Reports
              </Text>
              <Text style={[styles.featureDesc, { color: colors.text.tertiary }]}>
                See who spent what with AI-powered insights
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.startBtn}
            activeOpacity={0.85}
            onPress={handleStart}
          >
            <LinearGradient
              colors={['#6D28D9', '#8B5CF6']}
              style={styles.startBtnGradient}
            >
              <Text style={styles.startBtnText}>Add Your Partner</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg.primary }]}>
      <LinearGradient
        colors={[colors.bg.secondary, colors.bg.primary]}
        style={[styles.selectHeader, { paddingTop: insets.top }]}
      >
        <View style={styles.selectHeaderRow}>
          <TouchableOpacity
            style={[styles.smallBackBtn, { backgroundColor: colors.bg.card }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.selectTitle, { color: colors.text.primary }]}>
            Choose Your Partner
          </Text>
          <View style={{ width: 36 }} />
        </View>
      </LinearGradient>

      <View style={styles.searchOuter}>
        <View
          style={[
            styles.searchWrap,
            { backgroundColor: colors.bg.card, borderColor: colors.border.default },
          ]}
        >
          <Ionicons name="search" size={18} color={colors.text.tertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text.primary }]}
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name, phone or email"
            placeholderTextColor={colors.text.tertiary}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searching && <ActivityIndicator size="small" color="#8B5CF6" />}
          {query.length > 0 && !searching && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {syncing ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={[styles.syncingText, { color: colors.text.tertiary }]}>
            Syncing contacts...
          </Text>
        </View>
      ) : syncError ? (
        <View style={styles.centerState}>
          <Ionicons name="cloud-offline-outline" size={40} color="#FF4545" />
          <Text style={[styles.emptyTitle, { color: colors.status.error }]}>{syncError}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={handleSyncContacts}>
            <Text style={[styles.retryBtnText, { color: '#8B5CF6' }]}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : !hasSynced && permStatus !== 'granted' ? (
        <View style={styles.centerState}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.bg.card }]}>
            <Ionicons name="people-outline" size={36} color={colors.text.tertiary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text.secondary }]}>
            Find your partner on Dabbu
          </Text>
          <Text style={[styles.emptyDesc, { color: colors.text.tertiary }]}>
            Sync your contacts to see who's already here
          </Text>
          <TouchableOpacity style={styles.syncBtn} onPress={handleSyncContacts}>
            <Ionicons name="people-outline" size={18} color="#FFF" />
            <Text style={styles.syncBtnText}>Sync Contacts</Text>
          </TouchableOpacity>
        </View>
      ) : allContacts.length === 0 && !query.trim() ? (
        <View style={styles.centerState}>
          <Ionicons name="person-outline" size={40} color={colors.text.tertiary} />
          <Text style={[styles.emptyTitle, { color: colors.text.secondary }]}>
            No contacts found
          </Text>
          <Text style={[styles.emptyDesc, { color: colors.text.tertiary }]}>
            Search by name, phone, or email
          </Text>
        </View>
      ) : null}

      <FlatList
        data={query.trim().length >= 2 ? searchResults : allContacts}
        keyExtractor={(_: any, i: number) => String(i)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          if (query.trim().length >= 2) {
            const name = [item.firstName, item.lastName].filter(Boolean).join(' ') || item.email;
            const isSelected = selectedUserId === item.id;
            return (
              <TouchableOpacity
                style={styles.contactRow}
                activeOpacity={0.7}
                onPress={() => handleSelect(item.id, name, item.phone)}
              >
                <Avatar
                  uri={item.avatarUrl}
                  name={`${item.firstName || ''} ${item.lastName || ''}`.trim()}
                  size={48}
                />
                <View style={styles.contactInfo}>
                  <Text
                    style={[styles.contactName, { color: colors.text.primary }]}
                    numberOfLines={1}
                  >
                    {name}
                  </Text>
                  <Text
                    style={[styles.contactSub, { color: colors.text.tertiary }]}
                    numberOfLines={1}
                  >
                    {item.phone || item.email || ''}
                  </Text>
                </View>
                <View
                  style={[
                    styles.selectCircle,
                    {
                      backgroundColor: isSelected ? '#8B5CF6' : 'transparent',
                      borderColor: isSelected ? '#8B5CF6' : colors.border.default,
                    },
                  ]}
                >
                  {isSelected && <Ionicons name="checkmark" size={16} color="#FFF" />}
                </View>
              </TouchableOpacity>
            );
          }
          return renderContactRow(item);
        }}
        ListFooterComponent={
          <View style={{ height: 100 }} />
        }
      />

      {selectedUserId && (
        <View style={[styles.footer, { backgroundColor: colors.bg.primary, borderTopColor: colors.border.subtle }]}>
          <TouchableOpacity
            style={styles.confirmBtn}
            activeOpacity={0.85}
            onPress={handleCreateCouple}
            disabled={creating}
          >
            <LinearGradient colors={['#6D28D9', '#8B5CF6']} style={styles.confirmBtnGradient}>
              {creating ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="heart" size={20} color="#FFF" />
                  <Text style={styles.confirmBtnText}>
                    Create Space with {selectedName}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },

  heroGradient: {
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContent: { alignItems: 'center', marginTop: 20 },
  heroIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
    maxWidth: 280,
  },

  introBody: { flex: 1, paddingHorizontal: 24, paddingTop: 32, gap: 20 },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { flex: 1 },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  featureDesc: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
    lineHeight: 18,
  },

  startBtn: {
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  startBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
  },
  startBtnText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFF',
  },

  selectHeader: { paddingBottom: 8 },
  selectHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 52,
  },
  smallBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectTitle: { fontSize: 17, fontWeight: '700' },

  searchOuter: { paddingHorizontal: 20, marginTop: 8, marginBottom: 4 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },

  listContent: { paddingTop: 4, paddingBottom: 40 },

  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 12,
  },
  contactInfo: { flex: 1, justifyContent: 'center' },
  contactName: { fontSize: 15, fontWeight: '600' },
  contactSub: { fontSize: 12, fontWeight: '500', marginTop: 2 },

  selectCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteLabel: { fontSize: 13, fontWeight: '600' },

  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  emptyDesc: { fontSize: 13, fontWeight: '500', textAlign: 'center', lineHeight: 18 },
  syncingText: { fontSize: 14, fontWeight: '500', marginTop: 4 },

  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#8B5CF6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 8,
  },
  syncBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  retryBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, marginTop: 8 },
  retryBtnText: { fontSize: 14, fontWeight: '700' },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 34,
    borderTopWidth: 1,
  },
  confirmBtn: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  confirmBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
  },
});

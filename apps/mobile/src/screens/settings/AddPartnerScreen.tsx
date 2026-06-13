import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme';
import { useAuth } from '../../store/AuthContext';
import { Avatar } from '../../components/ui/Avatar';
import { COUPLE_COLORS } from '../../hooks/useCoupleMode';

export function AddPartnerScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const {
    user,
    sendCoupleRequest,
    approveCoupleRequest,
    rejectCoupleRequest,
    cancelCoupleRequest,
    fetchCoupleRequests,
    removePartner,
  } = useAuth();
  const insets = useSafeAreaInsets();

  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);
  const [requests, setRequests] = useState<{ sent: any[]; received: any[] }>({
    sent: [],
    received: [],
  });
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  const isInCouple = !!user?.isCouple;
  const partner = user?.partner || null;
  const partnerName = partner
    ? `${partner.firstName || ''} ${partner.lastName || ''}`.trim() || partner.email
    : '';
  const linkedAt = user?.partnerLinkedAt
    ? new Date(user.partnerLinkedAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';

  const loadRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const res = await fetchCoupleRequests();
      setRequests(res);
    } catch {
      // ignore
    } finally {
      setLoadingRequests(false);
    }
  }, [fetchCoupleRequests]);

  useEffect(() => {
    if (!isInCouple) {
      loadRequests();
    }
  }, [isInCouple, loadRequests]);

  async function handleSendRequest() {
    const trimmed = phone.trim().replace(/[^0-9]/g, '');
    if (!trimmed || trimmed.length < 10) {
      Alert.alert('Error', "Please enter your partner's valid phone number");
      return;
    }
    setSending(true);
    try {
      await sendCoupleRequest(trimmed);
      Alert.alert('Request Sent!', 'Your partner will need to approve the request.', [
        { text: 'OK', onPress: () => loadRequests() },
      ]);
      setPhone('');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to send request');
    } finally {
      setSending(false);
    }
  }

  async function handleApprove(requestId: string) {
    setProcessingId(requestId);
    try {
      await approveCoupleRequest(requestId);
      Alert.alert('Connected!', "You're in a couple! Couple Mode is active.", [
        { text: 'Go to Home', onPress: () => navigation.navigate('Dashboard') },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to approve request');
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject(requestId: string) {
    setProcessingId(requestId);
    try {
      await rejectCoupleRequest(requestId);
      loadRequests();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to reject request');
    } finally {
      setProcessingId(null);
    }
  }

  async function handleCancel(requestId: string) {
    setProcessingId(requestId);
    try {
      await cancelCoupleRequest(requestId);
      loadRequests();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to cancel request');
    } finally {
      setProcessingId(null);
    }
  }

  function handleRemovePartner() {
    Alert.alert(
      'Remove Partner',
      'This will break the couple relationship. Shared data will not be deleted.\n\nAre you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setRemoving(true);
            try {
              await removePartner();
              Alert.alert('Removed', 'Couple relationship has been removed.');
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Failed to remove partner');
            } finally {
              setRemoving(false);
            }
          },
        },
      ],
    );
  }

  if (isInCouple && partner) {
    return (
      <View style={[styles.screen, { backgroundColor: COUPLE_COLORS.bg }]}>
        <LinearGradient
          colors={[COUPLE_COLORS.primary, COUPLE_COLORS.accent]}
          style={[styles.heroGradient, { paddingTop: insets.top + 60, paddingBottom: 40 }]}
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
              <Ionicons name="heart" size={48} color="#FFF" />
            </View>
            <Text style={[styles.heroTitle, { color: '#FFF' }]}>Your Partner</Text>
          </View>
        </LinearGradient>

        <ScrollView style={styles.body}>
          <View style={[styles.partnerCard, { backgroundColor: COUPLE_COLORS.card }]}>
            <View style={styles.avatarRow}>
              <Avatar name={user.firstName || 'You'} size={56} />
              <View style={styles.heartSmall}>
                <Ionicons name="heart" size={20} color={COUPLE_COLORS.heart} />
              </View>
              <Avatar name={partnerName} size={56} />
            </View>
            <Text style={[styles.partnerNames, { color: COUPLE_COLORS.text }]}>
              {user.firstName || 'You'} & {partnerName}
            </Text>
            <View style={[styles.infoRow, { borderTopColor: `${COUPLE_COLORS.border}80` }]}>
              <Ionicons name="mail-outline" size={16} color={COUPLE_COLORS.textSecondary} />
              <Text style={[styles.infoText, { color: COUPLE_COLORS.textSecondary }]}>
                {partner.email}
              </Text>
            </View>
            {linkedAt && (
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={16} color={COUPLE_COLORS.textSecondary} />
                <Text style={[styles.infoText, { color: COUPLE_COLORS.textSecondary }]}>
                  Together since {linkedAt}
                </Text>
              </View>
            )}
          </View>

          <View style={[styles.statusCard, { backgroundColor: COUPLE_COLORS.card }]}>
            <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusLabel, { color: COUPLE_COLORS.text }]}>Couple Mode</Text>
              <Text style={[styles.statusSub, { color: COUPLE_COLORS.textSecondary }]}>
                Active — Pink theme enabled on Home
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.removeBtn}
            activeOpacity={0.7}
            onPress={handleRemovePartner}
            disabled={removing}
          >
            {removing ? (
              <ActivityIndicator size="small" color="#FF4757" />
            ) : (
              <>
                <Ionicons name="heart-dislike-outline" size={20} color="#FF4757" />
                <Text style={styles.removeText}>Remove Partner</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.screen, { backgroundColor: colors.bg.primary }]}>
      <LinearGradient
        colors={['#6D28D9', '#8B5CF6', '#A78BFA']}
        style={[styles.heroGradient, { paddingTop: insets.top + 60, paddingBottom: 50 }]}
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
            <Ionicons name="heart-circle" size={56} color="#FFF" />
          </View>
          <Text style={[styles.heroTitle, { color: '#FFF' }]}>Add Your Partner</Text>
          <Text style={[styles.heroSub, { color: 'rgba(255,255,255,0.85)' }]}>
            Enter your partner's phone number to send a request
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.bodyInner}>
        {/* Incoming Requests */}
        {loadingRequests ? (
          <ActivityIndicator size="small" color="#8B5CF6" style={{ marginVertical: 16 }} />
        ) : requests.received.length > 0 ? (
          <View style={[styles.section, { backgroundColor: colors.bg.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Pending Requests ({requests.received.length})
            </Text>
            {requests.received
              .filter((r: any) => r.status === 'pending')
              .map((req: any) => (
                <View key={req.id} style={styles.requestCard}>
                  <Avatar
                    name={`${req.sender.firstName || ''} ${req.sender.lastName || ''}`}
                    size={40}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.requestName, { color: colors.text.primary }]}>
                      {req.sender.firstName || 'Someone'} wants to connect!
                    </Text>
                    <Text style={[styles.requestPhone, { color: colors.text.tertiary }]}>
                      {req.sender.phone || req.sender.email || ''}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      style={styles.approveBtn}
                      onPress={() => handleApprove(req.id)}
                      disabled={processingId === req.id}
                    >
                      {processingId === req.id ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Ionicons name="checkmark" size={20} color="#FFF" />
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() => handleReject(req.id)}
                      disabled={processingId === req.id}
                    >
                      <Ionicons name="close" size={20} color="#FF4757" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
          </View>
        ) : null}

        {/* Send Request Form */}
        <View style={[styles.phoneCard, { backgroundColor: colors.bg.card }]}>
          <Text style={[styles.phoneLabel, { color: colors.text.primary }]}>
            Partner's Phone Number
          </Text>
          <TextInput
            style={[
              styles.phoneInput,
              {
                backgroundColor: colors.bg.primary,
                color: colors.text.primary,
                borderColor: colors.border.default,
              },
            ]}
            value={phone}
            onChangeText={setPhone}
            placeholder="9876543210"
            placeholderTextColor={colors.text.tertiary}
            keyboardType="phone-pad"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.addBtn, { opacity: sending ? 0.7 : 1 }]}
            activeOpacity={0.85}
            onPress={handleSendRequest}
            disabled={sending}
          >
            <LinearGradient colors={['#6D28D9', '#8B5CF6']} style={styles.addBtnGradient}>
              {sending ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="heart" size={20} color="#FFF" />
                  <Text style={styles.addBtnText}>Send Request</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Sent Requests */}
        {requests.sent.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.bg.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Sent Requests</Text>
            {requests.sent.map((req: any) => (
              <View key={req.id} style={styles.requestCard}>
                <Avatar
                  name={`${req.receiver.firstName || ''} ${req.receiver.lastName || ''}`}
                  size={40}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.requestName, { color: colors.text.primary }]}>
                    {req.receiver.firstName || 'Unknown'} —{' '}
                    {req.status === 'pending'
                      ? 'Waiting for approval'
                      : req.status === 'approved'
                        ? 'Approved'
                        : 'Rejected'}
                  </Text>
                  <Text style={[styles.requestPhone, { color: colors.text.tertiary }]}>
                    {req.receiver.phone || req.receiver.email || ''}
                  </Text>
                </View>
                {req.status === 'pending' && (
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => handleCancel(req.id)}
                    disabled={processingId === req.id}
                  >
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Features */}
        <View style={styles.featuresList}>
          {[
            { icon: 'wallet-outline', text: 'Share expenses and track together' },
            { icon: 'trending-up-outline', text: 'Save for shared goals' },
            { icon: 'pie-chart-outline', text: 'Get AI-powered couple insights' },
          ].map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Ionicons name={f.icon as any} size={18} color="#8B5CF6" />
              <Text style={[styles.featureText, { color: colors.text.secondary }]}>{f.text}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
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
  heroContent: { alignItems: 'center', marginTop: 16 },
  heroIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: { fontSize: 26, fontWeight: '800', textAlign: 'center' },
  heroSub: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    maxWidth: 260,
  },

  body: { flex: 1, paddingHorizontal: 24, paddingTop: 24, gap: 20 },
  bodyInner: { paddingHorizontal: 24, paddingTop: 24, gap: 20, paddingBottom: 40 },

  section: {
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  requestName: {
    fontSize: 14,
    fontWeight: '700',
  },
  requestPhone: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  approveBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FF475720',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FF475740',
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FF475710',
    borderWidth: 1,
    borderColor: '#FF475730',
  },
  cancelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF4757',
  },

  phoneCard: {
    borderRadius: 20,
    padding: 20,
    gap: 14,
  },
  phoneLabel: { fontSize: 14, fontWeight: '700' },
  phoneInput: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    fontWeight: '500',
  },
  addBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 4 },
  addBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  addBtnText: { fontSize: 16, fontWeight: '800', color: '#FFF' },

  featuresList: { gap: 14, paddingHorizontal: 4, paddingBottom: 24 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureText: { fontSize: 14, fontWeight: '500', flex: 1 },

  partnerCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  heartSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${COUPLE_COLORS.heart}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerNames: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: 1,
    width: '100%',
  },
  infoText: { fontSize: 14, fontWeight: '500' },

  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    padding: 16,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusLabel: { fontSize: 15, fontWeight: '700' },
  statusSub: { fontSize: 12, fontWeight: '500', marginTop: 1 },

  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#FF475710',
    borderWidth: 1,
    borderColor: '#FF475730',
  },
  removeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF4757',
  },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
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
  const { colors, isDark } = useTheme();
  const { user, addPartner, removePartner } = useAuth();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [adding, setAdding] = useState(false);
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

  async function handleAddPartner() {
    const trimmed = email.trim();
    if (!trimmed) {
      Alert.alert('Error', 'Please enter your partner\'s email');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }
    setAdding(true);
    try {
      await addPartner(trimmed);
      Alert.alert('Connected!', 'You are now in a couple. Couple Mode is active.', [
        { text: 'Go to Home', onPress: () => navigation.navigate('Dashboard') },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to add partner');
    } finally {
      setAdding(false);
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

        <View style={styles.body}>
          <View style={[styles.partnerCard, { backgroundColor: COUPLE_COLORS.card }]}>
            <View style={styles.avatarRow}>
              <Avatar name={user.firstName || 'You'} size={56} />
              <View style={styles.heartSmall}>
                <Ionicons name="heart" size={20} color={COUPLE_COLORS.heart} />
              </View>
              <Avatar name={partnerName} size={56} />
            </View>
            <Text style={[styles.partnerNames, { color: COUPLE_COLORS.text }]}>
              {(user.firstName || 'You')} & {partnerName}
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
              <Text style={[styles.statusLabel, { color: COUPLE_COLORS.text }]}>
                Couple Mode
              </Text>
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
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg.primary }]}>
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
            Enter your partner's email to create a couple space
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.body}>
        <View style={[styles.emailCard, { backgroundColor: colors.bg.card }]}>
          <Text style={[styles.emailLabel, { color: colors.text.primary }]}>
            Partner's Email
          </Text>
          <TextInput
            style={[
              styles.emailInput,
              {
                backgroundColor: colors.bg.primary,
                color: colors.text.primary,
                borderColor: colors.border.default,
              },
            ]}
            value={email}
            onChangeText={setEmail}
            placeholder="partner@email.com"
            placeholderTextColor={colors.text.tertiary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.addBtn, { opacity: adding ? 0.7 : 1 }]}
            activeOpacity={0.85}
            onPress={handleAddPartner}
            disabled={adding}
          >
            <LinearGradient colors={['#6D28D9', '#8B5CF6']} style={styles.addBtnGradient}>
              {adding ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="heart" size={20} color="#FFF" />
                  <Text style={styles.addBtnText}>Connect with Partner</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

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
  heroSub: { fontSize: 14, fontWeight: '500', textAlign: 'center', marginTop: 8, lineHeight: 20, maxWidth: 260 },

  body: { flex: 1, paddingHorizontal: 24, paddingTop: 24, gap: 20 },

  emailCard: {
    borderRadius: 20,
    padding: 20,
    gap: 14,
  },
  emailLabel: { fontSize: 14, fontWeight: '700' },
  emailInput: {
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

  featuresList: { gap: 14, paddingHorizontal: 4 },
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

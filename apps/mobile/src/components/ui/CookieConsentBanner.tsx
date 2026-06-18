import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { spacing, borderRadius } from '../../theme/design';
import { api } from '../../services/api';

const COOKIE_CONSENT_KEY = 'dabbu_cookie_consent';

const COOKIE_CATEGORIES = [
  { key: 'necessary', label: 'Necessary', description: 'Essential for the app to function', required: true },
  { key: 'analytics', label: 'Analytics', description: 'Help us improve the app with usage data' },
  { key: 'marketing', label: 'Marketing', description: 'Personalized offers and recommendations' },
];

export function CookieConsentBanner() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [preferences, setPreferences] = useState<Record<string, boolean>>({
    necessary: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    AsyncStorage.getItem(COOKIE_CONSENT_KEY).then((val) => {
      if (!val) setVisible(true);
    });
  }, []);

  const saveConsent = async (consent: 'accepted' | 'rejected', categories?: string[]) => {
    const cats = categories || Object.keys(preferences).filter((k) => preferences[k]);
    await AsyncStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({ consent, categories: cats }));
    try {
      await api.post('/compliance/cookie-consent', { consent, categories: cats });
    } catch {}
    setVisible(false);
  };

  const acceptAll = () => {
    const all = Object.fromEntries(COOKIE_CATEGORIES.map((c) => [c.key, true]));
    setPreferences(all);
    saveConsent('accepted', Object.keys(all));
  };

  const rejectAll = () => {
    const minimal = { necessary: true, analytics: false, marketing: false };
    setPreferences(minimal);
    saveConsent('rejected', ['necessary']);
  };

  const saveCustom = () => {
    const cats = Object.keys(preferences).filter((k) => preferences[k]);
    saveConsent('accepted', cats);
  };

  if (!visible) return null;

  if (!showCustomize) {
    return (
      <BlurView intensity={20} tint="dark" style={styles.bannerOuter}>
        <View style={[styles.banner, { backgroundColor: colors.bg.card, paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.bannerContent}>
            <AntDesign name="infocirlceo" size={20} color={colors.accent.primary} />
            <View style={styles.bannerText}>
              <Text style={[styles.bannerTitle, { color: colors.text.primary }]}>
                We value your privacy
              </Text>
              <Text style={[styles.bannerDesc, { color: colors.text.secondary }]}>
                We use cookies to enhance your experience. By accepting, you agree to our{' '}
                <Text style={[styles.link, { color: colors.accent.primary }]} onPress={() => Linking.openURL('/privacy')}>
                  Privacy Policy
                </Text>.
              </Text>
            </View>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity style={[styles.btn, { backgroundColor: colors.bg.tertiary }]} onPress={rejectAll}>
              <Text style={[styles.btnText, { color: colors.text.primary }]}>Reject All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, { backgroundColor: colors.bg.tertiary }]} onPress={() => setShowCustomize(true)}>
              <Text style={[styles.btnText, { color: colors.text.primary }]}>Customize</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnPrimary, { backgroundColor: colors.accent.primary }]} onPress={acceptAll}>
              <Text style={[styles.btnText, styles.btnPrimaryText]}>Accept All</Text>
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    );
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={() => setShowCustomize(false)}>
      <BlurView intensity={20} tint="dark" style={styles.modalOverlay}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowCustomize(false)}>
          <Pressable style={[styles.modal, { backgroundColor: colors.bg.card }]} onPress={() => {}}>
            <View style={styles.handleBar} />
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Cookie Preferences</Text>
            <Text style={[styles.modalDesc, { color: colors.text.secondary }]}>
              Choose which cookies to allow. Necessary cookies are always enabled.
            </Text>

            {COOKIE_CATEGORIES.map((cat) => (
              <View key={cat.key} style={[styles.catRow, { borderBottomColor: colors.border.subtle }]}>
                <View style={styles.catInfo}>
                  <Text style={[styles.catLabel, { color: colors.text.primary }]}>{cat.label}</Text>
                  <Text style={[styles.catDesc, { color: colors.text.secondary }]}>{cat.description}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    if (cat.required) return;
                    setPreferences((p) => ({ ...p, [cat.key]: !p[cat.key] }));
                  }}
                  style={[styles.toggle, {
                    backgroundColor: preferences[cat.key] ? colors.accent.primary : colors.bg.tertiary,
                    opacity: cat.required ? 0.5 : 1,
                  }]}
                >
                  <View style={[styles.toggleKnob, {
                    transform: [{ translateX: preferences[cat.key] ? 14 : 0 }],
                    backgroundColor: preferences[cat.key] ? '#fff' : colors.text.tertiary,
                  }]} />
                </TouchableOpacity>
              </View>
            ))}

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.btn, { backgroundColor: colors.bg.tertiary }]} onPress={rejectAll}>
                <Text style={[styles.btnText, { color: colors.text.primary }]}>Reject All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnPrimary, { backgroundColor: colors.accent.primary }]} onPress={saveCustom}>
                <Text style={[styles.btnText, styles.btnPrimaryText]}>Save Preferences</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.privacyLink} onPress={() => Linking.openURL('/privacy')}>
              <Text style={[styles.link, { color: colors.accent.primary }]}>View Privacy Policy</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bannerOuter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  banner: {
    borderTopLeftRadius: borderRadius['3xl'],
    borderTopRightRadius: borderRadius['3xl'],
    padding: spacing.lg,
    paddingTop: spacing.lg,
  },
  bannerContent: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  bannerDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  link: {
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {},
  btnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  btnPrimaryText: {
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: borderRadius['4xl'],
    borderTopRightRadius: borderRadius['4xl'],
    padding: spacing['2xl'],
    paddingBottom: spacing['5xl'],
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#3A3A3C',
    borderRadius: 10,
    marginBottom: spacing.lg,
    alignSelf: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  modalDesc: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing['2xl'],
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  catInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  catLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  catDesc: {
    fontSize: 13,
  },
  toggle: {
    width: 36,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleKnob: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing['2xl'],
  },
  privacyLink: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
});

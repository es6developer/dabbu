import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { createInviteLink } from '../../services/external-sharing';

export function ExternalSplitLinkScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const groupId = route.params?.groupId;
  const [link, setLink] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!groupId) {
      setLink('dabbu.app/split/ABCD123');
      setLoading(false);
      return;
    }
    setLoading(true);
    createInviteLink(groupId)
      .then((res) => {
        setLink(res.deepLinkUrl || `dabbu.app/split/${res.shortCode || res.token}`);
      })
      .catch((e) => {
        setError('Failed to generate link. Please try again.');
        setLink('dabbu.app/split/ABCD123');
      })
      .finally(() => setLoading(false));
  }, [groupId]);

  async function handleShare() {
    try {
      await Share.share({
        message: `Split expenses with me on Dabbu!\n\nOpen this link to join the split: ${link}`,
        url: link.startsWith('http') ? link : `https://${link}`,
      });
    } catch (e) {
      // ignore
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.primary }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View
          style={{
            paddingTop: insets.top + 12,
            paddingBottom: 28,
            paddingHorizontal: 20,
            backgroundColor: colors.bg.primary,
          }}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: colors.bg.tertiary }]}>
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text.primary }]}>External Split Link</Text>
            <View style={{ width: 32 }} />
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 12, gap: 12 }}>
          <View style={[styles.card, { backgroundColor: colors.bg.card }]}>
            <View style={[styles.iconWrap, { backgroundColor: colors.bg.secondary }]}>
              <Ionicons name="link-outline" size={32} color={colors.accent.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text.primary }]}>Share Expense Link</Text>
            <Text style={[styles.desc, { color: colors.text.tertiary }]}>
              Generate a public link that anyone can open to view and join this split. No app
              installation required.
            </Text>
          </View>

          {loading ? (
            <View style={[styles.card, { backgroundColor: colors.bg.card, padding: 24 }]}>
              <ActivityIndicator size="small" color={colors.accent.primary} />
              <Text style={[styles.desc, { color: colors.text.tertiary, marginTop: 8 }]}>
                Generating your link...
              </Text>
            </View>
          ) : (
            <>
              <View
                style={[
                  styles.linkCard,
                  { backgroundColor: colors.bg.tertiary, borderColor: colors.border.default },
                ]}
              >
                <View style={styles.linkHeader}>
                  <Ionicons name="globe-outline" size={16} color={colors.accent.primary} />
                  <Text style={[styles.linkLabel, { color: colors.accent.primary }]}>
                    Public Link
                  </Text>
                </View>
                <Text style={[styles.linkText, { color: colors.accent.primary }]} selectable>
                  {link}
                </Text>
              </View>

              {error ? (
                <Text style={{ color: '#FF4D4F', fontSize: 12, textAlign: 'center' }}>{error}</Text>
              ) : null}

              <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.85}>
                <View style={styles.shareBtnGrad}>
                  <Ionicons name="share-outline" size={18} color="#FFF" />
                  <Text style={[styles.shareBtnText, { color: colors.text.primary }]}>
                    Share Link
                  </Text>
                </View>
              </TouchableOpacity>
            </>
          )}

          <View style={[styles.infoCard, { backgroundColor: colors.bg.card }]}>
            <Text style={[styles.infoTitle, { color: colors.text.primary }]}>How it works</Text>
            {[
              { icon: 'link', text: 'Generate a unique public link for any expense' },
              { icon: 'globe', text: 'Share via WhatsApp, SMS, or any app' },
              { icon: 'person-add', text: 'Recipients open the link and enter their amount' },
              {
                icon: 'checkmark-circle',
                text: 'They join the split instantly - no account needed',
              },
            ].map((item, i) => (
              <View key={i} style={styles.infoRow}>
                <Ionicons
                  name={`${item.icon}-outline` as any}
                  size={16}
                  color={colors.accent.primary}
                />
                <Text style={[styles.infoText, { color: colors.text.secondary }]}>{item.text}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  card: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  desc: { fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 8 },
  linkCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 8 },
  linkHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  linkLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  linkText: { fontSize: 16, fontWeight: '600', letterSpacing: 0.3 },
  shareBtn: { borderRadius: 16, overflow: 'hidden' },
  shareBtnGrad: {
    flexDirection: 'row',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  shareBtnText: { fontSize: 16, fontWeight: '700' },
  infoCard: {
    borderRadius: 20,
    padding: 18,
    gap: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  infoTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoText: { fontSize: 13, fontWeight: '500', flex: 1, lineHeight: 18 },
});

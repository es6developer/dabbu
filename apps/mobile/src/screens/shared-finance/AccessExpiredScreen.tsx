import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AccessExpiredScreenProps {
  route?: {
    params?: {
      reason?: string;
      groupName?: string;
    };
  };
  navigation?: any;
}

export function AccessExpiredScreen({ route, navigation }: AccessExpiredScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reason = route?.params?.reason || 'This invite is no longer active.';
  const groupName = route?.params?.groupName;

  return (
    <View
      style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.bg.primary }]}
    >
      <View style={styles.content}>
        <View
          
          style={styles.iconWrap}
        >
          <Ionicons name="lock-closed-outline" size={52} color={colors.status.error} />
        </View>

        <Text style={[styles.title, { color: colors.text.primary }]}>Access Expired</Text>

        {groupName && (
          <Text style={[styles.groupName, { color: colors.text.secondary }]}>{groupName}</Text>
        )}

        <Text style={[styles.reason, { color: colors.text.tertiary }]}>{reason}</Text>

        <Text style={[styles.description, { color: colors.text.tertiary }]}>
          You no longer have access to this group. This could be because you were removed, the group
          has been closed or archived, or the invite link has expired.
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.accent.primary }]}
            onPress={() => Linking.openURL('https://dabbu.app')}
            activeOpacity={0.8}
          >
            <Ionicons name="download-outline" size={18} color="#FFF" />
            <Text style={styles.primaryBtnText}>Install Dabbu App</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: colors.border.subtle }]}
            onPress={() => {
              if (navigation) {
                navigation.navigate('SharedFinanceHome');
              }
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh-outline" size={18} color={colors.accent.primary} />
            <Text style={[styles.secondaryBtnText, { color: colors.accent.primary }]}>
              Request Access Again
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tertiaryBtn]}
            onPress={() => {
              if (navigation) {
                navigation.getParent()?.navigate('Settings');
              }
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.tertiaryBtnText, { color: colors.text.secondary }]}>
              Contact Group Admin
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.footer, { borderTopColor: colors.border.subtle }]}>
        <Ionicons name="shield-checkmark-outline" size={16} color={colors.text.tertiary} />
        <Text style={[styles.footerText, { color: colors.text.tertiary }]}>
          Your data is secure. No group information was exposed.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  iconWrap: {
    width: 104,
    height: 104,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center' },
  groupName: { fontSize: 15, fontWeight: '600', textAlign: 'center', marginTop: -8 },
  reason: { fontSize: 14, fontWeight: '500', textAlign: 'center', lineHeight: 20 },
  description: { fontSize: 13, textAlign: 'center', lineHeight: 20, paddingHorizontal: 8 },
  actions: { width: '100%', gap: 12, marginTop: 16 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '600' },
  tertiaryBtn: { alignItems: 'center', paddingVertical: 12 },
  tertiaryBtnText: { fontSize: 14, fontWeight: '500' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderTopWidth: 1,
  },
  footerText: { fontSize: 11, textAlign: 'center' },
});

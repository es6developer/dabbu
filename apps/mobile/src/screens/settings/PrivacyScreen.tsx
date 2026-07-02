import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { spacing, borderRadius, shadows } from '../../theme/design';
import { useToast } from '../../store/ToastContext';

import { alertService } from "../../components/ui";
export function PrivacyScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const { showToast } = useToast();
  const [deleting, setDeleting] = useState(false);

  function handleDeleteAccount() {
    alertService.alert(
      'Delete Account',
      'This action is irreversible. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: () => {
            alertService.alert('Confirm Deletion', 'Type DELETE to confirm', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'DELETE', style: 'destructive',
                onPress: async () => {
                  setDeleting(true);
                  try {
                    await api.post('/compliance/delete-account');
                    showToast('Profile deleted');
                    await logout();
                  } catch (e: any) {
                    alertService.alert('Error', e.message || 'Failed to delete account');
                  } finally {
                    setDeleting(false);
                  }
                },
              },
            ]);
          },
        },
      ],
    );
  }

  const sections = [
    {
      title: 'Data & Privacy',
      icon: 'Safety' as const,
      items: [
        { label: 'Privacy Policy', icon: 'filetext1' as const, onPress: () => navigation.navigate('Privacy') },
        { label: 'Data Export', icon: 'clouddownloado' as const, onPress: () => navigation.navigate('DataExport') },
      ],
    },
    {
      title: 'Permissions',
      icon: 'setting' as const,
      items: [
        { label: 'SMS Data Collection', icon: 'message1' as const, subtitle: 'Used to auto-track expenses from SMS', toggle: true, on: true },
        { label: 'Contact Sync', icon: 'team' as const, subtitle: 'Find friends using Dabbu', toggle: true, on: true },
        { label: 'Analytics & Insights', icon: 'barschart' as const, subtitle: 'Help us improve your experience', toggle: true, on: true },
      ],
    },
  ];

  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary }]}>
      <LinearGradient
        colors={isDark ? ['#1A0A2E', colors.bg.primary] : ['#F0E6FF', colors.bg.primary]}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} locations={[0, 0.3]}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 32, paddingTop: insets.top + 12 }}>
          <View style={{ paddingHorizontal: spacing['2xl'], marginBottom: 28 }}>
            <Text style={[s.pageTitle, { color: colors.text.primary }]}>Privacy & Security</Text>
            <Text style={[s.pageSubtitle, { color: colors.text.tertiary }]}>Manage your data, permissions, and account</Text>
          </View>

          {sections.map((section, si) => (
            <View key={si} style={{ marginHorizontal: spacing['2xl'], marginBottom: 24 }}>
              <View style={[s.sectionCard, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
                <LinearGradient
                  colors={isDark ? [colors.accent.primary + '06', 'transparent'] : [colors.accent.primary + '04', 'transparent']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: borderRadius['2xl'] }}
                />
                <Text style={[s.sectionTitle, { color: colors.text.tertiary }]}>{section.title}</Text>
                {section.items.map((item: any, ii) => (
                  <TouchableOpacity
                    key={ii}
                    style={[s.row, ii < section.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border.subtle }]}
                    onPress={item.onPress}
                    activeOpacity={item.toggle ? 1 : 0.7}
                    disabled={item.toggle}
                  >
                    <View style={[s.rowIcon, { backgroundColor: colors.accent.primary + '12' }]}>
                      <AntDesign name={item.icon} size={16} color={colors.accent.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.rowLabel, { color: colors.text.primary }]}>{item.label}</Text>
                      {item.subtitle ? <Text style={[s.rowSub, { color: colors.text.tertiary }]}>{item.subtitle}</Text> : null}
                    </View>
                    {item.toggle ? (
                      <View style={[s.toggle, { backgroundColor: item.on ? '#16A34A' : colors.border.subtle }]}>
                        <View style={[s.toggleDot, { backgroundColor: '#FFF', alignSelf: item.on ? 'flex-end' : 'flex-start' }]} />
                      </View>
                    ) : (
                      <AntDesign name="right" size={14} color={colors.text.tertiary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          {/* Account Deletion */}
          <View style={{ marginHorizontal: spacing['2xl'], marginBottom: 44 }}>
            <View style={[s.dangerCard, { backgroundColor: colors.bg.card, borderColor: `${colors.status.error}20` }]}>
              <LinearGradient
                colors={['transparent', colors.status.error + '06']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: borderRadius['2xl'] }}
              />
              <View style={s.dangerHeader}>
                <View style={[s.dangerIcon, { backgroundColor: colors.status.error + '12' }]}>
                  <AntDesign name="warning" size={18} color={colors.status.error} />
                </View>
                <Text style={[s.dangerTitle, { color: colors.status.error }]}>Delete Account</Text>
              </View>
              <Text style={[s.dangerDesc, { color: colors.text.tertiary }]}>
                Once you delete your account, there is no going back. All your financial data, goals, and connections will be permanently removed.
              </Text>
              <TouchableOpacity
                style={[s.deleteBtn, { borderColor: `${colors.status.error}30`, backgroundColor: `${colors.status.error}08` }]}
                onPress={handleDeleteAccount} disabled={deleting} activeOpacity={0.7}
              >
                {deleting ? (
                  <ActivityIndicator color={colors.status.error} />
                ) : (
                  <>
                    <AntDesign name="delete" size={16} color={colors.status.error} />
                    <Text style={[s.deleteBtnText, { color: colors.status.error }]}>Delete My Account</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  pageTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginBottom: 6 },
  pageSubtitle: { fontSize: 16, fontWeight: '500', lineHeight: 24 },
  sectionCard: { borderRadius: borderRadius['2xl'], borderWidth: 1.5, padding: spacing.xl, ...shadows.sm, overflow: 'hidden' },
  sectionTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: spacing.sm, paddingLeft: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 18 },
  rowIcon: { width: 36, height: 36, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 16, fontWeight: '600' },
  rowSub: { fontSize: 12, fontWeight: '500', marginTop: 1, lineHeight: 15 },
  toggle: { width: 44, height: 26, borderRadius: 28, padding: 3, justifyContent: 'center' },
  toggleDot: { width: 20, height: 20, borderRadius: 24 },
  dangerCard: { borderRadius: borderRadius['2xl'], borderWidth: 1.5, padding: spacing.xl, ...shadows.sm, overflow: 'hidden' },
  dangerHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  dangerIcon: { width: 36, height: 36, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  dangerTitle: { fontSize: 16, fontWeight: '700' },
  dangerDesc: { fontSize: 16, fontWeight: '500', lineHeight: 19, marginBottom: 20 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 18, borderRadius: borderRadius.md, borderWidth: 1.5 },
  deleteBtnText: { fontSize: 16, fontWeight: '700' },
});

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { spacing, borderRadius } from '../../theme/design';
import { api } from '../../services/api';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { alertService } from "../../components/ui";
export function GdprDataScreen() {
  const { colors } = useTheme();
  const theme = { background: colors.bg.primary, text: colors.text.primary, card: colors.bg.card, subtext: colors.text.secondary, muted: colors.text.tertiary, primary: colors.accent.primary, border: colors.border.subtle };
  const insets = useSafeAreaInsets();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showFinalConfirm, setShowFinalConfirm] = useState(false);
  const [grievance, setGrievance] = useState<{name: string; email: string; responseTime: string; resolutionTime: string} | null>(null);
  const [loadingGrievance, setLoadingGrievance] = useState(false);

  const handleDownloadData = async () => {
    setExporting(true);
    try {
      const res = await api.post<any>('/compliance/export?format=json', { includes: ['transactions', 'goals', 'bills', 'accounts', 'budgets', 'settings', 'streaks'] });
      const data = res.data || res;
      if (data) {
        const jsonStr = JSON.stringify(data, null, 2);
        const filename = `dabbu-gdpr-export-${new Date().toISOString().split('T')[0]}.json`;
        const path = `${FileSystem.documentDirectory}${filename}`;
        await FileSystem.writeAsStringAsync(path, jsonStr);
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(path, { mimeType: 'application/json' });
        }
      }
      alertService.alert('Export Complete', 'Your data has been exported successfully under GDPR Article 20 (Right to Data Portability).');
    } catch (err: any) {
      alertService.alert('Export Failed', err?.response?.data?.message || err.message);
    } finally {
      setExporting(false);
    }
  };

  const handleRequestDeletion = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDeletionRequest = async () => {
    setShowDeleteConfirm(false);
    setDeleting(true);
    try {
      await api.post('/compliance/delete-account');
      alertService.alert(
        'Deletion Scheduled',
        'Your account deletion has been scheduled. You have a 7-day grace period to cancel this request. A confirmation email has been sent to your registered email.',
      );
    } catch (err: any) {
      alertService.alert('Error', err?.response?.data?.message || err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleCcpaOptOut = async () => {
    try {
      await api.post('/compliance/ccpa-opt-out');
      alertService.alert('Opt-Out Complete', 'You have opted out of any potential data sale under CCPA. Dabbu does not sell your personal information.');
    } catch (err: any) {
      alertService.alert('Error', err?.response?.data?.message || err.message);
    }
  };

  const fetchGrievanceOfficer = async () => {
    setLoadingGrievance(true);
    try {
      const res = await api.get<any>('/compliance/grievance-officer');
      setGrievance(res.data || res);
    } catch {
      // silently fail
    } finally {
      setLoadingGrievance(false);
    }
  };

  const handlePermanentDelete = () => {
    setShowFinalConfirm(true);
  };

  const confirmPermanentDelete = async () => {
    setShowFinalConfirm(false);
    setDeleting(true);
    try {
      await api.delete('/compliance/account');
      alertService.alert('Account Deleted', 'Your account and all associated data have been permanently erased under GDPR Article 17 (Right to Erasure).');
    } catch (err: any) {
      alertService.alert('Error', err?.response?.data?.message || err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Privacy & Compliance</Text>
        <Text style={[styles.headerSub, { color: theme.subtext }]}>GDPR, CCPA & Indian compliance rights</Text>
      </View>

      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <View style={[styles.iconWrap, { backgroundColor: `${colors.accent.primary}20` }]}>
          <AntDesign name="download" size={24} color={colors.accent.primary} />
        </View>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Download My Data</Text>
        <Text style={[styles.cardDesc, { color: theme.subtext }]}>
          Exercise your GDPR Article 20 right to data portability. Download all your personal data in JSON format.
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.accent.primary, opacity: exporting ? 0.6 : 1 }]}
          onPress={handleDownloadData}
          disabled={exporting}
        >
          {exporting ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Download My Data</Text>}
        </TouchableOpacity>
      </View>

      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <View style={[styles.iconWrap, { backgroundColor: '#ef444120' }]}>
          <AntDesign name="delete" size={24} color="#ef4444" />
        </View>
        <Text style={[styles.cardTitle, { color: '#ef4444' }]}>Delete My Account</Text>
        <Text style={[styles.cardDesc, { color: theme.subtext }]}>
          Request account deletion with a 7-day grace period (GDPR Article 17 - Right to Erasure). You can cancel anytime during the grace period.
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#ef4444', opacity: deleting ? 0.6 : 1 }]}
          onPress={handleRequestDeletion}
          disabled={deleting}
        >
          {deleting ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Request Account Deletion</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.buttonOutline, { borderColor: '#ef4444', marginTop: spacing.sm }]}
          onPress={handlePermanentDelete}
        >
          <Text style={[styles.buttonOutlineText, { color: '#ef4444' }]}>Permanently Delete Now</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Data Retention Policy</Text>
        <View style={styles.policyRow}>
          <AntDesign name="clockcircleo" size={14} color={theme.subtext} />
          <Text style={[styles.policyText, { color: theme.subtext }]}>Transactions: Retained until account deletion</Text>
        </View>
        <View style={styles.policyRow}>
          <AntDesign name="clockcircleo" size={14} color={theme.subtext} />
          <Text style={[styles.policyText, { color: theme.subtext }]}>Analytics events: 90 days</Text>
        </View>
        <View style={styles.policyRow}>
          <AntDesign name="clockcircleo" size={14} color={theme.subtext} />
          <Text style={[styles.policyText, { color: theme.subtext }]}>Audit logs: 3 years</Text>
        </View>
        <View style={styles.policyRow}>
          <AntDesign name="clockcircleo" size={14} color={theme.subtext} />
          <Text style={[styles.policyText, { color: theme.subtext }]}>Notification logs: 1 year</Text>
        </View>
        <View style={styles.policyRow}>
          <AntDesign name="clockcircleo" size={14} color={theme.subtext} />
          <Text style={[styles.policyText, { color: theme.subtext }]}>Session & login activity: 90 days</Text>
        </View>
        <View style={styles.policyRow}>
          <AntDesign name="clockcircleo" size={14} color={theme.subtext} />
          <Text style={[styles.policyText, { color: theme.subtext }]}>Data exports: 30 days</Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Your Rights</Text>
        <Text style={[styles.cardDesc, { color: theme.subtext }]}>
          Under GDPR, you have the right to access, rectify, port, and erase your personal data. You also have the right to restrict processing and object to automated decision-making.
        </Text>
        <View style={styles.linkRow}>
          <AntDesign name="filetext1" size={16} color={colors.accent.primary} />
          <Text style={[styles.linkText, { color: colors.accent.primary }]} onPress={() => Linking.openURL('/privacy')}>
            View Privacy Policy
          </Text>
        </View>
        <View style={styles.linkRow}>
          <AntDesign name="filetext1" size={16} color={colors.accent.primary} />
          <Text style={[styles.linkText, { color: colors.accent.primary }]} onPress={() => Linking.openURL('/terms')}>
            View Terms of Service
          </Text>
        </View>
        <View style={styles.linkRow}>
          <AntDesign name="mail" size={16} color={colors.accent.primary} />
          <Text style={[styles.linkText, { color: colors.accent.primary }]} onPress={() => Linking.openURL('mailto:privacy@dabbu.app')}>
            Contact: privacy@dabbu.app
          </Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <View style={[styles.iconWrap, { backgroundColor: `${colors.accent.primary}20` }]}>
          <AntDesign name="checkcircle" size={24} color={colors.accent.primary} />
        </View>
        <Text style={[styles.cardTitle, { color: theme.text }]}>CCPA Rights (California)</Text>
        <Text style={[styles.cardDesc, { color: theme.subtext }]}>
          Under the California Consumer Privacy Act, you have the right to know what personal information is collected, request deletion, and opt out of the sale of your data. Dabbu does not sell your personal information.
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.accent.primary }]}
          onPress={handleCcpaOptOut}
        >
          <Text style={styles.buttonText}>Opt Out of Data Sale (CCPA)</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.buttonOutline, { borderColor: colors.accent.primary, marginTop: spacing.sm }]}
          onPress={handleDownloadData}
        >
          <Text style={[styles.buttonOutlineText, { color: colors.accent.primary }]}>Right to Know (Download Data)</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <View style={[styles.iconWrap, { backgroundColor: `${colors.accent.primary}20` }]}>
          <AntDesign name="customerservice" size={24} color={colors.accent.primary} />
        </View>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Indian Compliance</Text>
        <Text style={[styles.cardDesc, { color: theme.subtext }]}>
          In compliance with the Indian IT Act 2000 and DPDP Act 2023, a Grievance Officer is available for data-related concerns.
        </Text>
        {grievance ? (
          <View style={{ marginTop: spacing.sm }}>
            <View style={styles.policyRow}>
              <AntDesign name="user" size={14} color={theme.subtext} />
              <Text style={[styles.policyText, { color: theme.subtext }]}>{grievance.name}</Text>
            </View>
            <View style={styles.policyRow}>
              <AntDesign name="mail" size={14} color={theme.subtext} />
              <Text style={[styles.policyText, { color: colors.accent.primary, textDecorationLine: 'underline' }]}
                onPress={() => Linking.openURL(`mailto:${grievance.email}`)}>
                {grievance.email}
              </Text>
            </View>
            <View style={styles.policyRow}>
              <AntDesign name="clockcircleo" size={14} color={theme.subtext} />
              <Text style={[styles.policyText, { color: theme.subtext }]}>Initial response: {grievance.responseTime}</Text>
            </View>
            <View style={styles.policyRow}>
              <AntDesign name="clockcircleo" size={14} color={theme.subtext} />
              <Text style={[styles.policyText, { color: theme.subtext }]}>Resolution: {grievance.resolutionTime}</Text>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.buttonOutline, { borderColor: colors.accent.primary }]}
            onPress={fetchGrievanceOfficer}
            disabled={loadingGrievance}
          >
            {loadingGrievance ? (
              <ActivityIndicator color={colors.accent.primary} />
            ) : (
              <Text style={[styles.buttonOutlineText, { color: colors.accent.primary }]}>View Grievance Officer Details</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      <ConfirmDialog
        visible={showDeleteConfirm}
        title="Request Account Deletion"
        message="Are you sure you want to request account deletion? Your account will be deactivated immediately and permanently deleted after a 7-day grace period. You can cancel anytime within this period."
        confirmLabel="Request Deletion"
        cancelLabel="Cancel"
        destructive
        icon="delete"
        onConfirm={confirmDeletionRequest}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <ConfirmDialog
        visible={showFinalConfirm}
        title="Permanent Deletion"
        message="This action immediately and permanently erases all your personal data under GDPR Article 17. This cannot be undone. Are you sure?"
        confirmLabel="Permanently Delete"
        cancelLabel="Cancel"
        destructive
        icon="warning"
        onConfirm={confirmPermanentDelete}
        onCancel={() => setShowFinalConfirm(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: spacing.lg },
  headerTitle: { fontSize: 28, fontWeight: '700' },
  headerSub: { fontSize: 14, marginTop: 4 },
  card: { marginHorizontal: 16, marginVertical: 8, borderRadius: borderRadius['3xl'], padding: 20 },
  iconWrap: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md },
  cardTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.sm },
  cardDesc: { fontSize: 14, lineHeight: 20, marginBottom: spacing.lg },
  button: { paddingVertical: 14, borderRadius: borderRadius.xl, alignItems: 'center' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  buttonOutline: { paddingVertical: 14, borderRadius: borderRadius.xl, alignItems: 'center', borderWidth: 1 },
  buttonOutlineText: { fontSize: 14, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: spacing.md },
  policyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, gap: 8 },
  policyText: { fontSize: 13, flex: 1 },
  linkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8 },
  linkText: { fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },
});

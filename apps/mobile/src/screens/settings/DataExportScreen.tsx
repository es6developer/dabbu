import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { spacing, borderRadius } from '../../theme/design';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export function DataExportScreen() {
  const { colors: c } = useTheme();
  const theme = { background: c.bg.primary, text: c.text.primary, card: c.bg.card, subtext: c.text.secondary, muted: c.text.tertiary, primary: c.accent.primary, border: c.border.subtle };
  const insets = useSafeAreaInsets();
  const [exporting, setExporting] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/compliance/exports').then(r => setHistory(r.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.post('/compliance/export?format=json', { includes: ['transactions', 'goals', 'bills', 'accounts', 'budgets', 'settings', 'streaks'] });
      const data = res.data?.data || res;
      if (data.data) {
        const jsonStr = JSON.stringify(data.data, null, 2);
        const filename = `dabbu-export-${new Date().toISOString().split('T')[0]}.json`;
        const path = `${FileSystem.documentDirectory}${filename}`;
        await FileSystem.writeAsStringAsync(path, jsonStr);
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(path, { mimeType: 'application/json' });
        }
      }
      Alert.alert('Export Complete', 'Your data has been exported successfully.');
      const hRes = await api.get('/compliance/exports');
      setHistory(hRes.data || []);
    } catch (err: any) {
      Alert.alert('Export Failed', err?.response?.data?.message || err.message);
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteRequest = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure? This will schedule account deletion in 7 days. You can cancel within this period.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request Deletion',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post('/compliance/delete-account');
              Alert.alert('Deletion Scheduled', 'Your account will be deleted in 7 days.');
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || err.message);
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Privacy & Data</Text>
      </View>

      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <View style={[styles.iconWrap, { backgroundColor: '#6366f120' }]}>
          <AntDesign name="download" size={28} color="#6366f1"  />
        </View>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Export Your Data</Text>
        <Text style={[styles.cardDesc, { color: theme.subtext }]}>
          Download all your financial data including transactions, goals, bills, and settings in JSON format.
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#6366f1', opacity: exporting ? 0.6 : 1 }]}
          onPress={handleExport}
          disabled={exporting}
        >
          {exporting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Export My Data</Text>
          )}
        </TouchableOpacity>
      </View>

      {history.length > 0 && (
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Export History</Text>
          {history.map((h: any) => (
            <View key={h.id} style={styles.historyRow}>
              <AntDesign name="filetext1" size={18} color={theme.subtext}  />
              <Text style={[styles.historyText, { color: theme.subtext }]}>
                {h.format?.toUpperCase()} - {new Date(h.createdAt).toLocaleDateString()}
              </Text>
              <View style={[styles.statusDot, {
                backgroundColor: h.status === 'checkcircle' ? '#22c55e' : h.status === 'failed' ? '#ef4444' : '#f97316',
              }]} />
            </View>
          ))}
        </View>
      )}

      <View style={[styles.card, { backgroundColor: theme.card, borderWidth: 1, borderColor: '#ef444430' }]}>
        <View style={[styles.iconWrap, { backgroundColor: '#ef444120' }]}>
          <AntDesign name="delete" size={28} color="#ef4444"  />
        </View>
        <Text style={[styles.cardTitle, { color: '#ef4444' }]}>Delete Account</Text>
        <Text style={[styles.cardDesc, { color: theme.subtext }]}>
          Permanently delete your account and all associated data. This action has a 7-day cancellation period.
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#ef4444' }]}
          onPress={handleDeleteRequest}
        >
          <Text style={styles.buttonText}>Request Account Deletion</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Data Retention Policy</Text>
        <View style={styles.policyRow}>
          <AntDesign name="clockcircleo" size={16} color={theme.subtext}  />
          <Text style={[styles.policyText, { color: theme.subtext }]}>Transactions: Retained until account deletion</Text>
        </View>
        <View style={styles.policyRow}>
          <AntDesign name="clockcircleo" size={16} color={theme.subtext}  />
          <Text style={[styles.policyText, { color: theme.subtext }]}>Analytics events: 90 days</Text>
        </View>
        <View style={styles.policyRow}>
          <AntDesign name="clockcircleo" size={16} color={theme.subtext}  />
          <Text style={[styles.policyText, { color: theme.subtext }]}>Audit logs: 3 years</Text>
        </View>
        <View style={styles.policyRow}>
          <AntDesign name="clockcircleo" size={16} color={theme.subtext}  />
          <Text style={[styles.policyText, { color: theme.subtext }]}>Login activity: 90 days</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerTitle: { fontSize: 28, fontWeight: '700' },
  card: { marginHorizontal: 16, marginVertical: 8, borderRadius: 16, padding: 20 },
  iconWrap: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  cardDesc: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  button: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 },
  historyText: { flex: 1, fontSize: 14 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  policyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, gap: 8 },
  policyText: { fontSize: 13, flex: 1 },
});

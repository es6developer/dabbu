import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { PageContainer } from '../../components/ui/PageContainer';
import { KeyboardAvoidingContainer } from '../../components/ui/KeyboardAvoidingContainer';
import { api } from '../../services/api';
import {
  checkSmsPermission,
  requestSmsPermission,
  ensureSmsPermission,
  isSmsModuleAvailable,
  getAndroidApiLevel,
  isPermissionRestricted,
  openAppSettings,
  getAdbGrantCommand,
  getAndroidPermissionExplanation,
  SmsPermissionStatus,
} from '../../services/sms/smsService';
import { syncSmsTransactions, sendToBackend } from '../../services/sms';

type PageState = 'checking' | 'permission' | 'syncing' | 'done' | 'error';

export function SmsPermissionScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const [state, setState] = useState<PageState>('checking');
  const [permStatus, setPermStatus] = useState<SmsPermissionStatus>('unavailable');
  const [manualText, setManualText] = useState('');
  const [manualResult, setManualResult] = useState<any>(null);
  const [manualLoading, setManualLoading] = useState(false);
  const [parsedCount, setParsedCount] = useState(0);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [showTrouble, setShowTrouble] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const status = await checkSmsPermission();
    setPermStatus(status);
    setState(status === 'granted' ? 'done' : 'permission');
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }

  async function handleGrant() {
    const status = await ensureSmsPermission();
    setPermStatus(status);
    if (status === 'granted') {
      setState('syncing');
      const res = await syncSmsTransactions();
      if (res.raw.length > 0) {
        const upload = await sendToBackend(res.raw);
        setParsedCount(res.raw.length);
        setUploadedCount(upload.success);
      }
      setState('done');
    }
  }

  async function handleManualParse() {
    if (!manualText.trim()) {
      return;
    }
    setManualLoading(true);
    setManualResult(null);
    try {
      const res = await api.post<any>('/sms-detection/parse', {
        message: manualText.trim(),
        sender: 'Manual',
      });
      setManualResult(res);
    } catch {
      /* noop */
    }
    setManualLoading(false);
  }

  const apiLevel = getAndroidApiLevel();
  const moduleAvailable = isSmsModuleAvailable();

  return (
    <PageContainer noPadding>
      <KeyboardAvoidingContainer>
        <View style={styles.content}>
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <View style={styles.header}>
              <View style={[styles.iconWrap, { backgroundColor: `${colors.accent.primary}15` }]}>
                <Ionicons name="chatbubbles" size={32} color={colors.accent.primary} />
              </View>
              <Text style={[styles.title, { color: colors.text.primary }]}>SMS Sync</Text>
              <Text style={[styles.desc, { color: colors.text.tertiary }]}>
                Read financial SMS messages to auto-track transactions
              </Text>
            </View>

            {Platform.OS !== 'android' ? (
              <View
                style={[
                  styles.infoCard,
                  {
                    backgroundColor: `${colors.status.warning}15`,
                    borderColor: `${colors.status.warning}30`,
                  },
                ]}
              >
                <Ionicons name="information-circle" size={20} color={colors.status.warning} />
                <Text style={[styles.infoText, { color: colors.text.secondary }]}>
                  SMS detection is only available on Android devices.
                </Text>
              </View>
            ) : state === 'checking' ? (
              <View style={styles.centerBox}>
                <ActivityIndicator color={colors.accent.primary} size="large" />
                <Text style={[styles.statusText, { color: colors.text.tertiary }]}>
                  Checking permission...
                </Text>
              </View>
            ) : state === 'permission' ? (
              <View style={styles.permissionSection}>
                <View
                  style={[
                    styles.statusCard,
                    { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
                  ]}
                >
                  <View style={styles.statusRow}>
                    <View
                      style={[
                        styles.dot,
                        {
                          backgroundColor:
                            permStatus === 'granted'
                              ? colors.status.success
                              : permStatus === 'restricted'
                                ? colors.status.warning
                                : colors.status.error,
                        },
                      ]}
                    />
                    <View style={styles.statusInfo}>
                      <Text style={[styles.statusLabel, { color: colors.text.primary }]}>
                        Permission
                      </Text>
                      <Text style={[styles.statusValue, { color: colors.text.tertiary }]}>
                        {permStatus === 'granted'
                          ? 'Granted'
                          : permStatus === 'restricted'
                            ? 'Restricted'
                            : permStatus === 'never_ask_again'
                              ? 'Permanently Denied'
                              : 'Not Granted'}
                      </Text>
                    </View>
                    {!moduleAvailable && (
                      <View
                        style={[
                          styles.warnBadge,
                          { backgroundColor: `${colors.status.warning}20` },
                        ]}
                      >
                        <Text style={[styles.warnBadgeText, { color: colors.status.warning }]}>
                          No Module
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    { backgroundColor: colors.accent.primary, opacity: moduleAvailable ? 1 : 0.5 },
                  ]}
                  onPress={handleGrant}
                  disabled={!moduleAvailable}
                >
                  <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>Grant SMS Permission</Text>
                </TouchableOpacity>

                {permStatus === 'never_ask_again' && (
                  <View
                    style={[
                      styles.infoCard,
                      {
                        backgroundColor: `${colors.status.error}12`,
                        borderColor: `${colors.status.error}25`,
                      },
                    ]}
                  >
                    <Ionicons name="alert-circle" size={18} color={colors.status.error} />
                    <Text style={[styles.infoText, { color: colors.text.secondary }]}>
                      Permission was permanently denied. Open system Settings to enable it, or paste
                      SMS manually below.
                    </Text>
                    <TouchableOpacity
                      style={[styles.smallBtn, { backgroundColor: `${colors.accent.primary}20` }]}
                      onPress={openAppSettings}
                    >
                      <Text style={[styles.smallBtnText, { color: colors.accent.primary }]}>
                        Open Settings
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {permStatus === 'restricted' && (
                  <View
                    style={[
                      styles.infoCard,
                      {
                        backgroundColor: `${colors.status.warning}12`,
                        borderColor: `${colors.status.warning}25`,
                      },
                    ]}
                  >
                    <Ionicons name="information-circle" size={18} color={colors.status.warning} />
                    <Text style={[styles.infoText, { color: colors.text.secondary }]}>
                      Android {apiLevel}+ restricts SMS access. Grant via Settings or ADB.
                    </Text>
                    <TouchableOpacity
                      style={[styles.smallBtn, { backgroundColor: `${colors.accent.primary}20` }]}
                      onPress={openAppSettings}
                    >
                      <Text style={[styles.smallBtnText, { color: colors.accent.primary }]}>
                        Open Settings
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : state === 'syncing' ? (
              <View style={styles.centerBox}>
                <ActivityIndicator color={colors.accent.primary} size="large" />
                <Text style={[styles.statusText, { color: colors.text.tertiary }]}>
                  Reading SMS messages...
                </Text>
              </View>
            ) : state === 'done' ? (
              <View style={styles.doneSection}>
                <View
                  style={[
                    styles.resultCard,
                    { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
                  ]}
                >
                  <View
                    style={[styles.checkCircle, { backgroundColor: `${colors.status.success}20` }]}
                  >
                    <Ionicons name="checkmark-circle" size={40} color={colors.status.success} />
                  </View>
                  <Text style={[styles.resultTitle, { color: colors.text.primary }]}>
                    Sync Complete
                  </Text>
                  <View style={styles.statsRow}>
                    <View
                      style={[
                        styles.statBox,
                        { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' },
                      ]}
                    >
                      <Text style={[styles.statNum, { color: colors.accent.primary }]}>
                        {parsedCount}
                      </Text>
                      <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>
                        Detected
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statBox,
                        { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' },
                      ]}
                    >
                      <Text style={[styles.statNum, { color: colors.status.success }]}>
                        {uploadedCount}
                      </Text>
                      <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>
                        Uploaded
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[styles.secondaryBtn, { borderColor: colors.accent.primary }]}
                    onPress={() => navigation.navigate('SmsDashboard')}
                  >
                    <Ionicons name="list" size={18} color={colors.accent.primary} />
                    <Text style={[styles.secondaryBtnText, { color: colors.accent.primary }]}>
                      View Detections
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border.subtle }]} />
              <Text style={[styles.dividerText, { color: colors.text.tertiary }]}>OR</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border.subtle }]} />
            </View>

            <View
              style={[
                styles.manualCard,
                { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
              ]}
            >
              <Text style={[styles.manualTitle, { color: colors.text.primary }]}>Paste an SMS</Text>
              <Text style={[styles.manualDesc, { color: colors.text.tertiary }]}>
                Copy a financial SMS and paste it below to parse it manually
              </Text>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    backgroundColor: colors.bg.tertiary,
                    color: colors.text.primary,
                    borderColor: colors.border.subtle,
                  },
                ]}
                placeholder="Paste SMS text here..."
                placeholderTextColor={colors.text.tertiary}
                value={manualText}
                onChangeText={setManualText}
                multiline
                textAlignVertical="top"
              />
              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  { backgroundColor: colors.accent.primary, opacity: manualText.trim() ? 1 : 0.5 },
                ]}
                onPress={handleManualParse}
                disabled={!manualText.trim() || manualLoading}
              >
                {manualLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="document-text" size={18} color="#FFFFFF" />
                    <Text style={styles.primaryBtnText}>Parse SMS</Text>
                  </>
                )}
              </TouchableOpacity>

              {manualResult && (
                <View
                  style={[
                    styles.parseResult,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                      borderColor: colors.border.subtle,
                    },
                  ]}
                >
                  <Text style={[styles.parseResultTitle, { color: colors.text.primary }]}>
                    Parsed Result
                  </Text>
                  {[
                    {
                      label: 'Amount',
                      value: manualResult.amount
                        ? `₹${Number(manualResult.amount).toLocaleString('en-IN')}`
                        : 'N/A',
                      color: colors.text.primary,
                    },
                    {
                      label: 'Merchant',
                      value: manualResult.merchantName || manualResult.merchant || 'N/A',
                      color: colors.text.primary,
                    },
                    {
                      label: 'Type',
                      value: manualResult.transactionType || manualResult.type || 'N/A',
                      color:
                        manualResult.transactionType === 'credit'
                          ? colors.status.success
                          : colors.status.error,
                    },
                    {
                      label: 'Category',
                      value: manualResult.categoryName || manualResult.category || 'N/A',
                      color: colors.accent.primary,
                    },
                  ].map((r, i) => (
                    <View key={i} style={styles.parseRow}>
                      <Text style={[styles.parseLabel, { color: colors.text.tertiary }]}>
                        {r.label}
                      </Text>
                      <Text style={[styles.parseValue, { color: r.color, fontWeight: '600' }]}>
                        {r.value}
                      </Text>
                    </View>
                  ))}
                  {manualResult.confidence !== null && (
                    <View style={[styles.confidenceRow, { borderTopColor: colors.border.subtle }]}>
                      <Text style={[styles.parseLabel, { color: colors.text.tertiary }]}>
                        Confidence
                      </Text>
                      <View
                        style={[
                          styles.confBadge,
                          {
                            backgroundColor: `${manualResult.confidence >= 0.7 ? colors.status.success : manualResult.confidence >= 0.4 ? colors.status.warning : colors.status.error}20`,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color:
                              manualResult.confidence >= 0.7
                                ? colors.status.success
                                : manualResult.confidence >= 0.4
                                  ? colors.status.warning
                                  : colors.status.error,
                            fontSize: 12,
                            fontWeight: '700',
                          }}
                        >
                          {Math.round(manualResult.confidence * 100)}%
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[styles.troubleToggle, { borderColor: colors.border.subtle }]}
              onPress={() => setShowTrouble(!showTrouble)}
            >
              <Ionicons name="bug-outline" size={16} color={colors.text.tertiary} />
              <Text style={[styles.troubleToggleText, { color: colors.text.tertiary }]}>
                Troubleshooting
              </Text>
              <Ionicons
                name={showTrouble ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={colors.text.tertiary}
              />
            </TouchableOpacity>

            {showTrouble && (
              <View
                style={[
                  styles.troubleContent,
                  { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
                ]}
              >
                <TroubleRow label="Platform" value={Platform.OS} colors={colors} />
                <TroubleRow label="Android API" value={String(apiLevel)} colors={colors} />
                <TroubleRow
                  label="SMS Module"
                  value={moduleAvailable ? 'Available' : 'Not Available'}
                  colors={colors}
                  valueColor={moduleAvailable ? colors.status.success : colors.status.error}
                />
                <TroubleRow
                  label="Permission"
                  value={permStatus}
                  colors={colors}
                  valueColor={
                    permStatus === 'granted' ? colors.status.success : colors.status.error
                  }
                />
                <TroubleRow label="ADB Grant" value={getAdbGrantCommand()} colors={colors} mono />
                {apiLevel >= 30 && (
                  <Text style={[styles.troubleNote, { color: colors.text.tertiary }]}>
                    {getAndroidPermissionExplanation(apiLevel)}
                  </Text>
                )}
              </View>
            )}

            <View style={{ height: 40 }} />
          </Animated.View>
        </View>
      </KeyboardAvoidingContainer>
    </PageContainer>
  );
}

function TroubleRow({
  label,
  value,
  colors,
  valueColor,
  mono,
}: {
  label: string;
  value: string;
  colors: any;
  valueColor?: string;
  mono?: boolean;
}) {
  return (
    <View style={troubleStyles.row}>
      <Text style={[troubleStyles.label, { color: colors.text.tertiary }]}>{label}</Text>
      <Text
        style={[
          troubleStyles.value,
          { color: valueColor || colors.text.secondary },
          mono && troubleStyles.mono,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const troubleStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  label: { fontSize: 13 },
  value: { fontSize: 12, fontWeight: '500', maxWidth: '55%', textAlign: 'right' },
  mono: { fontFamily: 'monospace', fontSize: 11 },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24 },
  header: { alignItems: 'center', marginTop: 10, marginBottom: 28 },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 6 },
  desc: { fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 16 },
  centerBox: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  statusText: { fontSize: 14 },
  permissionSection: { gap: 14 },
  statusCard: { borderRadius: 18, borderWidth: 1, padding: 16 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  statusInfo: { flex: 1 },
  statusLabel: { fontSize: 15, fontWeight: '600' },
  statusValue: { fontSize: 12, marginTop: 2 },
  warnBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  warnBadgeText: { fontSize: 10, fontWeight: '700' },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 16,
  },
  primaryBtnText: { color: '#1A1835', fontSize: 15, fontWeight: '600' },
  infoCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  infoText: { fontSize: 13, lineHeight: 18 },
  smallBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  smallBtnText: { fontSize: 12, fontWeight: '600' },
  doneSection: { gap: 16 },
  resultCard: { borderRadius: 24, borderWidth: 1, padding: 24, alignItems: 'center', gap: 14 },
  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultTitle: { fontSize: 20, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 12, width: '100%' },
  statBox: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', gap: 4 },
  statNum: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 11, fontWeight: '500' },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    width: '100%',
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 28 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 12, fontWeight: '500' },
  manualCard: { borderRadius: 24, borderWidth: 1, padding: 20, gap: 14 },
  manualTitle: { fontSize: 17, fontWeight: '600' },
  manualDesc: { fontSize: 13, lineHeight: 18 },
  textArea: { borderRadius: 14, borderWidth: 1, padding: 14, fontSize: 14, minHeight: 100 },
  parseResult: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  parseResultTitle: { fontSize: 15, fontWeight: '600' },
  parseRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  parseLabel: { fontSize: 13 },
  parseValue: { fontSize: 14, maxWidth: '55%', textAlign: 'right' },
  confidenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    marginTop: 6,
  },
  confBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  troubleToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    marginTop: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  troubleToggleText: { fontSize: 13, fontWeight: '500' },
  troubleContent: { borderRadius: 18, borderWidth: 1, padding: 16, marginTop: 10 },
  troubleNote: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});

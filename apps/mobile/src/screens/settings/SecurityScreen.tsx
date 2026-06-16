import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { ConfirmDialog } from '../../components/ui';
import { useAuth } from '../../store/AuthContext';
import { Skeleton } from '../../components/ui/AnimatedSkeleton';
import { PageContainer } from '../../components/ui/PageContainer';
import { KeyboardAvoidingContainer } from '../../components/ui/KeyboardAvoidingContainer';
import { useToast } from '../../store/ToastContext';

export function SecurityScreen() {
  const { colors } = useTheme();
  const { accessToken } = useAuth();
  const { showToast } = useToast();
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [lockEnabled, setLockEnabled] = useState(false);
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [oldPin, setOldPin] = useState('');
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [pinAction, setPinAction] = useState<'setup' | 'change' | 'remove' | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingPin, setSavingPin] = useState(false);
  const [showLogoutAllDialog, setShowLogoutAllDialog] = useState(false);

  useEffect(() => {
    if (accessToken) {
      setAccessToken(accessToken);
    }
    loadData();
  }, [accessToken]);

  async function loadData() {
    try {
      const sessionId = await SecureStore.getItemAsync('sessionId');

      const [sessionsRes, activityRes, lockRes] = await Promise.all([
        api.get<any>(`/auth/sessions${sessionId ? `?currentSessionId=${sessionId}` : ''}`),
        api.get<any>('/auth/activity'),
        api.get<any>('/auth/lock'),
      ]);

      setSessions(Array.isArray(sessionsRes) ? sessionsRes : []);
      setActivity(Array.isArray(activityRes) ? activityRes : []);

      if (lockRes) {
        setHasPin(!!lockRes.hasPin);
        setLockEnabled(!!lockRes.hasPin);
        setBiometricEnabled(!!lockRes.biometricEnabled);
      }
    } catch (e) {
      const storedBiometric = await SecureStore.getItemAsync('biometricEnabled');
      setBiometricEnabled(storedBiometric === 'true');
      const storedLock = await SecureStore.getItemAsync('appLockEnabled');
      setLockEnabled(storedLock === 'true');
      const existingPin = await SecureStore.getItemAsync('appPin');
      setHasPin(!!existingPin);
    } finally {
      setLoading(false);
    }
  }

  async function handleBiometricToggle(value: boolean) {
    try {
      if (value) {
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        if (!isEnrolled) {
          Alert.alert('Not Available', 'Biometric authentication is not set up on this device');
          return;
        }
      }
      await SecureStore.setItemAsync('biometricEnabled', String(value));
      setBiometricEnabled(value);
      api.post('/auth/lock', { biometricEnabled: value }).catch(() => {});
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update biometric setting');
    }
  }

  async function handleLockToggle(value: boolean) {
    try {
      const existingPin = await SecureStore.getItemAsync('appPin');
      if (value && !existingPin) {
        Alert.alert('Set PIN First', 'Please set up an App PIN before enabling Lock App.');
        return;
      }
      await SecureStore.setItemAsync('appLockEnabled', String(value));
      setLockEnabled(value);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update lock setting');
    }
  }

  async function handleSetupPin() {
    if (!pin || pin.length < 4) {
      Alert.alert('Error', 'PIN must be 4 digits');
      return;
    }
    if (pin.length > 4) {
      Alert.alert('Error', 'PIN must be 4 digits');
      return;
    }
    if (pin !== pinConfirm) {
      Alert.alert('Error', 'PINs do not match');
      return;
    }
    setSavingPin(true);
    try {
      await Promise.all([
        SecureStore.setItemAsync('appPin', pin),
        SecureStore.setItemAsync('appLockEnabled', 'true'),
        api.post('/auth/lock', { pin }).catch(() => {}),
      ]);
      setLockEnabled(true);
      setHasPin(true);
      Alert.alert('Success', 'PIN set up successfully. Lock App is now enabled.');
      setShowPinSetup(false);
      setPin('');
      setPinConfirm('');
      setOldPin('');
      setPinAction(null);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to set PIN');
    } finally {
      setSavingPin(false);
    }
  }

  async function handleChangePin() {
    if (!oldPin) {
      Alert.alert('Error', 'Please enter your current PIN');
      return;
    }
    if (!pin || pin.length < 4) {
      Alert.alert('Error', 'New PIN must be 4 digits');
      return;
    }
    if (pin !== pinConfirm) {
      Alert.alert('Error', 'PINs do not match');
      return;
    }
    setSavingPin(true);
    try {
      const currentPin = await SecureStore.getItemAsync('appPin');
      if (oldPin !== currentPin) {
        Alert.alert('Error', 'Current PIN is incorrect');
        setSavingPin(false);
        return;
      }
      await Promise.all([
        SecureStore.setItemAsync('appPin', pin),
        api.post('/auth/lock', { oldPin, pin }).catch(() => {}),
      ]);
      Alert.alert('Success', 'PIN changed successfully');
      setShowPinSetup(false);
      setPin('');
      setPinConfirm('');
      setOldPin('');
      setPinAction(null);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to change PIN');
    } finally {
      setSavingPin(false);
    }
  }

  async function handleRemovePin() {
    Alert.alert(
      'Remove PIN',
      'Are you sure you want to remove your app PIN? Lock App will be disabled.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setSavingPin(true);
            try {
              await Promise.all([
                SecureStore.deleteItemAsync('appPin'),
                SecureStore.setItemAsync('appLockEnabled', 'false'),
                api.post('/auth/lock', { pin: '' }).catch(() => {}),
              ]);
              setLockEnabled(false);
              setHasPin(false);
              setShowPinSetup(false);
              setPinAction(null);
              Alert.alert('Removed', 'App PIN has been removed');
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to remove PIN');
            } finally {
              setSavingPin(false);
            }
          },
        },
      ],
    );
  }

  async function handleLogoutAll() {
    setShowLogoutAllDialog(true);
  }

  async function handleRevokeSession(sessionId: string) {
    try {
      await api.delete(`/auth/sessions/${sessionId}`);
      showToast('Session removed');
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to revoke session');
    }
  }

  if (loading) {
    return (
      <PageContainer>
        <View
          style={[
            styles.loading,
            { backgroundColor: colors.bg.primary, paddingHorizontal: 24, gap: 16 },
          ]}
        >
          <Skeleton width={120} height={16} />
          <Skeleton width="100%" height={80} borderRadius={16} />
          <Skeleton width="100%" height={60} borderRadius={16} />
          <Skeleton width="100%" height={60} borderRadius={16} />
          <Skeleton width="85%" height={60} borderRadius={16} />
        </View>
      </PageContainer>
    );
  }

  return (
    <PageContainer noPadding>
      <KeyboardAvoidingContainer>
        <View style={styles.container}>
          <Text style={[styles.title, { color: colors.text.primary }]}>Security</Text>

          <View
            style={[
              styles.card,
              { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Authentication
            </Text>

            <View style={[styles.settingRow, { borderBottomColor: colors.border.subtle }]}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.text.primary }]}>
                  Biometric Authentication
                </Text>
                <Text style={[styles.settingDesc, { color: colors.text.tertiary }]}>
                  Use Face ID / fingerprint to unlock
                </Text>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={handleBiometricToggle}
                trackColor={{ false: colors.border.subtle, true: colors.accent.primary }}
                thumbColor={biometricEnabled ? '#FFFFFF' : colors.text.tertiary}
              />
            </View>

            <View style={[styles.settingRow, { borderBottomColor: colors.border.subtle }]}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.text.primary }]}>Lock App</Text>
                <Text style={[styles.settingDesc, { color: colors.text.tertiary }]}>
                  {lockEnabled ? 'App is locked on open' : 'No app lock on open'}
                </Text>
              </View>
              <Switch
                value={lockEnabled}
                onValueChange={handleLockToggle}
                trackColor={{ false: colors.border.subtle, true: colors.accent.primary }}
                thumbColor={lockEnabled ? '#FFFFFF' : colors.text.tertiary}
              />
            </View>

            <View style={[styles.settingRow, { borderBottomColor: colors.border.subtle }]}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.text.primary }]}>App PIN</Text>
                <Text style={[styles.settingDesc, { color: colors.text.tertiary }]}>
                  {hasPin ? 'PIN is set' : 'No PIN set'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {hasPin ? (
                  <>
                    <TouchableOpacity
                      style={[styles.setupBtn, { backgroundColor: `${colors.accent.primary}18` }]}
                      onPress={() => {
                        setPinAction('change');
                        setShowPinSetup(true);
                        setOldPin('');
                        setPin('');
                        setPinConfirm('');
                      }}
                    >
                      <Text style={[styles.setupBtnText, { color: colors.accent.primary }]}>
                        Change
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.setupBtn, { backgroundColor: `${colors.status.error}18` }]}
                      onPress={handleRemovePin}
                    >
                      <Text style={[styles.setupBtnText, { color: colors.status.error }]}>
                        Remove
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={[styles.setupBtn, { backgroundColor: `${colors.accent.primary}18` }]}
                    onPress={() => {
                      setPinAction('setup');
                      setShowPinSetup(true);
                      setPin('');
                      setPinConfirm('');
                    }}
                  >
                    <Text style={[styles.setupBtnText, { color: colors.accent.primary }]}>
                      Setup
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {showPinSetup && pinAction === 'setup' && (
              <View style={styles.pinForm}>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.bg.tertiary,
                      color: colors.text.primary,
                      borderColor: colors.border.default,
                    },
                  ]}
                  value={pin}
                  onChangeText={setPin}
                  placeholder="Enter 4-digit PIN"
                  placeholderTextColor={colors.text.tertiary}
                  secureTextEntry
                  keyboardType="number-pad"
                  maxLength={4}
                />
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.bg.tertiary,
                      color: colors.text.primary,
                      borderColor: colors.border.default,
                    },
                  ]}
                  value={pinConfirm}
                  onChangeText={setPinConfirm}
                  placeholder="Confirm 4-digit PIN"
                  placeholderTextColor={colors.text.tertiary}
                  secureTextEntry
                  keyboardType="number-pad"
                  maxLength={4}
                />
                <TouchableOpacity
                  style={[
                    styles.pinSaveBtn,
                    { backgroundColor: colors.accent.primary },
                    savingPin && { opacity: 0.6 },
                  ]}
                  onPress={handleSetupPin}
                  disabled={savingPin}
                >
                  {savingPin ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={[styles.pinSaveBtnText, { color: colors.text.primary }]}>
                      Save PIN
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setShowPinSetup(false);
                    setPinAction(null);
                  }}
                >
                  <Text
                    style={[
                      styles.setupBtnText,
                      { color: colors.text.tertiary, textAlign: 'center', marginTop: 8 },
                    ]}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {showPinSetup && pinAction === 'change' && (
              <View style={styles.pinForm}>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.bg.tertiary,
                      color: colors.text.primary,
                      borderColor: colors.border.default,
                    },
                  ]}
                  value={oldPin}
                  onChangeText={setOldPin}
                  placeholder="Enter current PIN"
                  placeholderTextColor={colors.text.tertiary}
                  secureTextEntry
                  keyboardType="number-pad"
                  maxLength={4}
                />
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.bg.tertiary,
                      color: colors.text.primary,
                      borderColor: colors.border.default,
                    },
                  ]}
                  value={pin}
                  onChangeText={setPin}
                  placeholder="Enter new 4-digit PIN"
                  placeholderTextColor={colors.text.tertiary}
                  secureTextEntry
                  keyboardType="number-pad"
                  maxLength={4}
                />
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.bg.tertiary,
                      color: colors.text.primary,
                      borderColor: colors.border.default,
                    },
                  ]}
                  value={pinConfirm}
                  onChangeText={setPinConfirm}
                  placeholder="Confirm new PIN"
                  placeholderTextColor={colors.text.tertiary}
                  secureTextEntry
                  keyboardType="number-pad"
                  maxLength={4}
                />
                <TouchableOpacity
                  style={[
                    styles.pinSaveBtn,
                    { backgroundColor: colors.accent.primary },
                    savingPin && { opacity: 0.6 },
                  ]}
                  onPress={handleChangePin}
                  disabled={savingPin}
                >
                  {savingPin ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={[styles.pinSaveBtnText, { color: colors.text.primary }]}>
                      Change PIN
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setShowPinSetup(false);
                    setPinAction(null);
                  }}
                >
                  <Text
                    style={[
                      styles.setupBtnText,
                      { color: colors.text.tertiary, textAlign: 'center', marginTop: 8 },
                    ]}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
            ]}
          >
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                Active Sessions
              </Text>
              {sessions.length > 1 && (
                <TouchableOpacity onPress={handleLogoutAll}>
                  <Text style={[styles.logoutAllText, { color: colors.status.error }]}>
                    Logout All
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            {sessions.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>
                No active sessions
              </Text>
            ) : (
              sessions.map((session) => (
                <View
                  key={session.id}
                  style={[styles.sessionRow, { borderBottomColor: colors.border.subtle }]}
                >
                  <View style={styles.sessionInfo}>
                    <Text style={[styles.sessionDevice, { color: colors.text.primary }]}>
                      {session.device || session.deviceName || 'Unknown device'}
                    </Text>
                    <Text style={[styles.sessionMeta, { color: colors.text.tertiary }]}>
                      {session.ip || ''}{' '}
                      {session.lastActive
                        ? `• ${new Date(session.lastActive).toLocaleDateString()}`
                        : ''}
                    </Text>
                  </View>
                  {!session.isCurrent && (
                    <TouchableOpacity
                      style={[styles.revokeBtn, { backgroundColor: `${colors.status.error}18` }]}
                      onPress={() => handleRevokeSession(session.id)}
                    >
                      <Text style={[styles.revokeBtnText, { color: colors.status.error }]}>
                        Revoke
                      </Text>
                    </TouchableOpacity>
                  )}
                  {session.isCurrent && (
                    <Text style={[styles.currentSession, { color: colors.status.success }]}>
                      Current
                    </Text>
                  )}
                </View>
              ))
            )}
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Recent Login Activity
            </Text>
            {activity.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>
                No recent activity
              </Text>
            ) : (
              activity.map((item, i) => (
                <View
                  key={i}
                  style={[styles.activityRow, { borderBottomColor: colors.border.subtle }]}
                >
                  <View style={[styles.activityDot, { backgroundColor: colors.accent.primary }]} />
                  <View style={styles.activityInfo}>
                    <Text style={[styles.activityAction, { color: colors.text.primary }]}>
                      {item.action || item.event || 'Login'}
                    </Text>
                    <Text style={[styles.activityMeta, { color: colors.text.tertiary }]}>
                      {item.ip || ''} {item.location ? `• ${item.location}` : ''}
                    </Text>
                  </View>
                  <Text style={[styles.activityDate, { color: colors.text.tertiary }]}>
                    {new Date(item.createdAt || item.timestamp).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>
      </KeyboardAvoidingContainer>

      <ConfirmDialog
        visible={showLogoutAllDialog}
        title="Logout All Sessions"
        message="This will log out all other devices. Are you sure?"
        confirmLabel="Logout"
        destructive
        icon="mobile1"
        onConfirm={async () => {
          setShowLogoutAllDialog(false);
          try {
            const sessionId = await SecureStore.getItemAsync('sessionId');
            await api.post('/auth/sessions/logout-all', { currentSessionId: sessionId || '' });
            Alert.alert('Success', 'All other sessions logged out');
            loadData();
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to logout sessions');
          }
        }}
        onCancel={() => setShowLogoutAllDialog(false)}
      />
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 120 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 24 },
  card: { borderRadius: 16, padding: 20, borderWidth: 1, marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 16, paddingBottom: 12 },
  logoutAllText: { fontSize: 13, fontWeight: '600', marginBottom: 16 },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  settingInfo: { flex: 1, marginRight: 12 },
  settingLabel: { fontSize: 15, fontWeight: '500', marginBottom: 2 },
  settingDesc: { fontSize: 12 },
  setupBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  setupBtnText: { fontSize: 13, fontWeight: '600' },
  pinForm: { marginTop: 12, gap: 12 },
  input: {
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  pinSaveBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  pinSaveBtnText: { fontSize: 15, fontWeight: '600' },
  emptyText: { fontSize: 14, fontStyle: 'italic' },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  sessionInfo: { flex: 1 },
  sessionDevice: { fontSize: 14, fontWeight: '500', marginBottom: 2 },
  sessionMeta: { fontSize: 11 },
  revokeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  revokeBtnText: { fontSize: 12, fontWeight: '600' },
  currentSession: { fontSize: 11, fontWeight: '600' },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  activityDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6, marginRight: 12 },
  activityInfo: { flex: 1 },
  activityAction: { fontSize: 14, marginBottom: 2 },
  activityMeta: { fontSize: 11 },
  activityDate: { fontSize: 11, marginLeft: 8 },
});

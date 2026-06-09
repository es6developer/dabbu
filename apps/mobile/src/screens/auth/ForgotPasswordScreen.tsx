import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PADDING, borderRadius, shadows } from '../../theme/design';

export function ForgotPasswordScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sentMethod, setSentMethod] = useState<'sms' | 'email' | null>(null);

  async function handleContinue(method: 'sms' | 'email') {
    setLoading(true);
    setError('');
    setSentMethod(method);
    try {
      if (method === 'email') {
        await api.post('/auth/forgot-password', { email: 'u*****@g***.com' });
      } else {
        await api.post('/auth/forgot-password/sms', { phone: '+91 *****5562' });
      }
    } catch (e: any) {
      setError(e.message || 'Failed to send reset code');
      setSentMethod(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[s.root, { backgroundColor: '#FFFFFF' }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1, paddingTop: insets.top + 16, paddingHorizontal: PADDING }}>
          {/* Back Button */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: '#F8F9FA',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
            }}
          >
            <Ionicons name="chevron-back" size={22} color="#1A1A1A" />
          </TouchableOpacity>

          {/* Header */}
          <Text
            style={{
              fontSize: 28,
              fontWeight: '800',
              color: '#1A1A1A',
              letterSpacing: -0.5,
              marginBottom: 8,
            }}
          >
            Reset password
          </Text>
          <Text
            style={{
              fontSize: 15,
              fontWeight: '500',
              color: '#6B7280',
              lineHeight: 22,
              marginBottom: 32,
            }}
          >
            Choose how you'd like to receive the reset code. We'll send a secure link to your
            verified contact method.
          </Text>

          {/* Error */}
          {error ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                padding: 12,
                borderRadius: 14,
                backgroundColor: '#FF4D4F10',
                marginBottom: 16,
              }}
            >
              <Ionicons name="alert-circle" size={16} color="#FF4D4F" />
              <Text style={{ fontSize: 13, fontWeight: '500', color: '#FF4D4F', flex: 1 }}>
                {error}
              </Text>
            </View>
          ) : null}

          {/* Via SMS Card */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => !loading && sentMethod !== 'sms' && handleContinue('sms')}
            disabled={loading}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 16,
              backgroundColor: '#F8F9FA',
              borderRadius: 20,
              padding: 20,
              marginBottom: 14,
              ...shadows.sm,
              opacity: sentMethod === 'sms' ? 0.5 : 1,
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 16,
                backgroundColor: '#5A4FCF12',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={24} color="#5A4FCF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 }}>
                Via SMS
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#6B7280' }}>
                +91 *****5562
              </Text>
            </View>
            {sentMethod === 'sms' ? (
              <Ionicons name="checkmark-circle" size={24} color="#34C759" />
            ) : (
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            )}
          </TouchableOpacity>

          {/* Via Email Card */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => !loading && sentMethod !== 'email' && handleContinue('email')}
            disabled={loading}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 16,
              backgroundColor: '#F8F9FA',
              borderRadius: 20,
              padding: 20,
              marginBottom: 24,
              ...shadows.sm,
              opacity: sentMethod === 'email' ? 0.5 : 1,
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 16,
                backgroundColor: '#5A4FCF12',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="mail-outline" size={24} color="#5A4FCF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 }}>
                Via Email
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#6B7280' }}>
                u*****@g***.com
              </Text>
            </View>
            {sentMethod === 'email' ? (
              <Ionicons name="checkmark-circle" size={24} color="#34C759" />
            ) : (
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            )}
          </TouchableOpacity>

          {/* Sent confirmation */}
          {sentMethod && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                padding: 16,
                borderRadius: 16,
                backgroundColor: '#34C75910',
                marginBottom: 24,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  backgroundColor: '#34C75915',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="checkmark" size={20} color="#34C759" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A' }}>Code sent</Text>
                <Text style={{ fontSize: 12, fontWeight: '500', color: '#6B7280', marginTop: 2 }}>
                  Check your {sentMethod === 'sms' ? 'phone' : 'email'} for the reset code
                </Text>
              </View>
            </View>
          )}

          {/* Continue Button */}
          {!sentMethod && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => handleContinue('email')}
              disabled={loading}
              style={{
                backgroundColor: '#5A4FCF',
                paddingVertical: 16,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
                opacity: loading ? 0.6 : 1,
                ...shadows.md,
                shadowColor: '#5A4FCF',
              }}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '700' }}>Continue</Text>
              )}
            </TouchableOpacity>
          )}

          {/* Back to sign in */}
          {sentMethod && (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{
                paddingVertical: 14,
                alignItems: 'center',
                borderRadius: 14,
                borderWidth: 1,
                borderColor: '#E5E7EB',
                marginTop: 8,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#5A4FCF' }}>
                Back to sign in
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
});

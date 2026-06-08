import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { PageContainer } from '../../components/ui/PageContainer';
import { KeyboardAvoidingContainer } from '../../components/ui/KeyboardAvoidingContainer';

export function OtpVerificationScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors, isDark } = useTheme();
  const email = route.params?.email || '';
  const purpose = route.params?.purpose || 'login';
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef<(TextInput | null)[]>([]);

  function handleChange(text: string, i: number) {
    if (text.length > 1) {
      text = text[text.length - 1];
    }
    const newOtp = [...otp];
    newOtp[i] = text;
    setOtp(newOtp);
    if (text && i < 5) {
      inputRefs.current[i + 1]?.focus();
    }
  }

  function handleKeyPress(e: any, i: number) {
    if (e.nativeEvent.key === 'Backspace' && !otp[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  }

  async function handleVerify() {
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Enter 6-digit code');
      return;
    }
    setLoading(true);
    setError('');
    try {
      navigation.navigate('Login');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageContainer noPadding>
      <KeyboardAvoidingContainer>
        <View
          
          
          
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.container}>
          <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={colors.text.secondary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text.primary }]}>Verify OTP</Text>
          <Text style={[styles.subtitle, { color: colors.text.tertiary }]}>
            Code sent to {email}
          </Text>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: colors.status.errorLight }]}>
              <Ionicons name="alert-circle" size={16} color={colors.status.error} />
              <Text style={[styles.errorText, { color: colors.status.error }]}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.otpRow}>
            {otp.map((d, i) => (
              <TextInput
                key={i}
                ref={(r) => {
                  inputRefs.current[i] = r;
                }}
                style={[
                  styles.otpInput,
                  {
                    backgroundColor: colors.bg.tertiary,
                    borderColor: colors.border.subtle,
                    color: colors.text.primary,
                  },
                ]}
                value={d}
                onChangeText={(t) => handleChange(t, i)}
                onKeyPress={(e) => handleKeyPress(e, i)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
              />
            ))}
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: colors.accent.primary },
              loading && styles.buttonDisabled,
            ]}
            onPress={handleVerify}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Verify</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity>
            <Text style={[styles.resend, { color: colors.accent.primary }]}>Resend code</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingContainer>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  back: { marginBottom: 24, width: 40 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 15, marginBottom: 40 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: { fontSize: 13, flex: 1 },
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 40 },
  otpInput: {
    width: 48,
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
  },
  button: { paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginBottom: 20 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
  resend: { textAlign: 'center', fontSize: 14, fontWeight: '500' },
});

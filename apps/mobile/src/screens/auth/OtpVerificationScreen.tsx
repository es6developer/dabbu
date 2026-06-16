import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { spacing, borderRadius, shadows } from '../../theme/design';

export function OtpVerificationScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();
  const email = route.params?.email || '';
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    setTimeout(() => inputRefs.current[0]?.focus(), 300);
  }, []);

  function handleChange(text: string, i: number) {
    if (text.length > 1) text = text[text.length - 1];
    const newOtp = [...otp];
    newOtp[i] = text;
    setOtp(newOtp);
    if (text && i < 5) inputRefs.current[i + 1]?.focus();
  }

  function handleKeyPress(e: any, i: number) {
    if (e.nativeEvent.key === 'Backspace' && !otp[i] && i > 0) inputRefs.current[i - 1]?.focus();
  }

  async function handleVerify() {
    const code = otp.join('');
    if (code.length !== 6) { setError('Enter 6-digit code'); return; }
    setLoading(true); setError('');
    try { navigation.navigate('Login'); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  const code = otp.join('');
  const isComplete = code.length === 6;

  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <Animated.View style={{ flex: 1, paddingHorizontal: spacing['2xl'], paddingTop: 60, opacity: fadeAnim }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
            <AntDesign name="arrowleft" size={20} color={colors.text.primary} />
          </TouchableOpacity>

          <Text style={[s.title, { color: colors.text.primary }]}>Enter OTP</Text>
          <Text style={[s.subtitle, { color: colors.text.secondary }]}>
            A 6-digit code was sent to {email}
          </Text>

          {error ? (
            <View style={[s.errorBox, { backgroundColor: colors.status.errorLight }]}>
              <AntDesign name="exclamationcircle" size={14} color={colors.status.error} />
              <Text style={[s.errorText, { color: colors.status.error }]}>{error}</Text>
            </View>
          ) : null}

          <View style={s.otpRow}>
            {otp.map((d, i) => (
              <TextInput
                key={i}
                ref={r => { inputRefs.current[i] = r; }}
                style={[s.otpInput, {
                  backgroundColor: d ? `${colors.accent.primary}08` : colors.bg.secondary,
                  borderColor: d ? colors.accent.primary : colors.border.subtle,
                  color: colors.text.primary,
                }]}
                value={d}
                onChangeText={t => handleChange(t, i)}
                onKeyPress={e => handleKeyPress(e, i)}
                keyboardType="number-pad" maxLength={1} selectTextOnFocus
              />
            ))}
          </View>

          <TouchableOpacity
            style={[s.button, { backgroundColor: colors.accent.primary, opacity: loading || !isComplete ? 0.5 : 1 }]}
            onPress={handleVerify} disabled={loading || !isComplete}
          >
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={s.buttonText}>Verify</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={{ marginTop: spacing.xl }}>
            <Text style={{ textAlign: 'center', fontSize: 14, fontWeight: '500', color: colors.accent.primary }}>Resend code</Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  back: { width: 40, height: 40, borderRadius: borderRadius['2xl'], alignItems: 'center', justifyContent: 'center', marginBottom: spacing['3xl'], backgroundColor: 'transparent' },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.3, marginBottom: spacing.sm },
  subtitle: { fontSize: 15, fontWeight: '400', lineHeight: 22, marginBottom: spacing['4xl'] },
  errorBox: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: borderRadius['2xl'], marginBottom: spacing.lg, gap: spacing.sm },
  errorText: { fontSize: 13, flex: 1 },
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.md, marginBottom: spacing['4xl'] },
  otpInput: { width: 48, height: 56, borderRadius: borderRadius['2xl'], borderWidth: 1.5, textAlign: 'center', fontSize: 22, fontWeight: '700' },
  button: { height: 54, borderRadius: borderRadius['2xl'], alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm, ...shadows.md },
  buttonText: { color: '#FFF', fontSize: 17, fontWeight: '600' },
});

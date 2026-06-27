import React, { useState, useRef, useEffect } from 'react';
import {
  Text,
  TouchableOpacity,
  View,
  Keyboard,
  TouchableWithoutFeedback,
  Animated,
  Image,
  StyleSheet,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../../store/ToastContext';
import { useLastLensLogo } from '../../hooks/useLastLensLogo';
import { AuthInput } from '../../components/ui/AuthInput';
import { AuthButton } from '../../components/ui/AuthButton';

export function ForgotPasswordScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const logoSource = useLastLensLogo();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  async function handleSendOtp() {
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/send-otp', { email: email.trim(), purpose: 'password_reset' });
      showToast('OTP sent successfully');
      navigation.navigate('ResetPassword', { email: email.trim() });
    } catch (e: any) {
      setError(e.message || 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <Animated.View
          style={[
            styles.content,
            {
              paddingTop: insets.top + 48,
              paddingBottom: insets.bottom + 24,
              opacity: fadeAnim,
              transform: [{ translateX: shakeAnim }],
            },
          ]}
        >
          {/* Back */}
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <AntDesign name="arrowleft" size={20} color="#000000" />
          </TouchableOpacity>

          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image source={logoSource} style={styles.logo} resizeMode="contain" />
          </View>

          {/* Header */}
          <Text style={styles.title}>Reset password</Text>
          <Text style={styles.subtitle}>
            Enter your email address and we'll send you a verification code.
          </Text>

          {/* Form */}
          <View style={styles.form}>
            <AuthInput
              placeholder="Email address"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (error) {
                  setError('');
                }
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={handleSendOtp}
            />
          </View>

          {/* Error */}
          {error ? (
            <View style={styles.errorBox}>
              <AntDesign name="exclamationcircle" size={14} color="#FF3B30" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Send Code Button */}
          <AuthButton title="Send Verification Code" onPress={handleSendOtp} loading={loading} />

          {/* Back to sign in */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            style={styles.signInButton}
          >
            <Text style={styles.signInText}>Back to sign in</Text>
          </TouchableOpacity>
        </Animated.View>
      </TouchableWithoutFeedback>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  logo: {
    width: 36,
    height: 36,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: '#8E8E93',
    lineHeight: 22,
    marginBottom: 32,
  },
  form: {
    marginBottom: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#FF3B3010',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#FF3B30',
    flex: 1,
  },
  signInButton: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  signInText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#007AFF',
  },
});

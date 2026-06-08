import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { PremiumAuthLayout } from '../../components/ui/PremiumAuthLayout';
import { useTheme } from '../../theme';
import { useAuth } from '../../store/AuthContext';

interface InputFieldProps {
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  onSubmitEditing?: () => void;
  returnKeyType?: 'next' | 'done';
}

function InputField({
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  onSubmitEditing,
  returnKeyType,
}: InputFieldProps) {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(borderAnim, {
      toValue: focused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [focused, borderAnim]);

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.08)', '#FF6B00'],
  });

  const isPassword = secureTextEntry !== undefined;

  return (
    <Animated.View
      style={[
        styles.inputContainer,
        { borderColor: focused ? '#FF6B00' : 'rgba(255,255,255,0.08)' },
      ]}
    >
      <TextInput
        ref={inputRef}
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#636366"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={isPassword && !showPassword}
        keyboardType={keyboardType || 'default'}
        autoCapitalize={autoCapitalize || 'none'}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onSubmitEditing={onSubmitEditing}
        returnKeyType={returnKeyType}
      />
      {isPassword && value.length > 0 && (
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          style={styles.iconButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color="#8E8E93"
          />
        </TouchableOpacity>
      )}
      {!isPassword && value.length > 0 && (
        <TouchableOpacity
          onPress={() => onChangeText('')}
          style={styles.iconButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close-circle" size={18} color="#8E8E93" />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

export function PremiumLoginScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(email.trim(), password);
    } catch (e: any) {
      setError(e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <PremiumAuthLayout>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <Animated.View
          style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Enter your details below to access your split circles</Text>

          <View style={styles.form}>
            <InputField
              placeholder="Email address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
            />
            <InputField
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#FF4545" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.footnotes}>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setRememberMe(!rememberMe)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                  {rememberMe && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                </View>
                <Text style={styles.checkboxLabel}>Remember me</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigation.navigate('ForgotPassword')}
                activeOpacity={0.7}
              >
                <Text style={styles.forgotLink}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={loading}
                onPressIn={() =>
                  Animated.spring(buttonScale, {
                    toValue: 0.97,
                    friction: 8,
                    tension: 40,
                    useNativeDriver: true,
                  }).start()
                }
                onPressOut={() =>
                  Animated.spring(buttonScale, {
                    toValue: 1,
                    friction: 5,
                    useNativeDriver: true,
                  }).start()
                }
                activeOpacity={1}
              >
                <Text style={styles.primaryButtonText}>
                  {loading ? 'Signing in...' : "Let's Start"}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Or Log In With</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.googleButton} activeOpacity={0.8}>
            <Ionicons name="logo-google" size={20} color="#FFFFFF" />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          <View style={styles.signupRow}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </TouchableWithoutFeedback>
    </PremiumAuthLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 6,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  form: {
    marginTop: 28,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,69,69,0.12)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  errorText: {
    color: '#FF4545',
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    flex: 1,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  inputContainer: {
    height: 52,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    paddingVertical: 0,
  },
  iconButton: {
    marginLeft: 8,
    padding: 2,
  },
  footnotes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 24,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  checkboxActive: {
    backgroundColor: '#FF6B00',
    borderColor: '#FF6B00',
  },
  checkboxLabel: {
    color: '#8E8E93',
    fontSize: 13,
    fontFamily: 'Inter-Medium',
  },
  forgotLink: {
    color: '#FF6B00',
    fontSize: 13,
    fontFamily: 'Inter-Medium',
  },
  primaryButton: {
    height: 52,
    backgroundColor: '#FF6B00',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  dividerText: {
    color: '#8E8E93',
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    marginHorizontal: 12,
  },
  googleButton: {
    height: 52,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  googleButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
  },
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  signupText: {
    color: '#8E8E93',
    fontSize: 13,
    fontFamily: 'Inter-Regular',
  },
  signupLink: {
    color: '#FF6B00',
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
  },
});

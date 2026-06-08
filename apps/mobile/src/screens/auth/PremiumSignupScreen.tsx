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
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { PremiumAuthLayout } from '../../components/ui/PremiumAuthLayout';
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
  inputRef?: React.RefObject<TextInput>;
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
  inputRef,
}: InputFieldProps) {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = secureTextEntry !== undefined;

  return (
    <View
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
    </View>
  );
}

export function PremiumSignupScreen() {
  const navigation = useNavigation<any>();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  async function handleSignup() {
    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '';

    setLoading(true);
    setError('');
    try {
      await register(email.trim(), password, firstName, lastName);
    } catch (e: any) {
      setError(e.message || 'Registration failed');
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
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.headerRow}>
              <View style={styles.headerTextBlock}>
                <Text style={styles.title}>Create Account</Text>
                <Text style={styles.subtitle}>
                  Join Dabbu and start splitting expenses with ease
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              <InputField
                placeholder="Full name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
              />
              <InputField
                placeholder="Email address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
                inputRef={emailRef}
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
              <InputField
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                returnKeyType="next"
                inputRef={passwordRef}
                onSubmitEditing={() => confirmRef.current?.focus()}
              />
              <InputField
                placeholder="Confirm password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                returnKeyType="done"
                inputRef={confirmRef}
                onSubmitEditing={handleSignup}
              />

              {error ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color="#FF4545" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                <TouchableOpacity
                  style={[styles.primaryButton, loading && styles.buttonDisabled]}
                  onPress={handleSignup}
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
                    {loading ? 'Creating account...' : 'Create Account'}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            </View>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Or Sign Up With</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity style={styles.googleButton} activeOpacity={0.8}>
              <Ionicons name="logo-google" size={20} color="#FFFFFF" />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            <View style={styles.loginRow}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>
      </TouchableWithoutFeedback>
    </PremiumAuthLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTextBlock: {
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
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    marginTop: 4,
  },
  form: {
    marginTop: 28,
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
  primaryButton: {
    height: 52,
    backgroundColor: '#FF6B00',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
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
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  loginText: {
    color: '#8E8E93',
    fontSize: 13,
    fontFamily: 'Inter-Regular',
  },
  loginLink: {
    color: '#FF6B00',
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
  },
});

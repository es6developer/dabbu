import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { API_URL } from '../../config/api';

export function AdminLoginScreen() {
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/admin/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.message || 'Login failed');
        return;
      }
      navigation.replace('AdminDashboard', { token: json.data.accessToken });
    } catch {
      setError('Network error. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <Ionicons name="shield-checkmark" size={36} color="#6C3EF4" />
        </View>
        <Text style={styles.title}>Admin Login</Text>
        <Text style={styles.subtitle}>Sign in to manage your app</Text>
      </View>
      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Ionicons name="mail-outline" size={18} color="#6C3EF4" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Admin email"
            placeholderTextColor="#666"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>
        <View style={styles.inputGroup}>
          <Ionicons name="lock-closed-outline" size={18} color="#6C3EF4" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#666"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginBtnText}>Sign In</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0A1A', padding: 24, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 40 },
  iconBox: { width: 72, height: 72, borderRadius: 20, backgroundColor: 'rgba(108,62,244,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '700', color: '#fff' },
  subtitle: { fontSize: 14, color: '#888', marginTop: 6 },
  form: { gap: 16 },
  inputGroup: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1528', borderRadius: 14, borderWidth: 1, borderColor: '#2A2540', paddingHorizontal: 16, height: 52 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: '#fff', height: '100%' },
  loginBtn: { height: 52, borderRadius: 14, backgroundColor: '#6C3EF4', justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  loginBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  error: { color: '#EF4444', fontSize: 13, textAlign: 'center' },
});

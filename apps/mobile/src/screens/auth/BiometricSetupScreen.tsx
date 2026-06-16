import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';

export function BiometricSetupScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(false);

  async function handleEnable() {
    setLoading(true);
    try {
      setTimeout(() => navigation.navigate('Login'), 500);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor: `${colors.accent.primary}15` }]}>
        <AntDesign  name="fingerprint" size={56} color={colors.accent.primary} />
      </View>
      <Text style={[styles.title, { color: colors.text.primary }]}>Secure your account</Text>
      <Text style={[styles.subtitle, { color: colors.text.tertiary }]}>
        Enable {Platform.OS === 'ios' ? 'Face ID' : 'fingerprint'} for quick and secure access
      </Text>

      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: colors.accent.primary },
          loading && { opacity: 0.6 },
        ]}
        onPress={handleEnable}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={[styles.buttonText, { color: colors.text.primary }]}>Enable Biometrics</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={[styles.skip, { color: colors.text.tertiary }]}>Skip</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  iconWrap: {
    width: 108,
    height: 108,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 48, lineHeight: 24 },
  button: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  buttonText: { fontSize: 17, fontWeight: '600' },
  skip: { fontSize: 16 },
});

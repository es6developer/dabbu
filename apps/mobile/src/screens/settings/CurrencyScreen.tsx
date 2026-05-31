import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { useAuth } from '../../store/AuthContext';

interface Currency {
  code: string;
  symbol: string;
  name: string;
  locale?: string;
}

export function CurrencyScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [selected, setSelected] = useState((user as any)?.currency || 'INR');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCurrencies();
  }, []);

  async function loadCurrencies() {
    try {
      const res = await api.get<any[]>('/currencies');
      setCurrencies(res || []);
    } catch {
      setCurrencies([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelect(code: string) {
    setSelected(code);
    setSaving(true);
    try {
      await api.post('/currencies/users/me', { currency: code });
    } catch {
      /* revert silently */
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg.primary }]}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg.primary }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { color: colors.text.primary }]}>Currency</Text>
      <Text style={[styles.subtitle, { color: colors.text.tertiary }]}>
        Select your preferred currency
      </Text>

      {currencies.map((c) => (
        <TouchableOpacity
          key={c.code}
          style={[
            styles.card,
            {
              backgroundColor: colors.bg.secondary,
              borderColor: selected === c.code ? colors.accent.primary : colors.border.subtle,
            },
          ]}
          onPress={() => handleSelect(c.code)}
          disabled={saving}
          activeOpacity={0.7}
        >
          <View style={[styles.symbolWrap, { backgroundColor: `${colors.accent.primary}15` }]}>
            <Text style={[styles.symbol, { color: colors.accent.primary }]}>{c.symbol}</Text>
          </View>
          <View style={styles.info}>
            <Text style={[styles.label, { color: colors.text.primary }]}>{c.name}</Text>
            <Text style={[styles.desc, { color: colors.text.tertiary }]}>{c.code}</Text>
          </View>
          {selected === c.code && (
            <Ionicons name="checkmark-circle" size={24} color={colors.accent.primary} />
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 24, paddingBottom: 120 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 24 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1.5,
  },
  symbolWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  symbol: { fontSize: 22, fontWeight: '700' },
  info: { flex: 1 },
  label: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  desc: { fontSize: 12 },
});

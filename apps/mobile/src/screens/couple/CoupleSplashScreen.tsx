import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ActivityIndicator, Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api } from '../../services/api';

export function CoupleSplashScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [step, setStep] = useState<'loading' | 'intro' | 'create' | 'join' | 'invite'>('loading');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    checkExisting();
  }, []);

  const checkExisting = async () => {
    try {
      const res = await api.get<any>('/couple/status');
      if (res?.isCouple) {
        navigation.replace('CoupleHome');
        return;
      }
    } catch {}
    setStep('intro');
  };

  const createCouple = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post<any>('/couple/create-invite');
      setGeneratedCode(res.inviteCode || res.code || '');
      setStep('invite');
    } catch (e: any) {
      setError(e?.message || 'Failed to create invite');
    } finally {
      setLoading(false);
    }
  }, []);

  const joinCouple = useCallback(async () => {
    if (!inviteCode.trim()) return;
    setLoading(true);
    setError('');
    try {
      await api.post('/couple/join', { inviteCode: inviteCode.trim().toUpperCase() });
      navigation.replace('CoupleHome');
    } catch (e: any) {
      setError(e?.message || 'Invalid or expired invite code');
    } finally {
      setLoading(false);
    }
  }, [inviteCode, navigation]);

  const copyCode = useCallback(() => {
    Clipboard.setString(generatedCode);
  }, [generatedCode]);

  if (step === 'loading') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg.primary }}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <View style={{ flex: 1, paddingTop: insets.top, paddingHorizontal: 24 }}>

        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}>
          {step !== 'intro' && (
            <TouchableOpacity onPress={() => setStep('intro')}>
              <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={{ fontSize: 14, color: colors.text.tertiary }}>Skip</Text>
          </TouchableOpacity>
        </View>

        {step === 'intro' && (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 20 }}>
            <View style={{
              width: 96, height: 96, borderRadius: 28,
              backgroundColor: `${colors.accent.primary}20`, alignItems: 'center', justifyContent: 'center',
            }}>
              <Ionicons name="heart-circle" size={48} color={colors.accent.primary} />
            </View>
            <Text style={{ fontSize: 28, fontWeight: '800', color: colors.text.primary, textAlign: 'center' }}>
              Together{'\n'}Financial Journey
            </Text>
            <Text style={{ fontSize: 14, color: colors.text.secondary, textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 }}>
              Manage finances as a couple. Save for dreams, track expenses together, and build your future as a team.
            </Text>
            {error ? <Text style={{ fontSize: 12, color: colors.status.error }}>{error}</Text> : null}
            <TouchableOpacity
              style={{
                width: '100%', backgroundColor: colors.accent.primary, padding: 16, borderRadius: 16,
                alignItems: 'center', marginTop: 20,
              }}
              onPress={createCouple}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.text.inverse} />
              ) : (
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.inverse }}>Create Couple Space</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                width: '100%', padding: 16, borderRadius: 16,
                borderWidth: 1, borderColor: colors.border.default, alignItems: 'center',
              }}
              onPress={() => setStep('join')}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.accent.primary }}>Join Existing Space</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'invite' && (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 20 }}>
            <Ionicons name="checkmark-circle" size={64} color={colors.status.success} />
            <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text.primary, textAlign: 'center' }}>
              Couple Space Created!
            </Text>
            <Text style={{ fontSize: 13, color: colors.text.secondary, textAlign: 'center', paddingHorizontal: 20 }}>
              Share this invite code with your partner. It expires in 30 minutes.
            </Text>

            <TouchableOpacity
              onPress={copyCode}
              style={{
                backgroundColor: colors.bg.card, borderRadius: 16, padding: 20,
                width: '100%', alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 36, fontWeight: '900', color: colors.accent.primary, letterSpacing: 6 }}>
                {generatedCode}
              </Text>
              <Text style={{ fontSize: 12, color: colors.text.tertiary, marginTop: 8 }}>
                Tap to copy
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                width: '100%', backgroundColor: colors.accent.primary, padding: 16, borderRadius: 16,
                alignItems: 'center', marginTop: 10,
              }}
              onPress={() => navigation.replace('CoupleHome')}
            >
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.inverse }}>
                Enter Couple Space
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'join' && (
          <View style={{ flex: 1, justifyContent: 'center', gap: 16 }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text.primary, textAlign: 'center' }}>
              Join Your Partner
            </Text>
            <Text style={{ fontSize: 13, color: colors.text.secondary, textAlign: 'center' }}>
              Enter the invite code your partner shared with you.
            </Text>

            <TextInput
              placeholder="Enter invite code"
              placeholderTextColor={colors.text.tertiary}
              autoCapitalize="characters"
              maxLength={8}
              style={{
                backgroundColor: colors.bg.card, borderRadius: 16, padding: 18,
                fontSize: 24, fontWeight: '800', color: colors.text.primary, textAlign: 'center',
                letterSpacing: 8, marginTop: 12,
              }}
              value={inviteCode}
              onChangeText={setInviteCode}
            />

            {error ? (
              <Text style={{ fontSize: 12, color: colors.status.error, textAlign: 'center' }}>{error}</Text>
            ) : null}

            <TouchableOpacity
              style={{
                width: '100%', backgroundColor: inviteCode.trim() ? colors.accent.primary : colors.bg.tertiary,
                padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 8,
              }}
              disabled={!inviteCode.trim() || loading}
              onPress={joinCouple}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.text.inverse} />
              ) : (
                <Text style={{
                  fontSize: 16, fontWeight: '700',
                  color: inviteCode.trim() ? colors.text.inverse : colors.text.tertiary,
                }}>
                  Join
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

      </View>
    </View>
  );
}

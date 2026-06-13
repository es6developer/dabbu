import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ActivityIndicator, Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../services/api';

export function CoupleSplashScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

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
      <LinearGradient colors={['#161224', '#0D0B1A']} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#161224', '#0D0B1A']} style={{ flex: 1 }}>
      <View style={{ flex: 1, paddingTop: insets.top, paddingHorizontal: 24 }}>

        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}>
          {step !== 'intro' && (
            <TouchableOpacity onPress={() => setStep('intro')}>
              <Ionicons name="chevron-back" size={24} color="#FFF" />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={{ fontSize: 14, color: '#64748B' }}>Skip</Text>
          </TouchableOpacity>
        </View>

        {step === 'intro' && (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 20 }}>
            <View style={{
              width: 96, height: 96, borderRadius: 28,
              backgroundColor: '#8B5CF620', alignItems: 'center', justifyContent: 'center',
            }}>
              <Ionicons name="heart-circle" size={48} color="#FF4D8C" />
            </View>
            <Text style={{ fontSize: 28, fontWeight: '800', color: '#FFF', textAlign: 'center' }}>
              Together{'\n'}Financial Journey
            </Text>
            <Text style={{ fontSize: 14, color: '#94A3B8', textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 }}>
              Manage finances as a couple. Save for dreams, track expenses together, and build your future as a team.
            </Text>
            {error ? <Text style={{ fontSize: 12, color: '#FF6B6B' }}>{error}</Text> : null}
            <TouchableOpacity
              style={{
                width: '100%', backgroundColor: '#8B5CF6', padding: 16, borderRadius: 16,
                alignItems: 'center', marginTop: 20,
              }}
              onPress={createCouple}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFF' }}>Create Couple Space</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                width: '100%', padding: 16, borderRadius: 16,
                borderWidth: 1, borderColor: '#1E293B', alignItems: 'center',
              }}
              onPress={() => setStep('join')}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#8B5CF6' }}>Join Existing Space</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'invite' && (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 20 }}>
            <Ionicons name="checkmark-circle" size={64} color="#34C759" />
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#FFF', textAlign: 'center' }}>
              Couple Space Created!
            </Text>
            <Text style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', paddingHorizontal: 20 }}>
              Share this invite code with your partner. It expires in 30 minutes.
            </Text>

            <TouchableOpacity
              onPress={copyCode}
              style={{
                backgroundColor: '#1E293B', borderRadius: 16, padding: 20,
                width: '100%', alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 36, fontWeight: '900', color: '#8B5CF6', letterSpacing: 6 }}>
                {generatedCode}
              </Text>
              <Text style={{ fontSize: 12, color: '#64748B', marginTop: 8 }}>
                Tap to copy
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                width: '100%', backgroundColor: '#8B5CF6', padding: 16, borderRadius: 16,
                alignItems: 'center', marginTop: 10,
              }}
              onPress={() => navigation.replace('CoupleHome')}
            >
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFF' }}>
                Enter Couple Space
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'join' && (
          <View style={{ flex: 1, justifyContent: 'center', gap: 16 }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#FFF', textAlign: 'center' }}>
              Join Your Partner
            </Text>
            <Text style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center' }}>
              Enter the invite code your partner shared with you.
            </Text>

            <TextInput
              placeholder="Enter invite code"
              placeholderTextColor="#475569"
              autoCapitalize="characters"
              maxLength={8}
              style={{
                backgroundColor: '#1E293B', borderRadius: 16, padding: 18,
                fontSize: 24, fontWeight: '800', color: '#FFF', textAlign: 'center',
                letterSpacing: 8, marginTop: 12,
              }}
              value={inviteCode}
              onChangeText={setInviteCode}
            />

            {error ? (
              <Text style={{ fontSize: 12, color: '#FF6B6B', textAlign: 'center' }}>{error}</Text>
            ) : null}

            <TouchableOpacity
              style={{
                width: '100%', backgroundColor: inviteCode.trim() ? '#8B5CF6' : '#1E293B',
                padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 8,
              }}
              disabled={!inviteCode.trim() || loading}
              onPress={joinCouple}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={{
                  fontSize: 16, fontWeight: '700',
                  color: inviteCode.trim() ? '#FFF' : '#475569',
                }}>
                  Join
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

      </View>
    </LinearGradient>
  );
}

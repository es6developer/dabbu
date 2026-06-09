import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Rect, Line } from 'react-native-svg';

import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FRAME_SIZE = SCREEN_WIDTH - 64;
const CORNER_LENGTH = 24;

type ScanState = 'idle' | 'scanning' | 'complete' | 'error';

interface BillData {
  amount: number;
  merchant: string;
  date: string;
  description: string;
  category: string;
  items?: { name: string; price: number; quantity?: number }[];
  confidence: number;
  rawText?: string;
}

function ScanFrame() {
  const { colors, isDark } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.85, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <Animated.View style={[styles.frameContainer, { opacity: pulseAnim }]}>
      <Svg
        width={FRAME_SIZE}
        height={FRAME_SIZE * 0.7}
        viewBox={`0 0 ${FRAME_SIZE} ${FRAME_SIZE * 0.7}`}
      >
        <Rect
          x="2"
          y="2"
          width={FRAME_SIZE - 4}
          height={FRAME_SIZE * 0.7 - 4}
          rx="16"
          ry="16"
          stroke={colors.accent.primary}
          strokeWidth="2"
          strokeDasharray="10, 6"
          fill={isDark ? 'rgba(247,137,44,0.06)' : 'rgba(247,137,44,0.04)'}
        />
        <Line
          x1="28" y1="2" x2="28" y2={CORNER_LENGTH + 2}
          stroke={colors.accent.primary} strokeWidth="3" strokeLinecap="round"
        />
        <Line
          x1="2" y1="28" x2={CORNER_LENGTH + 2} y2="28"
          stroke={colors.accent.primary} strokeWidth="3" strokeLinecap="round"
        />
        <Line
          x1={FRAME_SIZE - 28} y1="2" x2={FRAME_SIZE - 28} y2={CORNER_LENGTH + 2}
          stroke={colors.accent.primary} strokeWidth="3" strokeLinecap="round"
        />
        <Line
          x1={FRAME_SIZE - 2} y1="28" x2={FRAME_SIZE - CORNER_LENGTH - 2} y2="28"
          stroke={colors.accent.primary} strokeWidth="3" strokeLinecap="round"
        />
        <Line
          x1="28" y1={FRAME_SIZE * 0.7 - 2} x2="28" y2={FRAME_SIZE * 0.7 - CORNER_LENGTH - 2}
          stroke={colors.accent.primary} strokeWidth="3" strokeLinecap="round"
        />
        <Line
          x1="2" y1={FRAME_SIZE * 0.7 - 28} x2={CORNER_LENGTH + 2} y2={FRAME_SIZE * 0.7 - 28}
          stroke={colors.accent.primary} strokeWidth="3" strokeLinecap="round"
        />
        <Line
          x1={FRAME_SIZE - 28} y1={FRAME_SIZE * 0.7 - 2} x2={FRAME_SIZE - 28} y2={FRAME_SIZE * 0.7 - CORNER_LENGTH - 2}
          stroke={colors.accent.primary} strokeWidth="3" strokeLinecap="round"
        />
        <Line
          x1={FRAME_SIZE - 2} y1={FRAME_SIZE * 0.7 - 28} x2={FRAME_SIZE - CORNER_LENGTH - 2} y2={FRAME_SIZE * 0.7 - 28}
          stroke={colors.accent.primary} strokeWidth="3" strokeLinecap="round"
        />
      </Svg>
    </Animated.View>
  );
}

export function BillScannerScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const [scanState, setScanState] = useState<ScanState>('idle');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [billData, setBillData] = useState<BillData | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);

  async function openCamera() {
    const ImagePicker = await import('expo-image-picker');
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Required', 'Camera access is needed to scan bills.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      base64: false,
    });
    if (result.canceled || !result.assets?.[0]) {
      return;
    }
    await processImage(result.assets[0]);
  }

  async function pickFromGallery() {
    const ImagePicker = await import('expo-image-picker');
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Required', 'Gallery access is needed to select images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      base64: false,
    });
    if (result.canceled || !result.assets?.[0]) {
      return;
    }
    await processImage(result.assets[0]);
  }

  async function processImage(asset: any) {
    setImageUri(asset.uri);
    setScanState('scanning');
    setBillData(null);
    setErrorMessage('');
    setElapsed(0);
    startedAtRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 1000);
    try {
      const uri = asset.uri;
      if (!uri) {
        throw new Error('Could not read image data');
      }

      const fileName = asset.fileName || uri.split('/').pop() || 'photo.jpg';
      const mimeType = asset.mimeType || 'image/jpeg';

      const form = new FormData();
      // @ts-expect-error - React Native FormData file object
      form.append('file', { uri, name: fileName, type: mimeType });

      const res = await api.post<any>('/transactions/scan-bill', form as any, undefined, 120_000);
      if (res && res.rawText && res.rawText !== 'NO TEXT EXTRACTED') {
        navigation.navigate('CreateTransaction', {
          prefill: {
            amount: res.amount || 0,
            description: res.merchant || res.description || '',
            categoryName: res.category || 'Other',
            date: res.date || new Date().toISOString().split('T')[0],
          },
        });
      } else if (res && res.amount > 0) {
        navigation.navigate('CreateTransaction', {
          prefill: {
            amount: res.amount,
            description: res.merchant || res.description || '',
            categoryName: res.category || 'Other',
            date: res.date || new Date().toISOString().split('T')[0],
          },
        });
      } else {
        throw new Error('Could not read the bill. Please try a clearer photo.');
      }
    } catch (e: any) {
      const msg = e.message || 'Could not scan the bill.';
      const isTimeout =
        msg.includes('timed out') || msg.includes('aborted') || msg.includes('AbortError');
      setScanState('error');
      if (isTimeout) {
        setErrorMessage(
          'Scan is taking too long. Please try a clearer photo or enter details manually.',
        );
      } else {
        setErrorMessage(msg);
      }
    } finally {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }

  function handleRetry() {
    setScanState('idle');
    setImageUri(null);
    setBillData(null);
    setErrorMessage('');
    setElapsed(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg.primary }]} />
      <ScrollView
        contentContainerStyle={{ ...styles.content, paddingTop: insets.top + 8 }}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], alignItems: 'center', width: '100%' }}>
          {scanState === 'idle' && (
            <>
              <View style={[styles.iconWrap, { backgroundColor: `${colors.accent.primary}18` }]}>
                <Ionicons name="camera" size={44} color={colors.accent.primary} />
              </View>
              <Text style={[styles.title, { color: colors.text.primary }]}>Scan a Bill</Text>
              <Text style={[styles.desc, { color: colors.text.tertiary }]}>
                Position the bill within the frame and capture
              </Text>

              <ScanFrame />

              <View style={[styles.actionBtn, { backgroundColor: colors.accent.primary }]}>
                <TouchableOpacity
                  style={styles.actionBtnInner}
                  onPress={openCamera}
                  activeOpacity={0.8}
                >
                  <Ionicons name="camera" size={20} color="#FFFFFF" />
                  <Text style={styles.actionBtnText}>Open Camera</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.actionBtn, styles.secondaryBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.1)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)' }]}
                onPress={pickFromGallery}
              >
                <Ionicons name="images-outline" size={20} color={colors.accent.primary} />
                <Text style={[styles.actionBtnText, { color: colors.accent.primary }]}>
                  Choose from Gallery
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.viewBillsBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)' }]}
                onPress={() => navigation.navigate('BillsList')}
              >
                <Ionicons name="receipt-outline" size={18} color={colors.accent.primary} />
                <Text style={[styles.viewBillsText, { color: colors.accent.primary }]}>
                  View Scanned Bills
                </Text>
              </TouchableOpacity>
            </>
          )}

          {scanState === 'scanning' && (
            <View style={styles.centerContent}>
              {imageUri && (
                <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />
              )}
              <View style={[styles.scanningCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.12)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.2)' }]}>
                <ActivityIndicator color={colors.accent.primary} size="large" />
                <Text style={[styles.scanningText, { color: colors.text.secondary, marginTop: 16 }]}>
                  {elapsed > 15 ? 'Still analyzing... taking longer than expected' : 'Analyzing bill...'}
                </Text>
                {elapsed > 5 && (
                  <Text style={[styles.elapsedText, { color: colors.text.tertiary }]}>
                    {elapsed}s elapsed
                  </Text>
                )}
                {elapsed > 20 && (
                  <TouchableOpacity
                    style={[styles.cancelBtn, { backgroundColor: colors.bg.secondary, borderColor: colors.border.default }]}
                    onPress={handleRetry}
                  >
                    <Ionicons name="close" size={20} color={colors.text.primary} />
                    <Text style={[styles.cancelBtnText, { color: colors.text.primary }]}>Cancel</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {scanState === 'error' && (
            <View style={styles.centerContent}>
              <View style={[styles.errorCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.12)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.2)' }]}>
                <Ionicons name="alert-circle" size={56} color={colors.status.error} />
                <Text style={[styles.errorTitle, { color: colors.text.primary }]}>Scan Failed</Text>
                <Text style={[styles.errorDesc, { color: colors.text.tertiary }]}>{errorMessage}</Text>
                <View style={{ gap: 12, width: '100%', marginTop: 8 }}>
                  <View style={[styles.actionBtn, { backgroundColor: colors.accent.primary }]}>
                    <TouchableOpacity
                      style={styles.actionBtnInner}
                      onPress={handleRetry}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="refresh" size={20} color="#FFFFFF" />
                      <Text style={styles.actionBtnText}>Try Again</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.3)' }]}
                    onPress={() => navigation.navigate('CreateTransaction' as any)}
                  >
                    <Ionicons name="create-outline" size={20} color={colors.text.secondary} />
                    <Text style={[styles.actionBtnText, { color: colors.text.secondary }]}>
                      Enter Manually
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 120, alignItems: 'center' },
  centerContent: { alignItems: 'center', justifyContent: 'center', paddingVertical: 20, width: '100%' },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 6, textAlign: 'center' },
  desc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 16,
    fontWeight: '500',
  },
  frameContainer: { marginBottom: 28 },
  actionBtn: {
    borderRadius: 16,
    width: '100%',
    marginBottom: 12,
  },
  actionBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 28,
    justifyContent: 'center',
  },
  secondaryBtn: { borderWidth: 1 },
  actionBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  viewBillsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    marginTop: 8,
  },
  viewBillsText: { fontSize: 14, fontWeight: '700' },
  preview: { width: '100%', height: 200, borderRadius: 16, marginBottom: 16 },
  scanningCard: {
    width: '100%',
    alignItems: 'center',
    padding: 32,
    borderRadius: 20,
    borderWidth: 1,
  },
  scanningText: { fontSize: 15, fontWeight: '600' },
  elapsedText: { fontSize: 13, marginTop: 4, fontWeight: '500' },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 16,
  },
  cancelBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  errorCard: {
    width: '100%',
    alignItems: 'center',
    padding: 32,
    borderRadius: 20,
    borderWidth: 1,
  },
  errorTitle: { fontSize: 20, fontWeight: '800', marginTop: 16, marginBottom: 8 },
  errorDesc: { fontSize: 14, textAlign: 'center', paddingHorizontal: 32, fontWeight: '500' },
});

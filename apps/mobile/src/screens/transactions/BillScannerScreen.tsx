import React, { useState } from 'react';
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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
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
  return (
    <View style={styles.frameContainer}>
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
          x1="28"
          y1="2"
          x2="28"
          y2={CORNER_LENGTH + 2}
          stroke={colors.accent.primary}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <Line
          x1="2"
          y1="28"
          x2={CORNER_LENGTH + 2}
          y2="28"
          stroke={colors.accent.primary}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <Line
          x1={FRAME_SIZE - 28}
          y1="2"
          x2={FRAME_SIZE - 28}
          y2={CORNER_LENGTH + 2}
          stroke={colors.accent.primary}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <Line
          x1={FRAME_SIZE - 2}
          y1="28"
          x2={FRAME_SIZE - CORNER_LENGTH - 2}
          y2="28"
          stroke={colors.accent.primary}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <Line
          x1="28"
          y1={FRAME_SIZE * 0.7 - 2}
          x2="28"
          y2={FRAME_SIZE * 0.7 - CORNER_LENGTH - 2}
          stroke={colors.accent.primary}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <Line
          x1="2"
          y1={FRAME_SIZE * 0.7 - 28}
          x2={CORNER_LENGTH + 2}
          y2={FRAME_SIZE * 0.7 - 28}
          stroke={colors.accent.primary}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <Line
          x1={FRAME_SIZE - 28}
          y1={FRAME_SIZE * 0.7 - 2}
          x2={FRAME_SIZE - 28}
          y2={FRAME_SIZE * 0.7 - CORNER_LENGTH - 2}
          stroke={colors.accent.primary}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <Line
          x1={FRAME_SIZE - 2}
          y1={FRAME_SIZE * 0.7 - 28}
          x2={FRAME_SIZE - CORNER_LENGTH - 2}
          y2={FRAME_SIZE * 0.7 - 28}
          stroke={colors.accent.primary}
          strokeWidth="3"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

export function BillScannerScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [scanState, setScanState] = useState<ScanState>('idle');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [billData, setBillData] = useState<BillData | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  async function openCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Required', 'Camera access is needed to scan bills.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: true,
    });
    if (result.canceled || !result.assets?.[0]) {
      return;
    }
    await processImage(result.assets[0]);
  }

  async function pickFromGallery() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Required', 'Gallery access is needed to select images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: true,
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
    try {
      const base64 = asset.base64;
      if (!base64) {
        throw new Error('Could not read image data');
      }
      const mimeType = asset.mimeType || 'image/jpeg';
      const res = await api.post<any>('/transactions/scan-bill', { image: base64, mimeType });
      if (res && res.amount) {
        navigation.navigate('CreateTransaction', {
          prefill: {
            amount: res.amount,
            description: res.merchant || res.description,
            categoryName: res.category,
            date: res.date || new Date().toISOString().split('T')[0],
          },
        });
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (e: any) {
      const msg = e.message || 'Could not scan the bill.';
      setScanState('error');
      setErrorMessage(msg);
      Alert.alert('Scan Failed', msg);
    }
  }

  function handleRetry() {
    setScanState('idle');
    setImageUri(null);
    setBillData(null);
    setErrorMessage('');
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg.primary }]}
      contentContainerStyle={{ ...styles.content, paddingTop: insets.top + 24 }}
    >
      {scanState === 'idle' && (
        <>
          <View style={[styles.iconWrap, { backgroundColor: `${colors.accent.primary}15` }]}>
            <Ionicons name="camera" size={44} color={colors.accent.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text.primary }]}>Scan a Bill</Text>
          <Text style={[styles.desc, { color: colors.text.tertiary }]}>
            Position the bill within the frame and capture
          </Text>

          <ScanFrame />

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.accent.primary }]}
            onPress={openCamera}
          >
            <Ionicons name="camera" size={20} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Open Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.secondaryBtn, { borderColor: colors.border.subtle }]}
            onPress={pickFromGallery}
          >
            <Ionicons name="images-outline" size={20} color={colors.accent.primary} />
            <Text style={[styles.actionBtnText, { color: colors.accent.primary }]}>
              Choose from Gallery
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.viewBillsBtn,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f8f9ff' },
            ]}
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
          <ActivityIndicator color={colors.accent.primary} size="large" style={{ marginTop: 20 }} />
          <Text style={[styles.scanningText, { color: colors.text.secondary }]}>
            Analyzing bill...
          </Text>
        </View>
      )}

      {scanState === 'error' && (
        <View style={styles.centerContent}>
          <Ionicons name="alert-circle" size={56} color={colors.status.error} />
          <Text style={[styles.errorTitle, { color: colors.text.primary }]}>Scan Failed</Text>
          <Text style={[styles.errorDesc, { color: colors.text.tertiary }]}>{errorMessage}</Text>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.accent.primary }]}
            onPress={handleRetry}
          >
            <Ionicons name="refresh" size={20} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 120, alignItems: 'center' },
  centerContent: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  title: { fontSize: 26, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  desc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  frameContainer: { marginBottom: 28 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 16,
    width: '100%',
    justifyContent: 'center',
    marginBottom: 12,
  },
  secondaryBtn: { backgroundColor: 'transparent', borderWidth: 1 },
  actionBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  viewBillsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    marginTop: 8,
  },
  viewBillsText: { fontSize: 14, fontWeight: '600' },
  preview: { width: '100%', height: 200, borderRadius: 16, marginBottom: 16 },
  scanningText: { fontSize: 15, marginTop: 12, fontWeight: '500' },
  errorTitle: { fontSize: 20, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  errorDesc: { fontSize: 14, textAlign: 'center', marginBottom: 24, paddingHorizontal: 32 },
});

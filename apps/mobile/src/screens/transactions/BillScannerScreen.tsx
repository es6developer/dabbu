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
  Platform,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Rect, Line } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import * as Clipboard from 'expo-clipboard';

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
      <Svg width={FRAME_SIZE} height={FRAME_SIZE * 0.7} viewBox={`0 0 ${FRAME_SIZE} ${FRAME_SIZE * 0.7}`}>
        <Rect
          x="2" y="2"
          width={FRAME_SIZE - 4}
          height={FRAME_SIZE * 0.7 - 4}
          rx="16" ry="16"
          stroke={colors.accent.primary}
          strokeWidth="2"
          strokeDasharray="10, 6"
          fill={isDark ? 'rgba(247,137,44,0.06)' : 'rgba(247,137,44,0.04)'}
        />
        <Line x1="28" y1="2" x2="28" y2={CORNER_LENGTH + 2} stroke={colors.accent.primary} strokeWidth="3" strokeLinecap="round" />
        <Line x1="2" y1="28" x2={CORNER_LENGTH + 2} y2="28" stroke={colors.accent.primary} strokeWidth="3" strokeLinecap="round" />
        <Line x1={FRAME_SIZE - 28} y1="2" x2={FRAME_SIZE - 28} y2={CORNER_LENGTH + 2} stroke={colors.accent.primary} strokeWidth="3" strokeLinecap="round" />
        <Line x1={FRAME_SIZE - 2} y1="28" x2={FRAME_SIZE - CORNER_LENGTH - 2} y2="28" stroke={colors.accent.primary} strokeWidth="3" strokeLinecap="round" />
        <Line x1="28" y1={FRAME_SIZE * 0.7 - 2} x2="28" y2={FRAME_SIZE * 0.7 - CORNER_LENGTH - 2} stroke={colors.accent.primary} strokeWidth="3" strokeLinecap="round" />
        <Line x1="2" y1={FRAME_SIZE * 0.7 - 28} x2={CORNER_LENGTH + 2} y2={FRAME_SIZE * 0.7 - 28} stroke={colors.accent.primary} strokeWidth="3" strokeLinecap="round" />
        <Line x1={FRAME_SIZE - 28} y1={FRAME_SIZE * 0.7 - 2} x2={FRAME_SIZE - 28} y2={FRAME_SIZE * 0.7 - CORNER_LENGTH - 2} stroke={colors.accent.primary} strokeWidth="3" strokeLinecap="round" />
        <Line x1={FRAME_SIZE - 2} y1={FRAME_SIZE * 0.7 - 28} x2={FRAME_SIZE - CORNER_LENGTH - 2} y2={FRAME_SIZE * 0.7 - 28} stroke={colors.accent.primary} strokeWidth="3" strokeLinecap="round" />
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
  const [showOcr, setShowOcr] = useState(false);

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
    if (result.canceled || !result.assets?.[0]) return;
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
    if (result.canceled || !result.assets?.[0]) return;
    await processImage(result.assets[0]);
  }

  async function processImage(asset: any) {
    setImageUri(asset.uri);
    setScanState('scanning');
    setBillData(null);
    try {
      const base64 = asset.base64;
      if (!base64) throw new Error('Could not read image data');
      const mimeType = asset.mimeType || 'image/jpeg';
      const res = await api.post<any>('/transactions/scan-bill', { image: base64, mimeType });
      if (res.data) {
        setBillData(res.data);
        setScanState('complete');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (e: any) {
      setScanState('error');
      Alert.alert('Scan Failed', e.message || 'Could not scan the bill.');
    }
  }

  async function handleConfirmAndEdit() {
    if (!billData || billData.amount <= 0) {
      Alert.alert('Invalid Data', 'Cannot use zero amount.');
      return;
    }
    try {
      const res = await api.post<any>('/bills', {
        merchantName: billData.merchant,
        category: billData.category,
        totalAmount: billData.amount,
        billDate: billData.date,
        items: billData.items || [],
        rawText: billData.rawText || '',
        confidence: billData.confidence,
      });
      if (res.data?.id) {
        navigation.navigate('BillDetail', { billId: res.data.id });
      } else {
        throw new Error('Invalid response');
      }
    } catch (e: any) {
      Alert.alert('Save Failed', e.message || 'Could not save the bill.');
    }
  }

  function handleRetry() {
    setScanState('idle');
    setImageUri(null);
    setBillData(null);
  }

  function getConfidenceColor(score: number): string {
    if (score >= 0.7) return colors.status.success;
    if (score >= 0.4) return colors.status.warning;
    return colors.status.error;
  }

  return (
      <ScrollView style={[styles.container, { backgroundColor: colors.bg.primary }]} contentContainerStyle={{ ...styles.content, paddingTop: insets.top + 24 }}>
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
            <Text style={[styles.actionBtnText, { color: colors.accent.primary }]}>Choose from Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.viewBillsBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f8f9ff' }]}
            onPress={() => navigation.navigate('BillsList')}
          >
            <Ionicons name="receipt-outline" size={18} color={colors.accent.primary} />
            <Text style={[styles.viewBillsText, { color: colors.accent.primary }]}>View Scanned Bills</Text>
          </TouchableOpacity>
        </>
      )}

      {scanState === 'scanning' && (
        <View style={styles.centerContent}>
          {imageUri && <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />}
          <ActivityIndicator color={colors.accent.primary} size="large" style={{ marginTop: 20 }} />
          <Text style={[styles.scanningText, { color: colors.text.secondary }]}>Analyzing bill...</Text>
        </View>
      )}

      {scanState === 'complete' && billData && (
        <>
          {imageUri && <Image source={{ uri: imageUri }} style={styles.previewSmall} resizeMode="cover" />}

          <View style={[styles.resultCard, { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle }]}>
            <Text style={[styles.resultTitle, { color: colors.text.primary }]}>Extracted Details</Text>

            {[
              { label: 'Merchant', value: billData.merchant, color: colors.text.primary },
              { label: 'Amount', value: `₹${billData.amount.toLocaleString('en-IN')}`, color: colors.text.primary, bold: true },
              { label: 'Category', value: billData.category, color: colors.accent.primary },
              ...(billData.description ? [{ label: 'Description', value: billData.description, color: colors.text.primary }] : []),
              ...(billData.date ? [{ label: 'Date', value: billData.date, color: colors.text.primary }] : []),
            ].map((row, i) => (
              <View key={i} style={styles.resultRow}>
                <Text style={[styles.resultLabel, { color: colors.text.tertiary }]}>{row.label}</Text>
                <Text style={[styles.resultValue, { color: row.color }, (row as any).bold && { fontSize: 20, fontWeight: '700' }]}>
                  {row.value}
                </Text>
              </View>
            ))}

            <View style={[styles.confidenceRow, { borderTopColor: colors.border.subtle }]}>
              <Text style={[styles.confidenceLabel, { color: colors.text.tertiary }]}>AI Confidence</Text>
              <View style={[styles.confidenceBadge, { backgroundColor: `${getConfidenceColor(billData.confidence)}22` }]}>
                <Text style={[styles.confidenceText, { color: getConfidenceColor(billData.confidence) }]}>
                  {Math.round(billData.confidence * 100)}%
                </Text>
              </View>
            </View>

            {billData.items && billData.items.length > 0 && (
              <View style={[styles.itemsSection, { borderTopColor: colors.border.subtle }]}>
                <Text style={[styles.itemsTitle, { color: colors.text.secondary }]}>Items</Text>
                {billData.items.map((item, i) => (
                  <View key={i} style={styles.itemRow}>
                    <Text style={[styles.itemName, { color: colors.text.primary }]}>{item.name}</Text>
                    <Text style={[styles.itemPrice, { color: colors.text.primary }]}>₹{item.price}</Text>
                  </View>
                ))}
              </View>
            )}

            {billData.rawText ? (
              <TouchableOpacity
                style={[styles.ocrSection, { borderTopColor: colors.border.subtle }]}
                onPress={() => setShowOcr(!showOcr)}
              >
                <View style={styles.ocrHeader}>
                  <Ionicons name="document-text-outline" size={16} color={colors.text.secondary} />
                  <Text style={[styles.ocrTitle, { color: colors.text.secondary }]}>Raw OCR Text</Text>
                  <TouchableOpacity
                    onPress={async () => { await Clipboard.setStringAsync(billData.rawText || ''); Alert.alert('Copied'); }}
                    style={[styles.copyBtn, { backgroundColor: `${colors.accent.primary}15` }]}
                  >
                    <Ionicons name="copy-outline" size={14} color={colors.accent.primary} />
                    <Text style={[styles.copyBtnText, { color: colors.accent.primary }]}>Copy</Text>
                  </TouchableOpacity>
                  <Ionicons name={showOcr ? 'chevron-up' : 'chevron-down'} size={14} color={colors.text.tertiary} />
                </View>
                {showOcr && (
                  <Text style={[styles.ocrBody, { color: colors.text.tertiary, borderTopColor: colors.border.subtle }]}>
                    {billData.rawText}
                  </Text>
                )}
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.status.success }]} onPress={handleConfirmAndEdit}>
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Review & Create</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionBtn, styles.secondaryBtn, { borderColor: colors.border.subtle }]} onPress={handleRetry}>
            <Ionicons name="refresh" size={20} color={colors.accent.primary} />
            <Text style={[styles.actionBtnText, { color: colors.accent.primary }]}>Scan Another</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.skipBtn]}
            onPress={() => { setScanState('idle'); setImageUri(null); setBillData(null); }}
          >
            <Ionicons name="close-circle-outline" size={20} color={colors.status.error} />
            <Text style={[styles.skipBtnText, { color: colors.status.error }]}>Skip Save & Go Back</Text>
          </TouchableOpacity>
        </>
      )}

      {scanState === 'error' && (
        <View style={styles.centerContent}>
          <Ionicons name="alert-circle" size={56} color={colors.status.error} />
          <Text style={[styles.errorTitle, { color: colors.text.primary }]}>Scan Failed</Text>
          <Text style={[styles.errorDesc, { color: colors.text.tertiary }]}>Could not read this bill. Try a clearer image.</Text>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.accent.primary }]} onPress={handleRetry}>
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
  content: { padding: 24, paddingBottom: 60, alignItems: 'center' },
  centerContent: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  iconWrap: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 20, marginTop: 10 },
  title: { fontSize: 26, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  desc: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24, paddingHorizontal: 16 },
  frameContainer: { marginBottom: 28 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 16, paddingHorizontal: 28, borderRadius: 16, width: '100%', justifyContent: 'center', marginBottom: 12 },
  secondaryBtn: { backgroundColor: 'transparent', borderWidth: 1 },
  actionBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  viewBillsBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 14, marginTop: 8 },
  viewBillsText: { fontSize: 14, fontWeight: '600' },
  preview: { width: '100%', height: 200, borderRadius: 16, marginBottom: 16 },
  previewSmall: { width: 100, height: 100, borderRadius: 12, marginBottom: 20 },
  scanningText: { fontSize: 15, marginTop: 12, fontWeight: '500' },
  resultCard: { width: '100%', borderRadius: 20, borderWidth: 1, padding: 20, marginBottom: 20 },
  resultTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  resultLabel: { fontSize: 13 },
  resultValue: { fontSize: 15, fontWeight: '600', textAlign: 'right', maxWidth: '60%' },
  confidenceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, marginTop: 8, borderTopWidth: 1 },
  confidenceLabel: { fontSize: 13 },
  confidenceBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  confidenceText: { fontSize: 13, fontWeight: '700' },
  itemsSection: { borderTopWidth: 1, marginTop: 14, paddingTop: 14 },
  itemsTitle: { fontSize: 14, fontWeight: '600', marginBottom: 10 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  itemName: { fontSize: 13, flex: 1 },
  itemPrice: { fontSize: 13, fontWeight: '600' },
  errorTitle: { fontSize: 20, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  errorDesc: { fontSize: 14, textAlign: 'center', marginBottom: 24, paddingHorizontal: 32 },
  ocrSection: { borderTopWidth: 1, marginTop: 14, paddingTop: 14 },
  ocrHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ocrTitle: { fontSize: 13, fontWeight: '600', flex: 1 },
  ocrBody: { fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', lineHeight: 16, paddingTop: 10, marginTop: 10, borderTopWidth: 1 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  copyBtnText: { fontSize: 11, fontWeight: '600' },
  skipBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, justifyContent: 'center', marginTop: -4 },
  skipBtnText: { fontSize: 14, fontWeight: '600' },
});

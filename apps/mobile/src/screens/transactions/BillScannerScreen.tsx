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
  TextInput,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Rect, Line } from 'react-native-svg';

import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { EXPENSE_CATEGORIES } from '../../config/categoryIcons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FRAME_SIZE = SCREEN_WIDTH - 64;
const CORNER_LENGTH = 24;

type ScanState = 'idle' | 'scanning' | 'preview' | 'error';

interface BillItem {
  name: string;
  price: number;
  quantity?: number;
}

interface BillData {
  amount: number;
  merchant: string;
  date: string;
  description: string;
  category: string;
  items?: BillItem[];
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
  const [editAmount, setEditAmount] = useState('');
  const [editMerchant, setEditMerchant] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editCategory, setEditCategory] = useState('Other');
  const [editDescription, setEditDescription] = useState('');

  useEffect(() => {
    if (billData) {
      setEditAmount(String(billData.amount || 0));
      setEditMerchant(billData.merchant || '');
      setEditDate(billData.date || new Date().toISOString().split('T')[0]);
      setEditCategory(billData.category || 'Other');
      setEditDescription(billData.description || '');
    }
  }, [billData]);

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
      if (res && (res.amount > 0 || (res.rawText && res.rawText !== 'NO TEXT EXTRACTED'))) {
        setBillData({
          amount: res.amount || 0,
          merchant: res.merchant || res.description || '',
          date: res.date || new Date().toISOString().split('T')[0],
          description: res.description || res.merchant || '',
          category: res.category || 'Other',
          items: res.items || undefined,
          confidence: res.confidence || 0,
          rawText: res.rawText || undefined,
        });
        setScanState('preview');
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
      <ScrollView contentContainerStyle={{ ...styles.content, paddingTop: insets.top + 8 }}>
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            alignItems: 'center',
            width: '100%',
          }}
        >
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
                style={[
                  styles.actionBtn,
                  styles.secondaryBtn,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.1)',
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)',
                  },
                ]}
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
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)' },
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
              <View
                style={[
                  styles.scanningCard,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.12)',
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.2)',
                  },
                ]}
              >
                <ActivityIndicator color={colors.accent.primary} size="large" />
                <Text
                  style={[styles.scanningText, { color: colors.text.secondary, marginTop: 16 }]}
                >
                  {elapsed > 15
                    ? 'Still analyzing... taking longer than expected'
                    : 'Analyzing bill...'}
                </Text>
                {elapsed > 5 && (
                  <Text style={[styles.elapsedText, { color: colors.text.tertiary }]}>
                    {elapsed}s elapsed
                  </Text>
                )}
                {elapsed > 20 && (
                  <TouchableOpacity
                    style={[
                      styles.cancelBtn,
                      { backgroundColor: colors.bg.secondary, borderColor: colors.border.default },
                    ]}
                    onPress={handleRetry}
                  >
                    <Ionicons name="close" size={20} color={colors.text.primary} />
                    <Text style={[styles.cancelBtnText, { color: colors.text.primary }]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {scanState === 'preview' && billData && (
            <View style={{ width: '100%' }}>
              {imageUri && (
                <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />
              )}

              <View
                style={[
                  styles.resultCard,
                  { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
                ]}
              >
                <View style={styles.resultHeader}>
                  <Ionicons name="document-text" size={20} color={colors.accent.primary} />
                  <Text style={[styles.resultTitle, { color: colors.text.primary }]}>
                    OCR Prediction
                  </Text>
                </View>

                <View style={{ gap: 12 }}>
                  <View>
                    <Text style={[styles.fieldLabel, { color: colors.text.tertiary }]}>Amount</Text>
                    <TextInput
                      style={[
                        styles.fieldInput,
                        {
                          color: colors.text.primary,
                          backgroundColor: colors.bg.tertiary,
                          borderColor: colors.border.subtle,
                        },
                      ]}
                      value={editAmount}
                      onChangeText={setEditAmount}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor={colors.text.tertiary}
                    />
                  </View>

                  <View>
                    <Text style={[styles.fieldLabel, { color: colors.text.tertiary }]}>
                      Merchant
                    </Text>
                    <TextInput
                      style={[
                        styles.fieldInput,
                        {
                          color: colors.text.primary,
                          backgroundColor: colors.bg.tertiary,
                          borderColor: colors.border.subtle,
                        },
                      ]}
                      value={editMerchant}
                      onChangeText={setEditMerchant}
                      placeholder="Store name"
                      placeholderTextColor={colors.text.tertiary}
                    />
                  </View>

                  <View>
                    <Text style={[styles.fieldLabel, { color: colors.text.tertiary }]}>Date</Text>
                    <TextInput
                      style={[
                        styles.fieldInput,
                        {
                          color: colors.text.primary,
                          backgroundColor: colors.bg.tertiary,
                          borderColor: colors.border.subtle,
                        },
                      ]}
                      value={editDate}
                      onChangeText={setEditDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.text.tertiary}
                    />
                  </View>

                  <View>
                    <Text style={[styles.fieldLabel, { color: colors.text.tertiary }]}>
                      Category
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ marginTop: 6 }}
                    >
                      {EXPENSE_CATEGORIES.map((cat) => {
                        const selected = editCategory === cat.name;
                        return (
                          <TouchableOpacity
                            key={cat.name}
                            activeOpacity={0.7}
                            onPress={() => setEditCategory(cat.name)}
                            style={[
                              styles.categoryChip,
                              {
                                backgroundColor: selected ? `${cat.color}22` : colors.bg.tertiary,
                                borderColor: selected ? cat.color : colors.border.subtle,
                              },
                            ]}
                          >
                            <Ionicons
                              name={cat.icon as any}
                              size={14}
                              color={selected ? cat.color : colors.text.tertiary}
                            />
                            <Text
                              style={[
                                styles.categoryChipText,
                                { color: selected ? cat.color : colors.text.secondary },
                              ]}
                            >
                              {cat.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  <View>
                    <Text style={[styles.fieldLabel, { color: colors.text.tertiary }]}>
                      Description
                    </Text>
                    <TextInput
                      style={[
                        styles.fieldInput,
                        styles.fieldInputMultiline,
                        {
                          color: colors.text.primary,
                          backgroundColor: colors.bg.tertiary,
                          borderColor: colors.border.subtle,
                        },
                      ]}
                      value={editDescription}
                      onChangeText={setEditDescription}
                      placeholder="Optional notes"
                      placeholderTextColor={colors.text.tertiary}
                      multiline
                      numberOfLines={2}
                    />
                  </View>
                </View>

                {billData.items && billData.items.length > 0 && (
                  <>
                    <View
                      style={[
                        styles.resultDivider,
                        { backgroundColor: colors.border.subtle, marginVertical: 14 },
                      ]}
                    />
                    <Text
                      style={[styles.fieldLabel, { color: colors.text.tertiary, marginBottom: 8 }]}
                    >
                      Line Items
                    </Text>
                    {billData.items.map((item, i) => (
                      <View
                        key={i}
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          paddingVertical: 3,
                        }}
                      >
                        <Text style={{ fontSize: 13, color: colors.text.secondary, flex: 1 }}>
                          {item.name}
                        </Text>
                        <Text
                          style={{ fontSize: 13, fontWeight: '600', color: colors.text.primary }}
                        >
                          {item.quantity ? `x${item.quantity} ` : ''}₹{item.price.toFixed(2)}
                        </Text>
                      </View>
                    ))}
                  </>
                )}
              </View>

              {billData.confidence > 0 && (
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 }}
                >
                  <View
                    style={{
                      flex: 1,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: colors.border.subtle,
                    }}
                  >
                    <View
                      style={{
                        width: `${Math.round(billData.confidence * 100)}%`,
                        height: 4,
                        borderRadius: 2,
                        backgroundColor:
                          billData.confidence > 0.7
                            ? colors.status.success
                            : billData.confidence > 0.4
                              ? '#F59E0B'
                              : colors.status.error,
                      }}
                    />
                  </View>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text.tertiary }}>
                    {Math.round(billData.confidence * 100)}% confidence
                  </Text>
                </View>
              )}

              {billData.rawText && (
                <View
                  style={[
                    styles.rawTextCard,
                    { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle },
                  ]}
                >
                  <Text style={[styles.rawTextLabel, { color: colors.text.tertiary }]}>
                    Raw Extracted Text
                  </Text>
                  <Text style={[styles.rawTextContent, { color: colors.text.secondary }]}>
                    {billData.rawText}
                  </Text>
                </View>
              )}

              <View style={{ gap: 10, marginTop: 8 }}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.accent.primary }]}
                  activeOpacity={0.8}
                  onPress={() =>
                    navigation.navigate('CreateTransaction', {
                      prefill: {
                        amount: parseFloat(editAmount) || 0,
                        description: editMerchant || editDescription || '',
                        categoryName: editCategory || 'Other',
                        date: editDate || new Date().toISOString().split('T')[0],
                      },
                    })
                  }
                >
                  <View style={styles.actionBtnInner}>
                    <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.actionBtnText}>Add to Expenses</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    {
                      backgroundColor: 'transparent',
                      borderWidth: 1,
                      borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
                    },
                  ]}
                  activeOpacity={0.8}
                  onPress={handleRetry}
                >
                  <View style={styles.actionBtnInner}>
                    <Ionicons name="close" size={20} color={colors.text.secondary} />
                    <Text style={[styles.actionBtnText, { color: colors.text.secondary }]}>
                      Discard & Scan Again
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {scanState === 'error' && (
            <View style={styles.centerContent}>
              <View
                style={[
                  styles.errorCard,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.12)',
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.2)',
                  },
                ]}
              >
                <Ionicons name="alert-circle" size={56} color={colors.status.error} />
                <Text style={[styles.errorTitle, { color: colors.text.primary }]}>Scan Failed</Text>
                <Text style={[styles.errorDesc, { color: colors.text.tertiary }]}>
                  {errorMessage}
                </Text>
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
                    style={[
                      styles.actionBtn,
                      {
                        backgroundColor: 'transparent',
                        borderWidth: 1,
                        borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.3)',
                      },
                    ]}
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
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    width: '100%',
  },
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
  resultCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
    width: '100%',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  resultTitle: { fontSize: 16, fontWeight: '700' },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  resultLabel: { fontSize: 13, fontWeight: '600' },
  resultValue: { fontSize: 15, fontWeight: '700' },
  resultDivider: { height: 1, marginVertical: 0 },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryBadgeText: { fontSize: 12, fontWeight: '700' },
  rawTextCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  rawTextLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rawTextContent: { fontSize: 12, fontWeight: '500', lineHeight: 18 },
  fieldLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase' },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 6,
  },
  fieldInputMultiline: {
    minHeight: 56,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryChipText: { fontSize: 12, fontWeight: '700' },
});

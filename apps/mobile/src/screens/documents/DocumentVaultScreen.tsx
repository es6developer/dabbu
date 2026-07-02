import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Dimensions } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSilentRefresh } from '../../hooks/useSilentRefresh';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { Skeleton } from '../../components/ui/AnimatedSkeleton';

import { alertService } from "../../components/ui";
import { PremiumGate } from '../../components/ui/PremiumGate';
const SCREEN_WIDTH = Dimensions.get('window').width;
const CATEGORIES = [
  { key: 'aadhaar', label: 'Aadhaar', icon: 'idcard' },
  { key: 'pan', label: 'PAN', icon: 'creditcard' },
  { key: 'passport', label: 'Passport', icon: 'earth' },
  { key: 'driving_license', label: 'Driving License', icon: 'car' },
  { key: 'insurance', label: 'Insurance', icon: 'Safety' },
  { key: 'vehicle_rc', label: 'Vehicle RC', icon: 'filetext1' },
  { key: 'warranty', label: 'Warranty', icon: 'filetext1' },
  { key: 'medical', label: 'Medical', icon: 'heart' },
];

const CATEGORY_ICONS: Record<string, string> = {
  aadhaar: 'idcard',
  pan: 'creditcard',
  passport: 'earth',
  driving_license: 'car',
  insurance: 'checkcircle',
  vehicle_rc: 'filetext1',
  warranty: 'filetext1',
  medical: 'medicinebox',
};

function fmtDate(d: string | null) {
  if (!d) {
    return null;
  }
  const date = new Date(d);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function dayDiff(d: string) {
  const now = new Date();
  const then = new Date(d);
  const nowLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thenLocal = new Date(then.getFullYear(), then.getMonth(), then.getDate());
  return Math.ceil((thenLocal.getTime() - nowLocal.getTime()) / (1000 * 60 * 60 * 24));
}

export function DocumentVaultScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { accessToken } = useAuth();

  const [documents, setDocuments] = useState<any[]>([]);
  const [categories, setCategories] = useState<Record<string, any>>({});
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadData = useCallback(
    async (silent = false, refresh = false) => {
      if (refresh) {
        setRefreshing(true);
      } else if (!silent) {
        setLoading(true);
      }
      try {
        if (accessToken) {
          setAccessToken(accessToken);
        }
        const [docRes, catRes] = await Promise.all([
          api.get<any[]>('/documents'),
          api.get<any>('/documents/categories'),
        ]);
        setDocuments(docRes || []);
        setCategories(catRes || {});
      } catch {
        /* noop */
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken],
  );

  useSilentRefresh(
    useCallback((isInitial) => {
      loadData(!isInitial);
    }, [loadData]),
  );

  const pickAndUpload = async () => {
    const DocumentPicker = await import('expo-document-picker');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];
      const ext = asset.name?.split('.').pop() || 'file1';
      const mimeType = asset.mimeType || `application/${ext === 'file1' ? 'file1' : 'octet-stream'}`;

      navigation.navigate('DocumentDetail', {
        mode: 'upload',
        uri: asset.uri,
        mimeType,
        fileName: asset.name || `document.${ext}`,
      });
    } catch {
      alertService.alert('Error', 'Failed to pick document');
    }
  };

  const uploadFromCamera = async () => {
    const ImagePicker = await import('expo-image-picker');
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      alertService.alert('Permission Required', 'Camera access is needed to capture documents.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const asset = result.assets[0];
    navigation.navigate('DocumentDetail', {
      mode: 'upload',
      uri: asset.uri,
      mimeType: 'image/jpeg',
      fileName: 'captured.jpg',
    });
  };

  const filtered = selectedCategory
    ? documents.filter((d) => d.category === selectedCategory)
    : documents;

  const categoryCounts: Record<string, number> = {};
  for (const d of documents) {
    categoryCounts[d.category] = (categoryCounts[d.category] || 0) + 1;
  }

  if (loading) {
    return (
      <View style={[s.screen, { backgroundColor: colors.bg.primary, paddingTop: insets.top }]}>
        <View style={{ padding: 28, gap: 20 }}>
          <Skeleton width={140} height={14} />
          <Skeleton width="100%" height={100} borderRadius={24} />
          <Skeleton width="100%" height={80} borderRadius={20} />
          <Skeleton width="100%" height={80} borderRadius={20} />
        </View>
      </View>
    );
  }

  const expiringDocs = documents.filter((d) => {
    if (!d.expiryDate) {
      return false;
    }
    const days = dayDiff(d.expiryDate);
    return days >= 0 && days <= 30;
  });

  return (
    <PremiumGate featureKey="document_vault">
    <View style={[s.screen, { backgroundColor: colors.bg.primary }]}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 100, paddingTop: insets.top + 8 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(false, true)}
            tintColor={colors.accent.primary}
          />
        }
        ListHeaderComponent={
          <>
            <View style={{ paddingHorizontal: 24 }}>
              <Text style={[s.pageTitle, { color: colors.text.primary }]}>Document Vault</Text>
              <Text style={[s.pageSub, { color: colors.text.tertiary }]}>
                {documents.length} document{documents.length !== 1 ? 's' : ''} stored securely
              </Text>
            </View>

            {expiringDocs.length > 0 && (
              <TouchableOpacity
                style={[s.expiryBanner, { backgroundColor: `${colors.status.warning}18` }]}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('DocumentDetail', { mode: 'list' })}
              >
                <AntDesign  name="exclamationcircle" size={18} color={colors.status.warning} />
                <Text style={[s.expiryText, { color: colors.status.warning }]}>
                  {expiringDocs.length} document{expiringDocs.length !== 1 ? 's' : ''} expiring soon
                </Text>
                <AntDesign  name="right" size={14} color={colors.status.warning} />
              </TouchableOpacity>
            )}

            <View style={s.categoryGrid}>
              {CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat.key;
                const count = categoryCounts[cat.key] || 0;
                return (
                  <TouchableOpacity
                    key={cat.key}
                    style={[
                      s.categoryCard,
                      { backgroundColor: colors.bg.secondary },
                      isActive && { borderColor: colors.accent.primary, borderWidth: 1.5 },
                    ]}
                    activeOpacity={0.7}
                    onPress={() => setSelectedCategory(isActive ? null : cat.key)}
                  >
                    <View
                      style={[s.categoryIcon, { backgroundColor: `${colors.accent.primary}18` }]}
                    >
                      <AntDesign
                        name={(CATEGORY_ICONS[cat.key] || 'file1') as any}
                        size={18}
                        color={colors.accent.primary}
                      />
                    </View>
                    <Text
                      style={[s.categoryLabel, { color: colors.text.primary }]}
                      numberOfLines={1}
                    >
                      {cat.label}
                    </Text>
                    {count > 0 && (
                      <View style={[s.categoryBadge, { backgroundColor: colors.accent.primary }]}>
                        <Text style={s.categoryBadgeText}>{count}</Text>
                      </View>
                    )}
                    {categories[cat.key]?.expiring > 0 && (
                      <View style={[s.expiryDot, { backgroundColor: colors.status.warning }]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {selectedCategory && (
              <View style={{ paddingHorizontal: 24, marginTop: 4 }}>
                <TouchableOpacity
                  onPress={() => setSelectedCategory(null)}
                  style={{ alignSelf: 'flex-start' }}
                >
                  <Text style={[s.clearFilter, { color: colors.accent.primary }]}>
                    Clear filter
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={s.sectionHeader}>
              <Text style={[s.sectionTitle, { color: colors.text.primary }]}>
                {selectedCategory
                  ? CATEGORIES.find((c) => c.key === selectedCategory)?.label || 'Documents'
                  : 'All Documents'}
              </Text>
              <Text style={[s.sectionCount, { color: colors.text.tertiary }]}>
                {filtered.length}
              </Text>
            </View>
          </>
        }
        renderItem={({ item }) => {
          const days = item.expiryDate ? dayDiff(item.expiryDate) : null;
          const isExpiring = days !== null && days >= 0 && days <= 30;
          const isExpired = days !== null && days < 0;
          const ext = (item.mimeType || '').split('/')[1] || '';
          return (
            <TouchableOpacity
              style={[s.docCard, { backgroundColor: colors.bg.secondary }]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('DocumentDetail', { id: item.id, mode: 'view' })}
            >
              <View style={[s.docIcon, { backgroundColor: `${colors.accent.primary}18` }]}>
                <AntDesign
                  name={
                    ext === 'file1'
                      ? 'file1'
                      : ((CATEGORY_ICONS[item.category] || 'file1') as any)
                  }
                  size={18}
                  color={colors.accent.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.docName, { color: colors.text.primary }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[s.docMeta, { color: colors.text.tertiary }]}>
                  {CATEGORIES.find((c) => c.key === item.category)?.label || item.category}
                  {item.issuedDate ? ` · Issued ${fmtDate(item.issuedDate)}` : ''}
                  {ext ? ` · ${ext.toUpperCase()}` : ''}
                </Text>
                {item.expiryDate && (
                  <Text
                    style={[
                      s.docExpiry,
                      {
                        color: isExpired
                          ? colors.status.error
                          : isExpiring
                            ? colors.status.warning
                            : colors.text.tertiary,
                      },
                    ]}
                  >
                    {isExpired
                      ? `Expired ${fmtDate(item.expiryDate)}`
                      : isExpiring
                        ? `Expires in ${days} day${days === 1 ? '' : 's'}`
                        : `Expires ${fmtDate(item.expiryDate)}`}
                  </Text>
                )}
              </View>
              <AntDesign  name="right" size={16} color={colors.text.tertiary} />
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={s.emptyState}>
            <AntDesign  name="folder1" size={48} color={colors.text.tertiary} />
            <Text style={[s.emptyTitle, { color: colors.text.primary }]}>No Documents</Text>
            <Text style={[s.emptyDesc, { color: colors.text.tertiary }]}>
              {selectedCategory
                ? `No documents in this category. Tap + to upload one.`
                : 'Upload your Aadhaar, PAN, passport and other documents to store them securely.'}
            </Text>
          </View>
        }
        windowSize={10}
        maxToRenderPerBatch={10}
      />
    </View>
    </PremiumGate>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  pageTitle: { fontSize: 26, fontWeight: '800', marginBottom: 4 },
  pageSub: { fontSize: 16, marginBottom: 20 },
  expiryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    padding: 18,
    borderRadius: 28,
    gap: 8,
    marginBottom: 20,
  },
  expiryText: { flex: 1, fontSize: 16, fontWeight: '600' },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
    gap: 8,
    marginBottom: 20,
  },
  categoryCard: {
    width: (SCREEN_WIDTH - 56) / 4,
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 4,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  categoryLabel: { fontSize: 10, fontWeight: '600', textAlign: 'center' },
  categoryBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  categoryBadgeText: { fontSize: 10, fontWeight: '700', color: '#FFF' },
  expiryDot: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 8,
  },
  clearFilter: { fontSize: 12, fontWeight: '600', marginBottom: 8 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 19, fontWeight: '700' },
  sectionCount: { fontSize: 16, fontWeight: '600' },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    padding: 18,
    borderRadius: 30,
    marginBottom: 8,
    gap: 14,
  },
  docIcon: {
    width: 40,
    height: 40,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docName: { fontSize: 16, fontWeight: '600' },
  docMeta: { fontSize: 12, marginTop: 2 },
  docExpiry: { fontSize: 12, marginTop: 1, fontWeight: '500' },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 14, paddingHorizontal: 44 },
  emptyTitle: { fontSize: 19, fontWeight: '700' },
  emptyDesc: { fontSize: 16, textAlign: 'center', lineHeight: 18 },
});

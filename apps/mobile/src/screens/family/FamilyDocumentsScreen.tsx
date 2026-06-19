import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { api } from '../../services/api';

const { width } = Dimensions.get('window');
const GRID_GAP = 12;
const GRID_PADDING = 20;
const CARD_WIDTH = (width - GRID_PADDING * 2 - GRID_GAP * 2) / 3;

interface UploadedBy {
  id: string;
  name: string;
}

interface Document {
  id: string;
  name: string;
  type: string;
  category: string;
  fileUrl: string;
  fileSize: number;
  isEncrypted: boolean;
  uploadedBy: UploadedBy;
  createdAt: string;
}

const CATEGORIES = [
  { key: 'AADHAR', label: 'Aadhar', icon: 'creditcard', color: '#FF6B35' },
  { key: 'PAN', label: 'PAN', icon: 'creditcard', color: '#F59E0B' },
  { key: 'INSURANCE', label: 'Insurance', icon: 'Safety', color: '#3B82F6' },
  { key: 'PROPERTY', label: 'Property', icon: 'home', color: '#10B981' },
  { key: 'VEHICLE', label: 'Vehicle', icon: 'car', color: '#8B5CF6' },
  { key: 'SCHOOL', label: 'School', icon: 'book', color: '#EC4899' },
  { key: 'WARRANTY', label: 'Warranty', icon: 'filetext1', color: '#06B6D4' },
  { key: 'OTHER', label: 'Other', icon: 'folder1', color: '#6B7280' },
];

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function SkeletonGrid() {
  return (
    <View style={styles.skeletonContainer}>
      {Array.from({ length: 6 }).map((_, i) => (
        <View key={i} style={styles.skeletonCard}>
          <View style={styles.skeletonIcon} />
          <View style={styles.skeletonLine} />
          <View style={[styles.skeletonLine, { width: '50%' }]} />
        </View>
      ))}
    </View>
  );
}

function EmptyState({ message }: { message: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.emptyState}>
      <AntDesign name="folder1" size={56} color={colors.text.tertiary} />
      <Text style={[styles.emptyTitle, { color: colors.text.secondary }]}>{message}</Text>
    </View>
  );
}

const DocumentCard = React.memo(({ doc, onPress, colors }: { doc: Document; onPress: () => void; colors: any }) => (
  <TouchableOpacity style={[styles.docCard, { backgroundColor: colors.bg.card }]} activeOpacity={0.7} onPress={onPress}>
    <View style={styles.docCardTop}>
      <View style={[styles.docTypeBadge, { backgroundColor: colors.status.infoLight }]}>
        <AntDesign name="pdffile1" size={16} color={colors.status.info} />
      </View>
      <Text style={[styles.docName, { color: colors.text.primary }]} numberOfLines={2}>
        {doc.name}
      </Text>
    </View>
    <View style={styles.docMeta}>
      <Text style={[styles.docMetaText, { color: colors.text.tertiary }]}>{doc.type}</Text>
      <View style={[styles.docDot, { backgroundColor: colors.text.tertiary }]} />
      <Text style={[styles.docMetaText, { color: colors.text.tertiary }]}>{formatBytes(doc.fileSize)}</Text>
    </View>
    <View style={styles.docFooter}>
      <View style={styles.docUploader}>
        <AntDesign name="user" size={11} color={colors.text.tertiary} />
        <Text style={[styles.docUploaderName, { color: colors.text.tertiary }]} numberOfLines={1}>
          {doc.uploadedBy?.name || 'Unknown'}
        </Text>
      </View>
      <Text style={[styles.docDate, { color: colors.text.tertiary }]}>{formatDate(doc.createdAt)}</Text>
    </View>
    {doc.isEncrypted && (
      <View style={[styles.encryptedBadge, { backgroundColor: colors.status.warningLight }]}>
        <AntDesign name="lock" size={10} color={colors.status.warning} />
      </View>
    )}
  </TouchableOpacity>
));

export default function FamilyDocumentsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();
  const familyId = route.params?.familyId;

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const fetchDocuments = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const params = familyId ? `?familyId=${familyId}` : '';
      const res = await api.get<any>(`/family/documents${params}`);
      const data = Array.isArray(res) ? res : res?.data || res?.documents || [];
      setDocuments(data);
    } catch {
      setDocuments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [familyId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const grouped = useMemo(() => {
    const map: Record<string, Document[]> = {};
    CATEGORIES.forEach((c) => { map[c.key] = []; });
    documents.forEach((doc) => {
      const key = doc.category?.toUpperCase();
      if (key && map[key]) map[key].push(doc);
      else map['OTHER'].push(doc);
    });
    return map;
  }, [documents]);

  const selectedDocs = selectedCategory ? grouped[selectedCategory] || [] : [];

  const handleSelectCategory = useCallback((key: string) => {
    setSelectedCategory(key);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedCategory(null);
  }, []);

  const handleDocPress = useCallback((doc: Document) => {
    nav.navigate('DocumentDetail', { documentId: doc.id });
  }, [nav]);

  const handleUpload = useCallback(() => {
    nav.navigate('UploadDocument', { category: selectedCategory, familyId });
  }, [nav, selectedCategory, familyId]);

  const onRefresh = useCallback(() => {
    fetchDocuments(true);
  }, [fetchDocuments]);

  if (loading && documents.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg.primary, paddingTop: insets.top }]}>
        <View style={styles.headerBar}>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Document Vault</Text>
        </View>
        <SkeletonGrid />
      </View>
    );
  }

  if (selectedCategory) {
    const cat = CATEGORIES.find((c) => c.key === selectedCategory);
    return (
      <View style={[styles.container, { backgroundColor: colors.bg.primary, paddingTop: insets.top }]}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <AntDesign name="arrowleft" size={22} color={colors.text.primary} />
          </TouchableOpacity>
          <View style={styles.categoryHeaderInfo}>
            <View style={[styles.categoryDot, { backgroundColor: cat?.color }]} />
            <Text style={[styles.headerTitle, { color: colors.text.primary }]}>{cat?.label || selectedCategory}</Text>
          </View>
          <View style={styles.backBtn} />
        </View>
        <Text style={[styles.subtitle, { color: colors.text.tertiary }]}>
          {selectedDocs.length} {selectedDocs.length === 1 ? 'document' : 'documents'}
        </Text>
        <FlatList
          data={selectedDocs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <DocumentCard doc={item} onPress={() => handleDocPress(item)} colors={colors} />
          )}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={<EmptyState message="No documents in this category" />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent.primary} />
          }
        />
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.accent.primary }]}
          activeOpacity={0.8}
          onPress={handleUpload}
        >
          <AntDesign name="plus" size={24} color={colors.text.inverse} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary, paddingTop: insets.top }]}>
      <View style={styles.headerBar}>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Document Vault</Text>
        <Text style={[styles.docCount, { color: colors.text.tertiary }]}>
          {documents.length} {documents.length === 1 ? 'document' : 'documents'}
        </Text>
      </View>
      <FlatList
        data={CATEGORIES}
        keyExtractor={(item) => item.key}
        numColumns={3}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={[styles.gridContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const count = (grouped[item.key] || []).length;
          return (
            <TouchableOpacity
              style={[styles.categoryCard, { backgroundColor: item.color + '18' }]}
              activeOpacity={0.7}
              onPress={() => handleSelectCategory(item.key)}
            >
              <View style={[styles.categoryIconWrap, { backgroundColor: item.color + '30' }]}>
                <AntDesign name={item.icon as any} size={22} color={item.color} />
              </View>
              <Text style={[styles.categoryLabel, { color: colors.text.primary }]} numberOfLines={1}>
                {item.label}
              </Text>
              <Text style={[styles.categoryCount, { color: colors.text.tertiary }]}>
                {count} {count === 1 ? 'doc' : 'docs'}
              </Text>
            </TouchableOpacity>
          );
        }}
        ListHeaderComponent={
          documents.length === 0 ? <EmptyState message="No documents yet" /> : null
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent.primary} />
        }
      />
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.accent.primary }]}
        activeOpacity={0.8}
        onPress={handleUpload}
      >
        <AntDesign name="plus" size={24} color={colors.text.inverse} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: GRID_PADDING,
    paddingVertical: 8,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  docCount: {
    fontSize: 13,
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 13,
    paddingHorizontal: GRID_PADDING,
    paddingBottom: 8,
    fontWeight: '500',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryHeaderInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
    gap: 8,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  gridRow: {
    gap: GRID_GAP,
    paddingHorizontal: GRID_PADDING,
  },
  gridContent: {
    paddingTop: 12,
    gap: GRID_GAP,
  },
  categoryCard: {
    width: CARD_WIDTH,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  categoryIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  categoryCount: {
    fontSize: 11,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: GRID_PADDING,
    paddingTop: 4,
  },
  docCard: {
    borderRadius: 14,
    padding: 14,
    position: 'relative',
  },
  docCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  docTypeBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  docName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19,
  },
  docMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingLeft: 44,
  },
  docMetaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  docDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  docFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 44,
  },
  docUploader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  docUploaderName: {
    fontSize: 11,
    fontWeight: '500',
    flexShrink: 1,
  },
  docDate: {
    fontSize: 11,
    fontWeight: '500',
  },
  encryptedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 24,
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  skeletonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    paddingHorizontal: GRID_PADDING,
    paddingTop: 12,
  },
  skeletonCard: {
    width: CARD_WIDTH,
    borderRadius: 16,
    backgroundColor: 'rgba(128,128,128,0.08)',
    paddingVertical: 18,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  skeletonIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(128,128,128,0.12)',
    marginBottom: 10,
  },
  skeletonLine: {
    width: '80%',
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(128,128,128,0.12)',
    marginBottom: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
});

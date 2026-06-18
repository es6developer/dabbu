import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Document {
  id: string;
  name: string;
  size: string;
  dateUploaded: string;
  icon: keyof typeof AntDesign.glyphMap;
  iconColor: string;
}

interface DocumentCategory {
  id: string;
  name: string;
  icon: keyof typeof AntDesign.glyphMap;
  color: string;
  documents: Document[];
}

const categories: DocumentCategory[] = [
  {
    id: '1', name: 'Insurance', icon: 'Safety', color: '#3B82F6',
    documents: [
      { id: 'd1', name: 'Health Insurance Policy', size: '2.4 MB', dateUploaded: '12 Jun 2026', icon: 'pdffile1', iconColor: '#EF4444' },
      { id: 'd2', name: 'Life Insurance Certificate', size: '1.2 MB', dateUploaded: '05 May 2026', icon: 'pdffile1', iconColor: '#EF4444' },
    ],
  },
  {
    id: '2', name: 'Investment', icon: 'barschart', color: '#8B5CF6',
    documents: [
      { id: 'd3', name: 'MF Portfolio Statement', size: '850 KB', dateUploaded: '01 Jun 2026', icon: 'file1', iconColor: '#8B5CF6' },
      { id: 'd4', name: 'Stock Holdings Report', size: '1.8 MB', dateUploaded: '28 May 2026', icon: 'file1', iconColor: '#8B5CF6' },
    ],
  },
  {
    id: '3', name: 'Tax', icon: 'filetext1', color: '#F59E0B',
    documents: [
      { id: 'd5', name: 'ITR Filed 2025-26', size: '3.1 MB', dateUploaded: '15 Mar 2026', icon: 'pdffile1', iconColor: '#EF4444' },
      { id: 'd6', name: 'Form 16', size: '520 KB', dateUploaded: '10 Mar 2026', icon: 'pdffile1', iconColor: '#EF4444' },
    ],
  },
  {
    id: '4', name: 'Property', icon: 'home', color: '#10B981',
    documents: [
      { id: 'd7', name: 'Property Deed', size: '5.6 MB', dateUploaded: '20 Jan 2026', icon: 'pdffile1', iconColor: '#EF4444' },
    ],
  },
  {
    id: '5', name: 'Education', icon: 'book', color: '#EC4899',
    documents: [
      { id: 'd8', name: 'School Fee Receipts', size: '1.1 MB', dateUploaded: '08 Apr 2026', icon: 'file1', iconColor: '#3B82F6' },
    ],
  },
  {
    id: '6', name: 'Medical', icon: 'heart', color: '#EF4444',
    documents: [
      { id: 'd9', name: 'Family Health Records', size: '4.2 MB', dateUploaded: '02 Feb 2026', icon: 'file1', iconColor: '#EF4444' },
    ],
  },
  {
    id: '7', name: 'Other', icon: 'folder1', color: '#6B7280',
    documents: [
      { id: 'd10', name: 'Important Contacts', size: '120 KB', dateUploaded: '15 Jun 2026', icon: 'file1', iconColor: '#6B7280' },
    ],
  },
];

const DocumentCard: React.FC<{ doc: Document }> = ({ doc }) => (
  <TouchableOpacity
    style={styles.documentCard}
    activeOpacity={0.7}
    onPress={() => Alert.alert('Document', doc.name)}
  >
    <View style={styles.docIconContainer}>
      <AntDesign name={doc.icon} size={22} color={doc.iconColor} />
    </View>
    <View style={styles.docInfo}>
      <Text style={styles.docName} numberOfLines={1}>{doc.name}</Text>
      <View style={styles.docMetaRow}>
        <Text style={styles.docSize}>{doc.size}</Text>
        <View style={styles.docDot} />
        <Text style={styles.docDate}>{doc.dateUploaded}</Text>
      </View>
    </View>
    <AntDesign name="download" size={16} color="#6B7280" />
  </TouchableOpacity>
);

const CategorySection: React.FC<{ category: DocumentCategory; isExpanded: boolean; onToggle: () => void }> = ({
  category,
  isExpanded,
  onToggle,
}) => (
  <View style={styles.categorySection}>
    <TouchableOpacity style={styles.categoryHeader} onPress={onToggle}>
      <View style={styles.categoryLeft}>
        <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
          <AntDesign name={category.icon} size={18} color={category.color} />
        </View>
        <View>
          <Text style={styles.categoryName}>{category.name}</Text>
          <Text style={styles.categoryCount}>{category.documents.length} documents</Text>
        </View>
      </View>
      <AntDesign name={isExpanded ? 'up' : 'down'} size={14} color="#6B7280" />
    </TouchableOpacity>
    {isExpanded && (
      <View style={styles.categoryDocuments}>
        {category.documents.map(doc => (
          <DocumentCard key={doc.id} doc={doc} />
        ))}
      </View>
    )}
  </View>
);

export default function FamilyDocumentsScreen() {
  const insets = useSafeAreaInsets();
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['1', '2']);

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const totalDocs = categories.reduce((s, c) => s + c.documents.length, 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Documents</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => Alert.alert('Upload Document', 'Upload a new document')}
        >
          <AntDesign name="upload" size={18} color="#0A0A0A" />
          <Text style={styles.addButtonText}>Upload</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalDocs}</Text>
          <Text style={styles.statLabel}>Documents</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{categories.length}</Text>
          <Text style={styles.statLabel}>Categories</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>22.8 MB</Text>
          <Text style={styles.statLabel}>Total Size</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {categories.map(cat => (
          <CategorySection
            key={cat.id}
            category={cat}
            isExpanded={expandedCategories.includes(cat.id)}
            onToggle={() => toggleCategory(cat.id)}
          />
        ))}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => Alert.alert('Upload Document', 'Choose file to upload')}
      >
        <AntDesign name="plus" size={24} color="#0A0A0A" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F9FAFB',
    letterSpacing: -0.5,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0A0A0A',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F9FAFB',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  categorySection: {
    marginBottom: 8,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 16,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F9FAFB',
  },
  categoryCount: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  categoryDocuments: {
    marginTop: 6,
    gap: 6,
    paddingLeft: 12,
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 14,
  },
  docIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  docInfo: {
    flex: 1,
  },
  docName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F9FAFB',
    marginBottom: 4,
  },
  docMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  docSize: {
    fontSize: 12,
    color: '#6B7280',
  },
  docDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#6B7280',
  },
  docDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});

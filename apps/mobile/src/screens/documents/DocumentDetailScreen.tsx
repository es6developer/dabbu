import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, TextInput, ActivityIndicator, Image } from 'react-native';
import { DetailSkeleton } from '../../components/ui/AnimatedSkeleton';
import { AntDesign } from '@expo/vector-icons';
import { API_URL } from '../../config/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSilentRefresh } from '../../hooks/useSilentRefresh';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../../store/ToastContext';

import { alertService } from "../../components/ui";
const CATEGORIES = [
  { key: 'aadhaar', label: 'Aadhaar', icon: 'idcard' },
  { key: 'pan', label: 'PAN', icon: 'creditcard' },
  { key: 'passport', label: 'Passport', icon: 'earth' },
  { key: 'driving_license', label: 'Driving License', icon: 'car' },
  { key: 'insurance', label: 'Insurance', icon: 'checkcircle' },
  { key: 'vehicle_rc', label: 'Vehicle RC', icon: 'filetext1' },
  { key: 'warranty', label: 'Warranty', icon: 'filetext1' },
  { key: 'medical', label: 'Medical', icon: 'medicinebox' },
];

function fmtDate(d: string | null) {
  if (!d) {
    return '';
  }
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function DocumentDetailScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { accessToken } = useAuth();
  const { showToast } = useToast();

  const { id, mode, uri, mimeType, fileName: initialFileName } = route.params || {};
  const isUpload = mode === 'upload';

  const [document, setDocument] = useState<any>(null);
  const [loading, setLoading] = useState(!isUpload);
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(initialFileName || '');
  const [category, setCategory] = useState('aadhaar');
  const [documentNumber, setDocumentNumber] = useState('');
  const [issuedDate, setIssuedDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [issuer, setIssuer] = useState('');
  const [notes, setNotes] = useState('');

  const loadDocument = useCallback(async (silent = false, refresh = false) => {
    try {
      if (refresh) setRefreshing(true); else if (!silent) setLoading(true);
      if (accessToken) {
        setAccessToken(accessToken);
      }
      const res = await api.get<any>(`/documents/${id}`);
      const doc = res;
      setDocument(doc);
      setName(doc.name || '');
      setCategory(doc.category || 'aadhaar');
      setDocumentNumber(doc.documentNumber || '');
      setIssuedDate(doc.issuedDate || '');
      setExpiryDate(doc.expiryDate || '');
      setIssuer(doc.issuer || '');
      setNotes(doc.notes || '');
    } catch {
      alertService.alert('Error', 'Failed to load document');
      navigation.goBack();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, id]);

  useSilentRefresh(
    useCallback((isInitial) => {
      if (!isUpload && id) {
        loadDocument(!isInitial);
      }
    }, [id, loadDocument]),
  );

  const handleSave = async () => {
    if (!name.trim()) {
      alertService.alert('Required', 'Document name is required');
      return;
    }
    setSaving(true);
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }

      if (isUpload) {
        const formData = new FormData();
        formData.append('file', {
          uri,
          type: mimeType || 'image/jpeg',
          name: initialFileName || 'document.jpg',
        } as any);
        formData.append('name', name.trim());
        formData.append('category', category);
        if (documentNumber) {
          formData.append('documentNumber', documentNumber);
        }
        if (issuedDate) {
          formData.append('issuedDate', new Date(issuedDate).toISOString());
        }
        if (expiryDate) {
          formData.append('expiryDate', new Date(expiryDate).toISOString());
        }
        if (issuer) {
          formData.append('issuer', issuer);
        }
        if (notes) {
          formData.append('notes', notes);
        }

        await api.post('/documents/upload', formData);
        alertService.alert('Uploaded', 'Document uploaded successfully', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        await api.patch(`/documents/${id}`, {
          name: name.trim(),
          category,
          documentNumber: documentNumber || undefined,
          issuedDate: issuedDate || undefined,
          expiryDate: expiryDate || undefined,
          issuer: issuer || undefined,
          notes: notes || undefined,
        });
        alertService.alert('Saved', 'Document updated successfully');
      }
    } catch {
      alertService.alert('Error', 'Failed to save document');
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const FileSystem = await import('expo-file-system');
      const Sharing = await import('expo-sharing');

      if (accessToken) {
        setAccessToken(accessToken);
      }
      const url = `${API_URL}/documents/${id}/download`;
      const ext = (document?.mimeType || '').split('/')[1] || 'bin';
      const fileUri = `${FileSystem.cacheDirectory}${document?.name || 'file1'}.${ext}`;

      const download = await FileSystem.downloadAsync(url, fileUri, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const sharing = Sharing.default || Sharing;
      if (await sharing.isAvailableAsync()) {
        await sharing.shareAsync(download.uri);
      } else {
        alertService.alert('Downloaded', `File saved to ${download.uri}`);
      }
    } catch {
      alertService.alert('Error', 'Failed to download document');
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = () => {
    alertService.alert('Delete Document', 'Are you sure you want to delete this document?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            if (accessToken) {
              setAccessToken(accessToken);
            }
            await api.delete(`/documents/${id}`);
            showToast('Document deleted');
            navigation.goBack();
          } catch {
            alertService.alert('Error', 'Failed to delete document');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[s.screen, { backgroundColor: colors.bg.primary, paddingTop: insets.top }]}>
        <DetailSkeleton />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <ScrollView
        style={s.screen}
        contentContainerStyle={{ paddingTop: insets.top + 8 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); try { await loadDocument(false, true); } finally { setRefreshing(false); } }} tintColor={colors.accent?.primary || colors.brand?.primary} />}
      >
        <View style={s.form}>
          <Text style={[s.sectionTitle, { color: colors.text.primary }]}>
            {isUpload ? 'Upload Document' : 'Document Details'}
          </Text>

          <Text style={[s.label, { color: colors.text.secondary }]}>Name *</Text>
          <TextInput
            style={[s.input, { backgroundColor: colors.bg.secondary, color: colors.text.primary }]}
            value={name}
            onChangeText={setName}
            placeholder="e.g. My Aadhaar Card"
            placeholderTextColor={colors.text.tertiary}
          />

          <Text style={[s.label, { color: colors.text.secondary }]}>Category</Text>
          <View style={s.categoryRow}>
            {CATEGORIES.map((cat) => {
              const active = category === cat.key;
              return (
                <TouchableOpacity
                  key={cat.key}
                  style={[
                    s.categoryChip,
                    {
                      backgroundColor: active ? colors.accent.primary : colors.bg.secondary,
                    },
                  ]}
                  onPress={() => setCategory(cat.key)}
                  activeOpacity={0.7}
                >
                  <AntDesign
                    name={cat.icon as any}
                    size={14}
                    color={active ? '#FFF' : colors.text.tertiary}
                  />
                  <Text
                    style={[s.categoryChipLabel, { color: active ? '#FFF' : colors.text.tertiary }]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[s.label, { color: colors.text.secondary }]}>Document Number</Text>
          <TextInput
            style={[s.input, { backgroundColor: colors.bg.secondary, color: colors.text.primary }]}
            value={documentNumber}
            onChangeText={setDocumentNumber}
            placeholder="e.g. XXXX-XXXX-XXXX"
            placeholderTextColor={colors.text.tertiary}
          />

          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={[s.label, { color: colors.text.secondary }]}>Issued Date</Text>
              <TextInput
                style={[
                  s.input,
                  { backgroundColor: colors.bg.secondary, color: colors.text.primary },
                ]}
                value={issuedDate}
                onChangeText={setIssuedDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={[s.label, { color: colors.text.secondary }]}>Expiry Date</Text>
              <TextInput
                style={[
                  s.input,
                  { backgroundColor: colors.bg.secondary, color: colors.text.primary },
                ]}
                value={expiryDate}
                onChangeText={setExpiryDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>
          </View>

          <Text style={[s.label, { color: colors.text.secondary }]}>Issuing Authority</Text>
          <TextInput
            style={[s.input, { backgroundColor: colors.bg.secondary, color: colors.text.primary }]}
            value={issuer}
            onChangeText={setIssuer}
            placeholder="e.g. Government of India"
            placeholderTextColor={colors.text.tertiary}
          />

          <Text style={[s.label, { color: colors.text.secondary }]}>Notes</Text>
          <TextInput
            style={[
              s.input,
              s.textArea,
              { backgroundColor: colors.bg.secondary, color: colors.text.primary },
            ]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Any additional notes..."
            placeholderTextColor={colors.text.tertiary}
            multiline
            numberOfLines={3}
          />
        </View>
      </ScrollView>

      <View style={{ paddingBottom: insets.bottom + 16, paddingHorizontal: 20, paddingTop: 12 }}>
        <TouchableOpacity
          style={[s.button, { backgroundColor: colors.accent.primary }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.7}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <AntDesign name={(isUpload ? 'cloudupload' : 'check') as any} size={18} color="#FFF" />
              <Text style={s.buttonText}>{isUpload ? 'Upload & Save' : 'Save Changes'}</Text>
            </>
          )}
        </TouchableOpacity>

        {!isUpload && (
          <>
            <TouchableOpacity
              style={[s.button, { backgroundColor: colors.bg.secondary, marginTop: 8 }]}
              onPress={handleDownload}
              disabled={downloading}
              activeOpacity={0.7}
            >
              {downloading ? (
                <ActivityIndicator size="small" color={colors.text.primary} />
              ) : (
                <>
                  <AntDesign  name="download" size={18} color={colors.text.primary} />
                  <Text style={[s.buttonText, { color: colors.text.primary }]}>Download</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.button, { backgroundColor: '#FF3B3018', marginTop: 8 }]}
              onPress={handleDelete}
              activeOpacity={0.7}
            >
              <AntDesign  name="delete" size={18} color="#FF3B30" />
              <Text style={[s.buttonText, { color: '#FF3B30' }]}>Delete Document</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  form: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 22, fontWeight: '800', marginBottom: 20 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 16 },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row' },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  categoryChipLabel: { fontSize: 12, fontWeight: '600' },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  buttonText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
});

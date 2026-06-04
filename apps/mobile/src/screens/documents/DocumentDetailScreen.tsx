import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../../config/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';

const CATEGORIES = [
  { key: 'aadhaar', label: 'Aadhaar', icon: 'id-card' },
  { key: 'pan', label: 'PAN', icon: 'card' },
  { key: 'passport', label: 'Passport', icon: 'globe' },
  { key: 'driving_license', label: 'Driving License', icon: 'car' },
  { key: 'insurance', label: 'Insurance', icon: 'shield-checkmark' },
  { key: 'vehicle_rc', label: 'Vehicle RC', icon: 'document-text' },
  { key: 'warranty', label: 'Warranty', icon: 'receipt' },
  { key: 'medical', label: 'Medical', icon: 'medkit' },
];

function fmtDate(d: string | null) {
  if (!d) {return '';}
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function DocumentDetailScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { accessToken } = useAuth();

  const { id, mode, uri, mimeType, fileName: initialFileName } = route.params || {};
  const isUpload = mode === 'upload';

  const [document, setDocument] = useState<any>(null);
  const [loading, setLoading] = useState(!isUpload);
  const [downloading, setDownloading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(initialFileName || '');
  const [category, setCategory] = useState('aadhaar');
  const [documentNumber, setDocumentNumber] = useState('');
  const [issuedDate, setIssuedDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [issuer, setIssuer] = useState('');
  const [notes, setNotes] = useState('');

  useFocusEffect(
    useCallback(() => {
      if (!isUpload && id) {
        loadDocument();
      }
    }, [id]),
  );

  const loadDocument = async () => {
    try {
      if (accessToken) {setAccessToken(accessToken);}
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
      Alert.alert('Error', 'Failed to load document');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Document name is required');
      return;
    }
    setSaving(true);
    try {
      if (accessToken) {setAccessToken(accessToken);}

      if (isUpload) {
        const formData = new FormData();
        formData.append('file', {
          uri,
          type: mimeType || 'image/jpeg',
          name: initialFileName || 'document.jpg',
        } as any);
        formData.append('name', name.trim());
        formData.append('category', category);
        if (documentNumber) {formData.append('documentNumber', documentNumber);}
        if (issuedDate) {formData.append('issuedDate', new Date(issuedDate).toISOString());}
        if (expiryDate) {formData.append('expiryDate', new Date(expiryDate).toISOString());}
        if (issuer) {formData.append('issuer', issuer);}
        if (notes) {formData.append('notes', notes);}

        await api.post('/documents/upload', formData);
        Alert.alert('Uploaded', 'Document uploaded successfully', [
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
        Alert.alert('Saved', 'Document updated successfully');
      }
    } catch {
      Alert.alert('Error', 'Failed to save document');
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const FileSystem = await import('expo-file-system');
      const Sharing = await import('expo-sharing');

      if (accessToken) {setAccessToken(accessToken);}
      const url = `${API_URL}/documents/${id}/download`;
      const fileUri = `${FileSystem.cacheDirectory}${document?.name || 'document'}`;

      const download = await FileSystem.downloadAsync(url, fileUri, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const sharing = Sharing.default || Sharing;
      if (await sharing.isAvailableAsync()) {
        await sharing.shareAsync(download.uri);
      } else {
        Alert.alert('Downloaded', `File saved to ${download.uri}`);
      }
    } catch {
      Alert.alert('Error', 'Failed to download document');
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Document', 'Are you sure you want to delete this document?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            if (accessToken) {setAccessToken(accessToken);}
            await api.delete(`/documents/${id}`);
            navigation.goBack();
          } catch {
            Alert.alert('Error', 'Failed to delete document');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[s.screen, { backgroundColor: colors.bg.primary, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.accent.primary} style={{ marginTop: 80 }} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[s.screen, { backgroundColor: colors.bg.primary }]}
      contentContainerStyle={{ paddingBottom: 40, paddingTop: insets.top + 8 }}
      keyboardShouldPersistTaps="handled"
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
                <Ionicons
                  name={cat.icon as any}
                  size={14}
                  color={active ? '#FFF' : colors.text.tertiary}
                />
                <Text
                  style={[
                    s.categoryChipLabel,
                    { color: active ? '#FFF' : colors.text.tertiary },
                  ]}
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
              style={[s.input, { backgroundColor: colors.bg.secondary, color: colors.text.primary }]}
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
              style={[s.input, { backgroundColor: colors.bg.secondary, color: colors.text.primary }]}
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

        <View style={{ marginTop: 24, gap: 12 }}>
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
                <Ionicons name={isUpload ? 'cloud-upload' : 'checkmark'} size={18} color="#FFF" />
                <Text style={s.buttonText}>{isUpload ? 'Upload & Save' : 'Save Changes'}</Text>
              </>
            )}
          </TouchableOpacity>

          {!isUpload && (
            <>
              <TouchableOpacity
                style={[s.button, { backgroundColor: colors.bg.secondary }]}
                onPress={handleDownload}
                disabled={downloading}
                activeOpacity={0.7}
              >
                {downloading ? (
                  <ActivityIndicator size="small" color={colors.text.primary} />
                ) : (
                  <>
                    <Ionicons name="download" size={18} color={colors.text.primary} />
                    <Text style={[s.buttonText, { color: colors.text.primary }]}>Download</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.button, { backgroundColor: '#FF3B3018' }]}
                onPress={handleDelete}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                <Text style={[s.buttonText, { color: '#FF3B30' }]}>Delete Document</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </ScrollView>
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

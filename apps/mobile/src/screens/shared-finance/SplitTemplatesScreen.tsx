import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { api } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { ListSkeleton } from '../../components/ui/AnimatedSkeleton';
import { useTheme } from '../../theme';
import { PageContainer } from '../../components/ui/PageContainer';
import { KeyboardAvoidingContainer } from '../../components/ui/KeyboardAvoidingContainer';
import { useToast } from '../../store/ToastContext';

const GROUP_TYPES = ['friends', 'couple', 'trip', 'family', 'roommates'] as const;
const ICONS = [
  'documents',
  'card',
  'cash',
  'cart',
  'airplane',
  'home',
  'car',
  'fitness',
  'school',
  'gift',
];

const fmt = (v: number) => '₹' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

export function SplitTemplatesScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { accessToken } = useAuth();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const groupId = route.params?.groupId;

  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [groupType, setGroupType] = useState('friends');
  const [icon, setIcon] = useState('documents');
  const [coverColor, setCoverColor] = useState('#f7892c');
  const [creating, setCreating] = useState(false);

  const loadTemplates = useCallback(async () => {
    if (accessToken) {
      const res = await api.get<any>('/shared-finance/split-templates');
      setTemplates(Array.isArray(res) ? res : []);
    }
    setLoading(false);
    setRefreshing(false);
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      loadTemplates();
    }, [loadTemplates]),
  );

  const handleCreate = async () => {
    if (!name.trim()) {
      return;
    }
    setCreating(true);
    try {
      await api.post('/shared-finance/split-templates', {
        name: name.trim(),
        description: description.trim() || undefined,
        groupType,
        icon,
        coverColor,
      });
      showToast('Template created');
      setShowCreate(false);
      setName('');
      setDescription('');
      setGroupType('friends');
      setIcon('documents');
      setCoverColor('#f7892c');
      loadTemplates();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to create template');
    } finally {
      setCreating(false);
    }
  };

  const handleApply = async (templateId: string) => {
    if (!groupId) {
      return;
    }
    setApplyingId(templateId);
    try {
      const res = await api.post<any>(`/shared-finance/groups/${groupId}/apply-template`, {
        templateId,
      });
      Alert.alert('Template Applied', res?.message || 'Template applied to group');
      loadTemplates();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to apply template');
    } finally {
      setApplyingId(null);
    }
  };

  const handleDelete = (templateId: string) => {
    Alert.alert('Delete Template', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/shared-finance/split-templates/${templateId}`);
            showToast('Template deleted');
            loadTemplates();
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Failed to delete');
          }
        },
      },
    ]);
  };

  const PRESET_COLORS = [
    '#f7892c',
    '#e74c3c',
    '#3498db',
    '#2ecc71',
    '#9b59b6',
    '#1abc9c',
    '#e67e22',
    '#34495e',
  ];

  if (loading) {
    return (
      <PageContainer>
        <View style={[s.container, { backgroundColor: colors.bg.primary }]}>
          <ListSkeleton />
        </View>
      </PageContainer>
    );
  }

  return (
    <PageContainer noPadding>
      <KeyboardAvoidingContainer>
        <View style={[s.container, { backgroundColor: colors.bg.primary }]}>
          <View style={s.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
              <AntDesign  name="left" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={[s.title, { color: colors.text.primary }]}>Split Templates</Text>
            <TouchableOpacity
              onPress={() => setShowCreate(true)}
              style={[s.addBtn, { backgroundColor: colors.accent.primary }]}
            >
              <AntDesign  name="plus" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={templates}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, gap: 12 }}
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadTemplates();
            }}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingVertical: 60 }}>
                <Ionicons  name="documents" size={48} color={colors.text.tertiary} />
                <Text style={[s.emptyText, { color: colors.text.tertiary }]}>
                  No templates yet. Create one!
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View
                style={[
                  s.card,
                  { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
                ]}
              >
                <View style={s.cardTop}>
                  <View style={s.iconWrap}>
                    <AntDesign
                      name={item.icon as any}
                      size={24}
                      color={item.coverColor || coverColor}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.cardName, { color: colors.text.primary }]}>{item.name}</Text>
                    {item.description && (
                      <Text style={[s.cardDesc, { color: colors.text.tertiary }]} numberOfLines={1}>
                        {item.description}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(item.id)} style={s.deleteBtn}>
                    <AntDesign  name="delete" size={16} color={colors.status.error} />
                  </TouchableOpacity>
                </View>
                <View style={s.metaRow}>
                  <View style={[s.badge, { backgroundColor: `${colors.accent.primary}15` }]}>
                    <AntDesign  name="team" size={11} color={colors.accent.primary} />
                    <Text style={[s.badgeText, { color: colors.accent.primary }]}>
                      {item.groupType}
                    </Text>
                  </View>
                  <Text style={[s.usageText, { color: colors.text.tertiary }]}>
                    Used {item.usageCount || 0} times
                  </Text>
                  {item.isOfficial && (
                    <View style={[s.badge, { backgroundColor: `${colors.status.success}15` }]}>
                      <AntDesign  name="checkcircleo" size={11} color={colors.status.success} />
                      <Text style={[s.badgeText, { color: colors.status.success }]}>Official</Text>
                    </View>
                  )}
                </View>
                {groupId && (
                  <TouchableOpacity
                    style={[s.applyBtn, { backgroundColor: colors.accent.primary }]}
                    onPress={() => handleApply(item.id)}
                    disabled={applyingId === item.id}
                  >
                    {applyingId === item.id ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <AntDesign  name="download" size={16} color="#FFF" />
                        <Text style={s.applyText}>Apply to Group</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}
            windowSize={10}
            maxToRenderPerBatch={10}
          />

          {showCreate && (
            <View style={s.overlay}>
              <View style={[s.modal, { backgroundColor: colors.bg.secondary }]}>
                <Text style={[s.modalTitle, { color: colors.text.primary }]}>New Template</Text>
                <TextInput
                  style={[
                    s.input,
                    {
                      backgroundColor: colors.bg.tertiary,
                      color: colors.text.primary,
                      borderColor: colors.border.subtle,
                    },
                  ]}
                  placeholder="Template name"
                  placeholderTextColor={colors.text.tertiary}
                  value={name}
                  onChangeText={setName}
                />
                <TextInput
                  style={[
                    s.input,
                    {
                      backgroundColor: colors.bg.tertiary,
                      color: colors.text.primary,
                      borderColor: colors.border.subtle,
                    },
                  ]}
                  placeholder="Description (optional)"
                  placeholderTextColor={colors.text.tertiary}
                  value={description}
                  onChangeText={setDescription}
                />
                <Text style={[s.label, { color: colors.text.secondary }]}>Group Type</Text>
                <View style={s.chipRow}>
                  {GROUP_TYPES.map((gt) => (
                    <TouchableOpacity
                      key={gt}
                      style={[
                        s.chip,
                        {
                          backgroundColor:
                            groupType === gt ? `${colors.accent.primary}20` : colors.bg.tertiary,
                          borderColor:
                            groupType === gt ? colors.accent.primary : colors.border.subtle,
                        },
                      ]}
                      onPress={() => setGroupType(gt)}
                    >
                      <Text
                        style={[
                          s.chipText,
                          {
                            color: groupType === gt ? colors.accent.primary : colors.text.secondary,
                          },
                        ]}
                      >
                        {gt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={[s.label, { color: colors.text.secondary }]}>Icon</Text>
                <View style={s.chipRow}>
                  {ICONS.map((ic) => (
                    <TouchableOpacity
                      key={ic}
                      style={[
                        s.iconChip,
                        {
                          backgroundColor:
                            icon === ic ? `${colors.accent.primary}20` : colors.bg.tertiary,
                          borderColor: icon === ic ? colors.accent.primary : colors.border.subtle,
                        },
                      ]}
                      onPress={() => setIcon(ic)}
                    >
                      <AntDesign
                        name={ic as any}
                        size={18}
                        color={icon === ic ? colors.accent.primary : colors.text.secondary}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={[s.label, { color: colors.text.secondary }]}>Color</Text>
                <View style={s.chipRow}>
                  {PRESET_COLORS.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[
                        s.colorDot,
                        {
                          backgroundColor: c,
                          borderColor: coverColor === c ? colors.text.primary : 'transparent',
                          borderWidth: coverColor === c ? 2.5 : 0,
                        },
                      ]}
                      onPress={() => setCoverColor(c)}
                    />
                  ))}
                </View>
                <View style={s.modalActions}>
                  <TouchableOpacity onPress={() => setShowCreate(false)} style={s.cancelBtn}>
                    <Text style={[s.cancelText, { color: colors.text.secondary }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleCreate}
                    disabled={creating || !name.trim()}
                    style={[
                      s.confirmBtn,
                      { backgroundColor: name.trim() ? colors.accent.primary : colors.bg.tertiary },
                    ]}
                  >
                    <Text style={s.confirmText}>{creating ? 'Creating...' : 'Create'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingContainer>
    </PageContainer>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: { fontSize: 22, fontWeight: '800' },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: { textAlign: 'center', marginTop: 100, fontSize: 15 },
  emptyText: { fontSize: 14, marginTop: 12 },
  card: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardName: { fontSize: 16, fontWeight: '700' },
  cardDesc: { fontSize: 13, marginTop: 2 },
  deleteBtn: { padding: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: { fontSize: 11, fontWeight: '600' },
  usageText: { fontSize: 11, fontWeight: '500' },
  catRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  catText: { fontSize: 11, fontWeight: '500' },
  catMore: { fontSize: 11, fontWeight: '500', alignSelf: 'center' },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 12,
    marginTop: 2,
  },
  applyText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: { width: '100%', maxHeight: '90%', borderRadius: 22, padding: 24, gap: 14 },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  label: { fontSize: 13, fontWeight: '600' },
  input: { height: 48, borderRadius: 12, paddingHorizontal: 16, fontSize: 15, borderWidth: 1 },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '600' },
  iconChip: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  colorDot: { width: 32, height: 32, borderRadius: 18, borderWidth: 0 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 12 },
  cancelText: { fontSize: 15, fontWeight: '600' },
  confirmBtn: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
  confirmText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});

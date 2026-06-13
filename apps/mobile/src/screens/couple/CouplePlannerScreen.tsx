import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  TextInput,
  Modal,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { LoadingScreen } from '../../components/ui/LoadingScreen';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 50) / 2;

const CATEGORY_COLORS: Record<string, string> = {
  home: '#FF6B6B',
  travel: '#60A5FA',
  wedding: '#A78BFA',
  car: '#34C759',
  baby: '#FF8A65',
  emergency: '#F59E0B',
  investment: '#14B8A6',
  education: '#8B5CF6',
  other: '#64748B',
};

const CATEGORY_ICONS: Record<string, string> = {
  home: 'home',
  travel: 'airplane',
  wedding: 'heart',
  car: 'car',
  baby: 'happy',
  emergency: 'shield',
  investment: 'trending-up',
  education: 'school',
  other: 'flag',
};

function PlannerCard({ item, onPress }: { item: any; onPress: () => void }) {
  const target = Number(item.targetAmount || 0);
  const current = Number(item.currentSavings || 0);
  const progress = target > 0 ? (current / target) * 100 : 0;
  const cat = item.category || 'other';
  const color = CATEGORY_COLORS[cat] || '#64748B';
  const icon = item.icon || CATEGORY_ICONS[cat] || 'flag';

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        width: CARD_WIDTH,
        backgroundColor: '#161224',
        borderRadius: 18,
        padding: 14,
        marginBottom: 10,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          backgroundColor: `${color}18`,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 8,
        }}
      >
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFF' }} numberOfLines={1}>
        {item.title || item.plannerType}
      </Text>
      <View style={{ marginTop: 8, height: 4, backgroundColor: '#1E293B', borderRadius: 2 }}>
        <View
          style={{
            width: `${Math.min(progress, 100)}%`,
            height: 4,
            backgroundColor: color,
            borderRadius: 2,
          }}
        />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFF' }}>
          \u20B9{Math.round(current).toLocaleString('en-IN')}
        </Text>
        <Text style={{ fontSize: 11, color: '#64748B' }}>{Math.round(progress)}%</Text>
      </View>
      {item.deadline && (
        <Text style={{ fontSize: 10, color: '#475569', marginTop: 4 }}>
          By{' '}
          {new Date(item.deadline).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
        </Text>
      )}
    </TouchableOpacity>
  );
}

export function CouplePlannerScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [planners, setPlanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [contributeId, setContributeId] = useState<string | null>(null);
  const [contributeAmount, setContributeAmount] = useState('');
  const [contributing, setContributing] = useState(false);

  const fetchPlanners = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const res = await api.get<any[]>('/couple/planners');
      setPlanners(Array.isArray(res) ? res : []);
    } catch {
      /* silently ignore */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPlanners();
  }, [fetchPlanners]);

  const createPlanner = useCallback(async () => {
    if (!form.title || !form.targetAmount) {
      return;
    }
    try {
      await api.post('/couple/planners/dream', {
        title: form.title,
        targetAmount: parseFloat(form.targetAmount),
        category: form.category || 'other',
        icon: CATEGORY_ICONS[form.category || 'other'],
      });
      setShowCreate(false);
      setForm({});
      fetchPlanners(true);
    } catch {
      /* silently ignore */
    }
  }, [form, fetchPlanners]);

  const contribute = useCallback((id: string) => {
    setContributeId(id);
    setContributeAmount('');
  }, []);

  const handleContribute = useCallback(async () => {
    if (!contributeId) {
      return;
    }
    const amount = parseFloat(contributeAmount);
    if (!amount || amount <= 0) {
      return;
    }
    setContributing(true);
    try {
      await api.post(`/couple/planners/${contributeId}/contribute`, { amount });
      setContributeId(null);
      fetchPlanners(true);
    } catch {
      /* silently ignore */
    } finally {
      setContributing(false);
    }
  }, [contributeId, contributeAmount, fetchPlanners]);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0D0B1A' }}>
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 20,
          paddingBottom: 12,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: '#1E293B',
        }}
      >
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <View>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFF' }}>Planners</Text>
              <Text style={{ fontSize: 12, color: '#64748B' }}>
                Dream it, save it, achieve it together
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={{ backgroundColor: '#8B5CF6', borderRadius: 14, padding: 8 }}
            onPress={() => setShowCreate(true)}
          >
            <Ionicons name="add" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={planners}
        numColumns={2}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={{ gap: 10, paddingHorizontal: 20 }}
        contentContainerStyle={{ paddingTop: 14, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchPlanners(true)}
            tintColor="#8B5CF6"
          />
        }
        renderItem={({ item }) => <PlannerCard item={item} onPress={() => contribute(item.id)} />}
        ListEmptyComponent={
          <View style={{ padding: 60, alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 20,
                backgroundColor: '#8B5CF618',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="map-outline" size={28} color="#8B5CF6" />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFF' }}>No planners yet</Text>
            <Text style={{ fontSize: 12, color: '#64748B', textAlign: 'center' }}>
              Create your first dream board to start saving{'\n'}for something special together.
            </Text>
          </View>
        }
      />

      <Modal visible={showCreate} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: '#161224',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFF', marginBottom: 20 }}>
              New Dream Board
            </Text>
            <TextInput
              placeholder="Title (e.g. Our Dream Home)"
              placeholderTextColor="#475569"
              style={{
                backgroundColor: '#1E293B',
                borderRadius: 12,
                padding: 14,
                fontSize: 14,
                color: '#FFF',
                marginBottom: 12,
              }}
              value={form.title}
              onChangeText={(t) => setForm((f: Record<string, any>) => ({ ...f, title: t }))}
            />
            <TextInput
              placeholder="Target Amount (\u20B9)"
              placeholderTextColor="#475569"
              keyboardType="numeric"
              style={{
                backgroundColor: '#1E293B',
                borderRadius: 12,
                padding: 14,
                fontSize: 14,
                color: '#FFF',
                marginBottom: 12,
              }}
              value={form.targetAmount}
              onChangeText={(t) => setForm((f: Record<string, any>) => ({ ...f, targetAmount: t }))}
            />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {Object.keys(CATEGORY_COLORS).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    borderRadius: 20,
                    backgroundColor:
                      form.category === cat ? `${CATEGORY_COLORS[cat]}30` : '#1E293B',
                    borderWidth: 1,
                    borderColor: form.category === cat ? CATEGORY_COLORS[cat] : '#1E293B',
                  }}
                  onPress={() => setForm((f: Record<string, any>) => ({ ...f, category: cat }))}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '600',
                      color: form.category === cat ? CATEGORY_COLORS[cat] : '#94A3B8',
                    }}
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: 14,
                  backgroundColor: '#1E293B',
                  alignItems: 'center',
                }}
                onPress={() => setShowCreate(false)}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#64748B' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: 14,
                  backgroundColor: form.title && form.targetAmount ? '#8B5CF6' : '#1E293B',
                  alignItems: 'center',
                }}
                disabled={!form.title || !form.targetAmount}
                onPress={createPlanner}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '700',
                    color: form.title && form.targetAmount ? '#FFF' : '#475569',
                  }}
                >
                  Create
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!contributeId} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: '#161224',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFF', marginBottom: 20 }}>
              Add Contribution
            </Text>
            <TextInput
              placeholder="Amount (₹)"
              placeholderTextColor="#475569"
              keyboardType="numeric"
              style={{
                backgroundColor: '#1E293B',
                borderRadius: 12,
                padding: 14,
                fontSize: 14,
                color: '#FFF',
                marginBottom: 20,
              }}
              value={contributeAmount}
              onChangeText={setContributeAmount}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: 14,
                  backgroundColor: '#1E293B',
                  alignItems: 'center',
                }}
                onPress={() => setContributeId(null)}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#64748B' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: 14,
                  backgroundColor:
                    contributeAmount && parseFloat(contributeAmount) > 0 ? '#8B5CF6' : '#1E293B',
                  alignItems: 'center',
                }}
                disabled={!contributeAmount || parseFloat(contributeAmount) <= 0 || contributing}
                onPress={handleContribute}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '700',
                    color:
                      contributeAmount && parseFloat(contributeAmount) > 0 ? '#FFF' : '#475569',
                  }}
                >
                  {contributing ? 'Adding...' : 'Add'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

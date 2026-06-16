import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Vibration,
  Platform,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: Date;
  paidBy: string;
}

interface Space {
  id: string;
  name: string;
  category: 'couple' | 'family' | 'trip' | 'friends';
  members: { name: string; avatar?: string }[];
  balance: number;
  totalSpent: number;
  transactionCount: number;
  lastActive: Date;
  isActive: boolean;
  transactions?: Transaction[];
  monthlyBudget?: number;
  budgetUsed?: number;
}

const MOCK_SPACES: Space[] = [
  {
    id: '1',
    name: "Jayasri & Karthik's Space",
    category: 'couple',
    members: [
      { name: 'Jayasri' },
      { name: 'Karthik' },
    ],
    balance: 0,
    totalSpent: 0,
    transactionCount: 0,
    lastActive: new Date(Date.now() - 20 * 60 * 60 * 1000),
    isActive: true,
    transactions: [],
  },
  {
    id: '2',
    name: 'Test Group',
    category: 'family',
    members: [
      { name: 'You' },
      { name: 'Priya' },
      { name: 'Rahul' },
    ],
    balance: 75,
    totalSpent: 650,
    transactionCount: 8,
    lastActive: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    isActive: true,
    transactions: [
      { id: 't1', description: 'Grocery run', amount: 120, date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), paidBy: 'Priya' },
      { id: 't2', description: 'Dinner at BBQ', amount: 85, date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), paidBy: 'Rahul' },
      { id: 't3', description: 'Cab to airport', amount: 45, date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), paidBy: 'You' },
    ],
    monthlyBudget: 1600,
    budgetUsed: 650,
  },
  {
    id: '3',
    name: 'Valparai Trip',
    category: 'trip',
    members: [
      { name: 'You' },
      { name: 'Priya' },
      { name: 'Rahul' },
      { name: 'Ananya' },
    ],
    balance: 707,
    totalSpent: 602,
    transactionCount: 13,
    lastActive: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    isActive: true,
    transactions: [
      { id: 't4', description: 'Homestay booking', amount: 200, date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), paidBy: 'Ananya' },
      { id: 't5', description: 'Fuel & tolls', amount: 150, date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), paidBy: 'You' },
      { id: 't6', description: 'Dinner at Zostel', amount: 90, date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), paidBy: 'Priya' },
    ],
  },
];

const CATEGORY_MAP: Record<string, { label: string; icon: string }> = {
  couple: { label: 'Couple', icon: 'heart' },
  family: { label: 'Family', icon: 'team' },
  trip: { label: 'Trip', icon: 'earth' },
  friends: { label: 'Friends', icon: 'gift' },
};

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const hrs = Math.floor(diff / (1000 * 60 * 60));
  if (hrs < 1) return `${Math.floor(diff / (1000 * 60))}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function fmt(v: number) {
  return '₹' + v.toLocaleString('en-IN');
}

function CircularProgress({ pct, size = 40, stroke = 4, color }: { pct: number; size?: number; stroke?: number; color: string }) {
  const { colors } = useTheme();
  const animatedVal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedVal, {
      toValue: pct,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [pct]);

  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const dashOffset = animatedVal.interpolate({
    inputRange: [0, 100],
    outputRange: [circ, 0],
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: stroke, borderColor: colors.border.subtle }} />
      <Animated.View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: stroke,
          borderColor: 'transparent',
          borderTopColor: color,
          borderRightColor: color,
          transform: [{ rotate: '-90deg' }],
          opacity: animatedVal.interpolate({ inputRange: [0, 100], outputRange: [0, 1] }),
        } as any}
      />
      <Text style={{ fontSize: 10, fontWeight: '700', color }}>{pct}%</Text>
    </View>
  );
}

function SpaceCard({
  space,
  index,
  isExpanded,
  onToggle,
  onLongPress,
}: {
  space: Space;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onLongPress: () => void;
}) {
  const { colors } = useTheme();
  const swipeAnim = useRef(new Animated.Value(0)).current;
  const isCouple = space.category === 'couple';
  const cat = CATEGORY_MAP[space.category] || { label: space.category, icon: 'appstore1' };
  const catLabel = `${cat.label} ${cat.icon}`;

  const onSwipeStart = useCallback(() => {
    Animated.spring(swipeAnim, {
      toValue: -80,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, []);

  const resetSwipe = useCallback(() => {
    Animated.spring(swipeAnim, {
      toValue: 0,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, []);

  function renderTransactions() {
    if (!space.transactions || space.transactions.length === 0) return null;
    const shown = space.transactions.slice(0, 3);
    return (
      <View style={{ marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: isCouple ? 'rgba(255,255,255,0.15)' : colors.border.subtle }}>
        {shown.map((t) => (
          <View key={t.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
              <AntDesign name="filetext1" size={14} color={isCouple ? 'rgba(255,255,255,0.6)' : colors.text.tertiary} />
              <Text style={{ fontSize: 13, color: isCouple ? '#fff' : colors.text.primary, flex: 1 }} numberOfLines={1}>{t.description}</Text>
            </View>
            <Text style={{ fontSize: 13, fontWeight: '600', color: isCouple ? '#fff' : colors.text.primary }}>{fmt(t.amount)}</Text>
          </View>
        ))}
        {space.category === 'couple' && (
          <TouchableOpacity style={{ marginTop: 10, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>Start tracking shared expenses →</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  function renderAvatar(name: string, idx: number, isLight?: boolean) {
    const initials = name.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase();
    const bg = isLight ? 'rgba(255,255,255,0.2)' : colors.bg.tertiary;
    return (
      <View key={idx} style={[s.avatar, { backgroundColor: bg, borderColor: isLight ? 'rgba(255,255,255,0.4)' : colors.border.default, marginLeft: idx > 0 ? -10 : 0, zIndex: 10 - idx }]}>
        <Text style={{ fontSize: 10, fontWeight: '700', color: isLight ? '#fff' : colors.text.primary }}>{initials}</Text>
      </View>
    );
  }

  const oweColor = space.balance > 0 ? colors.status.warning : colors.status.success;
  const oweLabel = space.balance > 0 ? 'You owe' : "You're owed";

  const cardContent = (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={[s.catPill, { backgroundColor: isCouple ? 'rgba(255,255,255,0.15)' : `${colors.accent.primary}10` }]}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: isCouple ? '#fff' : colors.text.secondary }}>{catLabel}</Text>
          </View>
          {space.balance !== 0 && (
            <View style={[s.owePill, { backgroundColor: oweColor + '18' }]}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: oweColor }}>
                {oweLabel} {fmt(Math.abs(space.balance))}
              </Text>
            </View>
          )}
        </View>
        <Text style={{ fontSize: 11, color: isCouple ? 'rgba(255,255,255,0.5)' : colors.text.tertiary }}>
          {timeAgo(space.lastActive)}
        </Text>
      </View>

      <Text style={{ fontSize: 17, fontWeight: '700', color: isCouple ? '#fff' : colors.text.primary, marginBottom: 4 }}>
        {space.name}
      </Text>

      {!isCouple && (
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 6 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, color: colors.text.tertiary }}>Total spent</Text>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text.primary }}>{fmt(space.totalSpent)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, color: colors.text.tertiary }}>Expenses</Text>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text.primary }}>{space.transactionCount}</Text>
          </View>
        </View>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 }}>
        <View style={{ flexDirection: 'row' }}>
          {space.members.map((m, i) => renderAvatar(m.name, i, isCouple))}
        </View>
        <Text style={{ fontSize: 12, color: isCouple ? 'rgba(255,255,255,0.6)' : colors.text.tertiary }}>
          {space.members.length} people
        </Text>
        {!isCouple && space.monthlyBudget && (
          <View style={{ flex: 1, marginLeft: 8 }}>
            <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.bg.tertiary, overflow: 'hidden' }}>
              <View style={{ width: `${Math.min((space.budgetUsed! / space.monthlyBudget) * 100, 100)}%`, height: '100%', backgroundColor: colors.accent.primary, borderRadius: 2 }} />
            </View>
            <Text style={{ fontSize: 10, color: colors.text.tertiary, marginTop: 2 }}>{Math.round((space.budgetUsed! / space.monthlyBudget) * 100)}% used</Text>
          </View>
        )}
      </View>

      {isExpanded && renderTransactions()}

      {isExpanded && !isCouple && (
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          <TouchableOpacity style={[s.primaryBtn, { backgroundColor: colors.accent.primary }]}>
            <AntDesign name="plus" size={16} color="#FFF" />
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFF' }}>Add expense</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.outlineBtn, { borderColor: colors.border.default }]}>
            <AntDesign name="swap" size={16} color={colors.text.secondary} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.secondary }}>
              {space.category === 'trip' ? 'Settle up' : 'Settle'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {isCouple && isExpanded && space.transactions?.length === 0 && (
        <View style={{ marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)', alignItems: 'center', paddingVertical: 8 }}>
          <Text style={{ fontSize: 14, color: '#fff', textAlign: 'center', lineHeight: 20 }}>
            {'✨ No expenses yet\nShare your first bill →'}
          </Text>
          <TouchableOpacity style={{ marginTop: 12, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>Add expense</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (isCouple) {
    return (
      <TouchableOpacity activeOpacity={0.9} onPress={onToggle} onLongPress={onLongPress} delayLongPress={500}>
        <View style={{ backgroundColor: colors.accent.primary, padding: 20, borderRadius: 16, marginBottom: 16 }}>
          {cardContent}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <Animated.View style={{ transform: [{ translateX: swipeAnim }] }}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onToggle}
        onLongPress={onLongPress}
        delayLongPress={500}
        style={[s.card, { backgroundColor: colors.bg.card, borderRadius: 16, marginBottom: 16, padding: 20 }]}
      >
        {cardContent}
      </TouchableOpacity>
    </Animated.View>
  );
}

export function SpacesDashboardScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [spaces] = useState(MOCK_SPACES);

  const handleToggle = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const handleLongPress = useCallback(() => {
    if (Platform.OS !== 'web') {
      Vibration.vibrate(50);
    }
  }, []);

  const totalOwe = spaces.reduce((sum, s) => sum + (s.balance > 0 ? s.balance : 0), 0);
  const activeSpaces = spaces.filter(s => s.isActive).length;
  const settledPct = 65;

  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary }]}>
      <View style={{ paddingTop: insets.top + 12, paddingBottom: 16, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text.primary, letterSpacing: -0.5 }}>Spaces</Text>
              <View style={{ backgroundColor: colors.status.warning + '18', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.status.warning }}>
                  {fmt(totalOwe)} to settle
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 13, color: colors.text.tertiary }}>
              across {activeSpaces} {activeSpaces === 1 ? 'space' : 'spaces'}
            </Text>
          </View>
          <CircularProgress pct={settledPct} size={40} stroke={4} color={colors.accent.primary} />
          <TouchableOpacity style={{ marginLeft: 12 }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accent.primary + '15', alignItems: 'center', justifyContent: 'center' }}>
              <AntDesign name="user" size={18} color={colors.accent.primary} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {spaces.map((space, i) => (
          <View key={space.id} style={{ position: 'relative' }}>
            <TouchableOpacity
              style={{
                position: 'absolute',
                right: 0,
                top: 0,
                bottom: 16,
                width: 80,
                backgroundColor: colors.status.error + '15',
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AntDesign name="folder1" size={22} color={colors.status.error} />
              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.status.error, marginTop: 2 }}>Archive</Text>
            </TouchableOpacity>
            <SpaceCard
              space={space}
              index={i}
              isExpanded={expandedId === space.id}
              onToggle={() => handleToggle(space.id)}
              onLongPress={handleLongPress}
            />
          </View>
        ))}

        <TouchableOpacity
          style={{ marginTop: 8 }}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 16, backgroundColor: colors.accent.primary }}>
            <AntDesign name="plus" size={20} color="#FFF" />
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFF' }}>Create new space</Text>
      </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  catPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  owePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  outlineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
});

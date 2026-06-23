import React, { useState, useRef, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Keyboard } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { KEYWORD_CATEGORIES } from '../../constants/smartEntryKeywords';

const COMMON_SUGGESTIONS = [
  'Chai', 'Auto rickshaw', 'Vegetable vendor', 'Milk',
  'Kirana store', 'Petrol', 'Dosa', 'Biryani', 'Metro recharge',
  'Mobile recharge', 'Electricity bill', 'House help',
  'Groceries', 'Ola', 'Swiggy', 'Zomato', 'Medical store',
  'Gym fee', 'Salon', 'Rent',
];

const INCOME_KEYWORDS = new Set([
  'salary', 'freelance', 'freelancing', 'business', 'interest',
  'dividend', 'refund', 'cashback', 'gift', 'arrowdown', 'profit',
  'bonus', 'commission', 'rental', 'investment', 'stipend', 'pension',
]);

interface QuickAddBarProps {
  onAdd: (text: string, type: 'wallet' | 'arrowdown') => Promise<void>;
}

export function QuickAddBar({ onAdd }: QuickAddBarProps) {
  const { colors } = useTheme();
  const [entry, setEntry] = useState('');
  const [type, setType] = useState<'wallet' | 'arrowdown'>('wallet');
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const suggestions = useMemo(() => {
    if (entry.length < 1) return [];
    const lower = entry.toLowerCase();
    const fromIndian = COMMON_SUGGESTIONS.filter((s) => s.toLowerCase().includes(lower));
    return fromIndian.slice(0, 5);
  }, [entry]);

  function parseQuickEntry(text: string): { desc: string; amt: number; cat: string } | null {
    let input = text.trim();
    if (input.startsWith('+')) input = input.slice(1).trim();
    else if (input.startsWith('-')) input = input.slice(1).trim();
    const match = input.match(/^(.+?)\s+(\d+(?:\.\d+)?)$/);
    if (!match) return null;
    const desc = match[1].trim();
    const amt = parseFloat(match[2]);
    if (amt <= 0) return null;
    let cat = 'Other';
    for (const [keyword, category] of Object.entries(KEYWORD_CATEGORIES)) {
      if (desc.toLowerCase().includes(keyword)) { cat = category; break; }
    }
    return { desc, amt, cat };
  }

  async function handleSubmit() {
    const parsed = parseQuickEntry(entry);
    if (!parsed) return;
    setEntry('');
    setLoading(true);
    try {
      await onAdd(entry, type);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch {
      Keyboard.dismiss();
    } finally {
      setLoading(false);
    }
  }

  const detectedType = useMemo(() => {
    const parsed = entry.trim() ? parseQuickEntry(entry) : null;
    if (!parsed) return type;
    const lower = parsed.desc.toLowerCase();
    for (const kw of INCOME_KEYWORDS) {
      if (lower.includes(kw)) return 'arrowdown';
    }
    return 'wallet';
  }, [entry]);

  return (
    <View style={{ backgroundColor: colors.bg.card, borderRadius: 16, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 8 }}>
        <TouchableOpacity
          onPress={() => setType(type === 'wallet' ? 'arrowdown' : 'wallet')}
          style={{
            paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
            backgroundColor: detectedType === 'arrowdown' ? '#22C55E20' : '#EF444420',
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '700', color: detectedType === 'arrowdown' ? '#22C55E' : '#EF4444' }}>
            {detectedType === 'arrowdown' ? '+' : '-'}
          </Text>
        </TouchableOpacity>
        <TextInput
          ref={inputRef}
          style={{ flex: 1, fontSize: 15, fontWeight: '500', color: colors.text.primary }}
          placeholder='e.g. "Tea 20"'
          placeholderTextColor={colors.text.tertiary}
          value={entry}
          onChangeText={(t) => { setEntry(t); setShowSuggestions(t.length > 0); }}
          onSubmitEditing={handleSubmit}
          returnKeyType="done"
          editable={!loading}
        />
        {success ? (
          <AntDesign name="checkcircle" size={20} color="#22C55E" />
        ) : !loading ? (
          <TouchableOpacity onPress={handleSubmit}>
            <AntDesign name="arrowright" size={22} color={colors.accent.primary} />
          </TouchableOpacity>
        ) : (
          <ActivityIndicator size="small" color={colors.accent.primary} />
        )}
      </View>
      {showSuggestions && suggestions.length > 0 && (
        <View style={{ borderTopWidth: 1, borderTopColor: colors.border.subtle }}>
          {suggestions.map((s, i) => (
            <TouchableOpacity
              key={s}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 10,
                paddingHorizontal: 14, paddingVertical: 10,
                borderBottomWidth: i < suggestions.length - 1 ? 1 : 0,
                borderBottomColor: colors.border.subtle,
              }}
              onPress={() => { setEntry(s + ' '); setShowSuggestions(false); inputRef.current?.focus(); }}
            >
              <AntDesign name="clockcircleo" size={14} color={colors.text.tertiary} />
              <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text.primary, flex: 1 }} numberOfLines={1}>
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

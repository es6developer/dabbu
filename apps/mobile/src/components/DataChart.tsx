import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface BarItem {
  label: string;
  value: number;
  color?: string;
}

interface Props {
  data: BarItem[];
  maxValue?: number;
  height?: number;
}

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];

export function DataChart({ data, maxValue, height = 120 }: Props) {
  if (data.length === 0) return null;

  const max = maxValue || Math.max(...data.map((d) => d.value), 1);
  const barH = height - 20;

  return (
    <View style={[s.container, { height }]}>
      <View style={s.row}>
        {data.slice(0, 6).map((item, i) => {
          const pct = item.value / max;
          const barHeight = Math.max(pct * barH, 4);
          return (
            <View key={i} style={s.barWrap}>
              <Text style={s.value}>₹{(item.value / 1000).toFixed(0)}k</Text>
              <View
                style={[
                  s.bar,
                  { height: barHeight, backgroundColor: item.color || COLORS[i % COLORS.length] },
                ]}
              />
              <Text style={s.label} numberOfLines={1}>{item.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: '#1A1A1A', borderRadius: 16, padding: 12,
    marginVertical: 8, overflow: 'hidden',
  },
  row: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around' },
  barWrap: { alignItems: 'center', flex: 1, marginHorizontal: 2 },
  bar: { width: '70%', borderRadius: 4, minWidth: 8 },
  value: { fontSize: 9, color: '#AAA', marginBottom: 4 },
  label: { fontSize: 9, color: '#888', marginTop: 4, textAlign: 'center' },
});

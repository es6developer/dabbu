import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface HelpTipProps {
  text: string;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
}

export function HelpTip({ text, icon, color }: HelpTipProps) {
  return (
    <View style={styles.tipRow}>
      <Ionicons name={icon || 'information-circle-outline'} size={14} color={color || '#8E8E93'} />
      <Text style={[styles.tipText, { color: color || '#8E8E93' }]}>{text}</Text>
    </View>
  );
}

interface HelpCardProps {
  title: string;
  description: string;
  icon?: keyof typeof Ionicons.glyphMap;
  accentColor?: string;
  tips?: string[];
}

export function HelpCard({ title, description, icon, accentColor, tips }: HelpCardProps) {
  const [expanded, setExpanded] = useState(false);
  const color = accentColor || '#FF6B00';

  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
      <TouchableOpacity
        style={styles.cardHeader}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.cardTitleRow}>
          <Ionicons name={icon || 'bulb-outline'} size={18} color={color} />
          <Text style={[styles.cardTitle, { color }]}>{title}</Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color="#636366"
        />
      </TouchableOpacity>
      {expanded && (
        <View style={styles.cardBody}>
          <Text style={styles.cardDesc}>{description}</Text>
          {tips && tips.length > 0 && (
            <View style={styles.tipsList}>
              {tips.map((tip, i) => (
                <View key={i} style={styles.tipItem}>
                  <Text style={styles.tipBullet}>{'\u2022'}</Text>
                  <Text style={styles.tipItemText}>{tip}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  tipText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    flex: 1,
    lineHeight: 16,
  },
  card: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    borderLeftWidth: 3,
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  cardBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  cardDesc: {
    fontSize: 13,
    color: '#C7C7CC',
    fontFamily: 'Inter-Regular',
    lineHeight: 18,
  },
  tipsList: {
    marginTop: 10,
    gap: 6,
  },
  tipItem: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'flex-start',
  },
  tipBullet: {
    color: '#FF6B00',
    fontSize: 14,
    lineHeight: 18,
    width: 10,
  },
  tipItemText: {
    color: '#8E8E93',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    lineHeight: 17,
    flex: 1,
  },
});

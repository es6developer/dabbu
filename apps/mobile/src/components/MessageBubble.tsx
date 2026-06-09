import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share } from 'react-native';

interface Props {
  text: string;
  isUser: boolean;
  action?: string;
  data?: any;
  onNavigate?: (id: string, name: string) => void;
}

export function MessageBubble({ text, isUser, action, data, onNavigate }: Props) {
  const hasActionCard = action && !isUser && (action === 'create_circle' || action === 'create_space' || action === 'add_expense');
  const d = data || {};

  return (
    <View style={[s.wrap, isUser ? s.userWrap : s.aiWrap]}>
      <View style={[s.bubble, isUser ? s.userBubble : s.aiBubble]}>
        {action && !isUser && action !== 'create_circle' && action !== 'create_space' && action !== 'add_expense' && (
          <View style={s.actionBadge}>
            <Text style={s.actionBadgeText}>{action.replace(/_/g, ' ')}</Text>
          </View>
        )}
        <Text style={[s.text, isUser ? s.userText : s.aiText]}>{text}</Text>
      </View>

      {hasActionCard && (
        <View style={s.actionCard}>
          <View style={s.actionCardLeft}>
            <Text style={s.actionCardTitle}>
              {action === 'add_expense' ? `₹${Number(d.amount || 0).toLocaleString('en-IN')}` : (d.groupName || d.spaceName || 'Created')}
            </Text>
            <Text style={s.actionCardDesc} numberOfLines={2}>
              {d.description || d.category || (action === 'create_circle' ? 'Circle created' : action === 'create_space' ? 'Space created' : '')}
            </Text>
          </View>
          {onNavigate && (d.groupId || d.spaceId) && (
            <TouchableOpacity
              style={s.actionCardBtn}
              onPress={() => onNavigate(d.groupId || d.spaceId, d.groupName || d.spaceName)}
            >
              <Text style={s.actionCardBtnText}>Open</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {!isUser && (
        <TouchableOpacity style={s.shareBtn} onPress={() => Share.share({ message: text })} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={s.shareIcon}>↗</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 4, paddingHorizontal: 16 },
  userWrap: { justifyContent: 'flex-end' },
  aiWrap: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '82%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20,
  },
  userBubble: {
    backgroundColor: '#FFD700',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#1A1A1A',
    borderBottomLeftRadius: 4,
  },
  text: { fontSize: 15, lineHeight: 21 },
  userText: { color: '#0A0A0A', fontWeight: '500' },
  aiText: { color: '#E8E8E8' },
  actionBadge: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(255,215,0,0.15)',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginBottom: 6,
  },
  actionBadgeText: { fontSize: 10, fontWeight: '700', color: '#FFD700', textTransform: 'capitalize' },
  actionCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#2A2A2A',
    borderRadius: 16, padding: 14, marginTop: 6, maxWidth: '82%',
  },
  actionCardLeft: { flex: 1 },
  actionCardTitle: { fontSize: 15, fontWeight: '700', color: '#FFD700' },
  actionCardDesc: { fontSize: 12, color: '#AAA', marginTop: 2 },
  actionCardBtn: {
    backgroundColor: '#FFD700', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10, marginLeft: 10,
  },
  actionCardBtnText: { fontSize: 12, fontWeight: '700', color: '#0A0A0A' },
  shareBtn: { padding: 4, marginLeft: 4, marginBottom: 4 },
  shareIcon: { fontSize: 14, color: '#555' },
});

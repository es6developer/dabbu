import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { fmt } from './groupUtils';

interface Props {
  balanceRows: any[];
  currentUser: any;
  members: any[];
  colors: any;
  onSettleUp: (row: any) => void;
  onRemind: (row: any) => void;
  groupId: string;
  navigation: any;
  inviteLoading: boolean;
  inviteToken: string | null;
  onAddMember: () => void;
  onGenerateInvite: () => void;
  onShowInviteModal: () => void;
}

export function GroupPeopleTab({
  balanceRows, currentUser, members, colors,
  onSettleUp, onRemind, navigation,
  inviteLoading, inviteToken,
  onAddMember, onGenerateInvite, onShowInviteModal,
}: Props) {
  if (members.length === 0) {
    return (
      <View style={{ paddingHorizontal: 20, paddingTop: 14, gap: 12 }}>
        <Text style={{ textAlign: 'center', color: colors.text.tertiary, marginTop: 40 }}>No members yet.</Text>
      </View>
    );
  }

  const sortedByBalance = [...balanceRows].sort((a, b) => {
    if (a.userId === currentUser?.id) return 1;
    if (b.userId === currentUser?.id) return -1;
    return Math.abs(b.balance) - Math.abs(a.balance);
  });

  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 14, gap: 12 }}>
      {sortedByBalance.map((row) => {
        const owes = row.balance < 0;
        const isMe = row.userId === currentUser?.id;
        return (
          <View key={row.id} style={[{ flexDirection: 'row', alignItems: 'center', borderRadius: 18, padding: 14, gap: 12, backgroundColor: colors.bg.card }]}>
            <View style={[{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: isMe ? colors.accent.primary : colors.bg.tertiary }]}>
              <Text style={[{ fontSize: 14, fontWeight: '800', color: isMe ? '#FFF' : colors.text.primary }]}>
                {row.name[0]?.toUpperCase() || '?'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[{ fontSize: 14, fontWeight: '700', color: colors.text.primary }]}>
                {row.name}{isMe ? ' (You)' : ''}
              </Text>
              {Math.abs(row.balance) < 1 ? (
                <Text style={[{ fontSize: 13, fontWeight: '700', marginTop: 2, color: '#34C759' }]}>All settled</Text>
              ) : (
                <Text style={[{ fontSize: 13, fontWeight: '700', marginTop: 2, color: owes ? '#FF4D4F' : '#34C759' }]}>
                  {owes ? `Owes ${fmt(Math.abs(Math.round(row.balance)))}` : `Gets ${fmt(Math.round(row.balance))}`}
                </Text>
              )}
            </View>
            {!isMe && owes && (
              <TouchableOpacity style={[{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, backgroundColor: '#34C759' }]}
                onPress={() => onSettleUp(row)}>
                <Text style={[{ color: '#FFF', fontSize: 12, fontWeight: '800' }]}>Settle Up</Text>
              </TouchableOpacity>
            )}
            {!isMe && !owes && row.balance > 0 && (
              <TouchableOpacity style={[{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, backgroundColor: colors.status.warning }]}
                onPress={() => onRemind(row)}>
                <AntDesign name="bells" size={14} color="#FFF" />
                <Text style={[{ color: '#FFF', fontSize: 12, fontWeight: '800' }]}>Remind</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
        <TouchableOpacity style={[{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, paddingVertical: 12, borderRadius: 14, backgroundColor: colors.accent.primary }]}
          onPress={onAddMember}>
          <AntDesign name="adduser" size={18} color="#FFF" />
          <Text style={[{ color: '#FFF', fontSize: 14, fontWeight: '700' }]}>Add Member</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, paddingVertical: 12, borderRadius: 14, backgroundColor: colors.bg.card }]}
          onPress={onGenerateInvite} disabled={inviteLoading}>
          <AntDesign name={inviteLoading ? 'hourglass' : 'sharealt'} size={18} color={colors.text.primary} />
          <Text style={[{ color: colors.text.primary, fontSize: 14, fontWeight: '700' }]}>
            {inviteLoading ? 'Generating...' : 'Invite Link'}
          </Text>
        </TouchableOpacity>
      </View>
      {inviteToken && (
        <TouchableOpacity style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border.default }]}
          onPress={onShowInviteModal}>
          <AntDesign name="link" size={16} color={colors.accent.primary} />
          <Text style={[{ fontSize: 13, fontWeight: '600', color: colors.accent.primary }]}>View invite link</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

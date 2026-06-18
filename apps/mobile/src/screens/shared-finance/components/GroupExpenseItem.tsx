import React from 'react';
import { View, Text, TouchableOpacity, Alert, Linking } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../../services/api';
import { useAuth } from '../../../store/AuthContext';
import { useToast } from '../../../store/ToastContext';
import { setAccessToken } from '../../../services/api';
import { fmt } from './groupUtils';

interface Props {
  item: any;
  members: any[];
  isAdmin: boolean;
  colors: any;
  groupId: string;
  onRefresh: () => void;
}

export function GroupExpenseItem({ item, members, isAdmin, colors, groupId, onRefresh }: Props) {
  const navigation = useNavigation<any>();
  const currentUser = useAuth().user;
  const { showToast } = useToast();
  const { accessToken } = useAuth();

  const payer = members.find((m: any) => m.userId === item.paidBy);
  const payerName = payer?.user?.firstName || payer?.user?.email || 'Someone';
  const date = new Date(item.date || item.createdAt || '');
  const canModify = item.paidBy === currentUser?.id || isAdmin;
  const mySplit = item.splits?.find((s: any) => s.userId === currentUser?.id);
  const myShare = mySplit ? Number(mySplit.amount) : 0;
  const iPaid = item.paidBy === currentUser?.id;

  const handleDelete = () => {
    Alert.alert('Delete Expense', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            if (accessToken) setAccessToken(accessToken);
            await api.delete(`/shared-finance/expenses/${item.id}`);
            showToast('Expense deleted');
            onRefresh();
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to delete');
          }
        },
      },
    ]);
  };

  return (
    <TouchableOpacity
      style={[{ flexDirection: 'row', marginHorizontal: 16, marginBottom: 8, padding: 14, borderRadius: 18, gap: 12, backgroundColor: colors.bg.card }]}
      onPress={() => { if (canModify) navigation.navigate('SharedExpenseForm', { groupId, expenseId: item.id, edit: true }); }}
      onLongPress={() => {
        if (!canModify) return;
        Alert.alert(item.description || 'Expense', 'Choose action', [
          { text: 'Edit', onPress: () => navigation.navigate('SharedExpenseForm', { groupId, expenseId: item.id, edit: true }) },
          { text: 'Delete', style: 'destructive', onPress: handleDelete },
          { text: 'Cancel', style: 'cancel' },
        ]);
      }}
      activeOpacity={canModify ? 0.8 : 1}
    >
      <View style={[{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent.primary }]}>
        <Text style={[{ color: '#FFF', fontSize: 15, fontWeight: '800', letterSpacing: -0.3 }]}>{payerName[0]?.toUpperCase() || '?'}</Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={[{ fontSize: 14, fontWeight: '600', flex: 1, color: colors.text.primary }]} numberOfLines={1}>
            {item.description || (typeof item.category === 'string' ? item.category : '') || 'Expense'}
          </Text>
          <Text style={[{ fontSize: 16, fontWeight: '700', marginLeft: 8, color: colors.text.primary }]}>{fmt(item.amount || 0)}</Text>
        </View>
        <Text style={[{ fontSize: 11, marginTop: 1, color: colors.text.tertiary }]}>
          {payerName}{!isNaN(date.getTime()) ? ` · ${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}
        </Text>
        {iPaid ? (
          <Text style={[{ fontSize: 11, fontWeight: '600', marginTop: 1, color: colors.accent.primary }]}>You paid {fmt(item.amount || 0)}</Text>
        ) : myShare > 0 ? (
          <Text style={[{ fontSize: 11, fontWeight: '600', marginTop: 1, color: colors.text.tertiary }]}>Your share: {fmt(myShare)}</Text>
        ) : null}
      </View>
      {!iPaid && myShare > 0 && payer?.user?.upiId && (
        <TouchableOpacity style={[{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, alignSelf: 'center', marginLeft: 8, backgroundColor: '#34C759' }]}
          onPress={() => {
            const upiLink = `upi://pay?pa=${encodeURIComponent(payer.user.upiId)}&pn=${encodeURIComponent(payerName)}&am=${myShare}&cu=INR&tn=${encodeURIComponent(item.description || 'Expense')}`;
            Linking.openURL(upiLink).catch(() => Alert.alert('Unable to open UPI', 'No UPI app found.'));
          }}>
          <AntDesign name="wallet" size={14} color="#FFF" />
          <Text style={[{ color: '#FFF', fontSize: 12, fontWeight: '700' }]}>Pay Now</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

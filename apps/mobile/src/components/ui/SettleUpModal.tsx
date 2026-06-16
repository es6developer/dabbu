import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';

const { width } = Dimensions.get('window');

interface SettleUpModalProps {
  visible: boolean;
  amount: number;
  fromName: string;
  toName: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function fmt(v: number) {
  return '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function SettleUpModal({
  visible,
  amount,
  fromName,
  toName,
  loading,
  onConfirm,
  onCancel,
}: SettleUpModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <BlurView intensity={40} tint="dark" style={s.overlay}>
        <View style={[s.card, { backgroundColor: colors.bg.card }]}>
          <View style={s.iconWrap}>
            <View style={[s.iconCircle, { backgroundColor: `${colors.accent.primary}15` }]}>
              <Ionicons name="swap-horizontal-outline" size={28} color={colors.accent.primary} />
            </View>
          </View>

          <Text style={[s.title, { color: colors.text.primary }]}>Settle Up</Text>
          <Text style={[s.subtitle, { color: colors.text.tertiary }]}>
            Are you sure you want to settle up?
          </Text>

          <View style={[s.amountRow, { backgroundColor: colors.bg.tertiary }]}>
            <View style={s.party}>
              <Text style={[s.partyLabel, { color: colors.text.tertiary }]}>From</Text>
              <Text style={[s.partyName, { color: colors.text.primary }]}>{fromName}</Text>
            </View>
            <View style={s.amountCenter}>
              <Ionicons name="arrow-forward-outline" size={18} color={colors.accent.primary} />
              <Text style={[s.amount, { color: colors.accent.primary }]}>{fmt(amount)}</Text>
            </View>
            <View style={s.party}>
              <Text style={[s.partyLabel, { color: colors.text.tertiary }]}>To</Text>
              <Text style={[s.partyName, { color: colors.text.primary }]}>{toName}</Text>
            </View>
          </View>

          <View style={s.actionRow}>
            <TouchableOpacity
              style={[s.cancelBtn, { borderColor: colors.border.subtle }]}
              onPress={onCancel}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={[s.cancelText, { color: colors.text.secondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.confirmBtn, { backgroundColor: colors.accent.primary }]}
              onPress={onConfirm}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#FFF" />
                  <Text style={s.confirmText}>Yes, Settle Up</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    padding: 28,
    gap: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 6,
  },
  iconWrap: { alignItems: 'center' },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: -12,
    lineHeight: 20,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  party: { flex: 1, alignItems: 'center', gap: 4 },
  partyLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  partyName: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  amountCenter: { alignItems: 'center', gap: 2 },
  amount: { fontSize: 16, fontWeight: '800' },
  actionRow: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { fontSize: 14, fontWeight: '700' },
  confirmBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  confirmText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});

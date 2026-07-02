import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Modal, Animated, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../../store/ToastContext';
import {
  FormSection,
  FormField,
  FormAmountField,
  FormDatePicker,
  FormTextArea,
  FormChipGroup,
  FormFooter,
} from '../../components/forms';

interface CreateGoalModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
  prefill: { name: string; type: string; target: number } | null;
}

export function CreateGoalModal({ visible, onClose, onCreated, prefill }: CreateGoalModalProps) {
  const { colors } = useTheme();

  const GOAL_CONFIGS: Record<string, { label: string; icon: string; color: string }> = {
    custom: { label: 'Custom', icon: 'star', color: colors.accent.secondary },
    emergency: { label: 'Emergency', icon: 'Safety', color: '#EF4444' },
    travel: { label: 'Travel', icon: 'earth', color: '#3B82F6' },
    education: { label: 'Education', icon: 'book', color: '#F59E0B' },
    wedding: { label: 'Wedding', icon: 'heart', color: '#EC4899' },
    home: { label: 'Home', icon: 'home', color: '#14B8A6' },
    car: { label: 'Car', icon: 'car', color: '#4F6EF7' },
    retirement: { label: 'Retirement', icon: 'dashboard', color: '#6366F1' },
    investment: { label: 'Investment', icon: 'caretup', color: '#10B981' },
    debt: { label: 'Debt Free', icon: 'wallet', color: '#F97316' },
  };
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(0)).current;

  const [name, setName] = useState('');
  const [targetStr, setTargetStr] = useState('');
  const [type, setType] = useState('custom');
  const [deadline, setDeadline] = useState('');
  const [monthly, setMonthly] = useState('');
  const [notes, setNotes] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const slideAnimRef = useRef(slideAnim);

  useEffect(() => {
    if (visible) {
      if (prefill) {
        setName(prefill.name);
        setTargetStr(String(prefill.target));
        setType(prefill.type);
      }
      Animated.spring(slideAnimRef.current, {
        toValue: 1,
        friction: 9,
        tension: 50,
        useNativeDriver: true,
      }).start();
    } else {
      slideAnimRef.current.setValue(0);
      setName('');
      setTargetStr('');
      setType('custom');
      setDeadline('');
      setMonthly('');
      setNotes('');
      setError('');
    }
  }, [visible, prefill]);

  async function handleCreate() {
    if (!name.trim()) { setError('Please enter a goal name'); return; }
    const targetNum = parseFloat(targetStr);
    if (!targetNum || targetNum <= 0) { setError('Target amount must be greater than 0'); return; }
    setError('');
    setCreating(true);
    try {
      const config = GOAL_CONFIGS[type];
      const payload: any = { name: name.trim(), targetAmount: targetNum, type };
      if (config) { payload.icon = config.icon; payload.color = config.color; }
      if (deadline.trim()) payload.deadline = deadline.trim();
      if (monthly.trim()) payload.monthlyContribution = parseFloat(monthly);
      if (notes.trim()) payload.notes = notes.trim();
      await api.post('/goals', payload);
      showToast('Goal created');
      onClose();
      onCreated();
    } catch (e: any) {
      setError(e?.message || 'Failed to create goal');
    } finally {
      setCreating(false);
    }
  }

  const goalTypes = Object.entries(GOAL_CONFIGS).map(([k, v]) => ({ value: k, label: v.label, icon: v.icon, color: v.color }));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 120 : 0}
      >
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <Animated.View
              style={[
                styles.content,
                {
                  backgroundColor: colors.bg.secondary,
                  paddingBottom: insets.bottom + 16,
                  transform: [{
                    translateY: slideAnimRef.current.interpolate({
                      inputRange: [0, 1],
                      outputRange: [500, 0],
                    }),
                  }],
                },
              ]}
            >
              <View style={styles.handleRow}>
                <View style={[styles.handleBar, { backgroundColor: colors.border.default }]} />
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 28 }}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={{ fontSize: 26, fontWeight: '800', color: colors.text.primary, marginBottom: 28 }}>
                  Create Goal
                </Text>

                <FormChipGroup
                  label="Goal Category"
                  options={goalTypes}
                  selected={type}
                  onSelect={setType}
                  size="sm"
                />

                <View style={{ marginTop: 20, gap: 16 }}>
                  <FormField
                    label="Goal Name"
                    icon="star"
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g. My Dream Home"
                    required
                    error={error && !name.trim() ? error : undefined}
                  />

                  <FormAmountField
                    label="Target Amount"
                    value={targetStr}
                    onChangeText={setTargetStr}
                    error={error && (!targetStr || parseFloat(targetStr) <= 0) ? error : undefined}
                  />

                  <View style={{ flexDirection: 'row', gap: 14 }}>
                    <View style={{ flex: 1 }}>
                      <FormDatePicker
                        label="Deadline"
                        value={deadline}
                        onChange={setDeadline}
                        optional
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <FormField
                        label="Monthly"
                        icon='caretup'
                        value={monthly}
                        onChangeText={setMonthly}
                        placeholder="₹/mo"
                        keyboardType="number-pad"
                      />
                    </View>
                  </View>

                  <FormTextArea
                    label="Notes"
                    icon="edit"
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Why this goal matters..."
                  />
                </View>

                <View style={{ marginTop: 28 }}>
                  <FormFooter
                    title="Create Goal"
                    icon="star"
                    loading={creating}
                    onPress={handleCreate}
                    secondaryTitle="Cancel"
                    onSecondaryPress={onClose}
                  />
                </View>
              </ScrollView>
            </Animated.View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  content: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  handleRow: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 4,
  },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

interface DatePickerFieldProps {
  label: string;
  value: string;
  onChange: (dateString: string) => void;
  placeholder?: string;
  optional?: boolean;
}

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function DatePickerField({
  label,
  value,
  onChange,
  placeholder = 'Select date',
  optional = false,
}: DatePickerFieldProps) {
  const { colors } = useTheme();
  const [show, setShow] = useState(false);

  const currentDate = value
    ? new Date(value + 'T12:00:00')
    : new Date();

  const handleChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS !== 'ios') {
      setShow(false);
    }
    if (!selectedDate) return;

    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const d = String(selectedDate.getDate()).padStart(2, '0');
    onChange(`${y}-${m}-${d}`);
  };

  const openDatePicker = () => {
    setShow(true);
  };

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: colors.text.secondary }]}>
        {label}{optional ? ' (optional)' : ''}
      </Text>
      <TouchableOpacity
        style={[
          styles.field,
          {
            backgroundColor: colors.bg.tertiary,
            borderColor: colors.border.subtle,
          },
        ]}
        onPress={openDatePicker}
        activeOpacity={0.7}
      >
        <Ionicons
          name="calendar-outline"
          size={18}
          color={value ? colors.text.primary : colors.text.tertiary}
          style={styles.icon}
        />
        <Text
          style={[
            styles.text,
            { color: value ? colors.text.primary : colors.text.tertiary },
          ]}
        >
          {value ? formatDisplayDate(value) : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.text.tertiary} />
      </TouchableOpacity>
      {show && Platform.OS === 'ios' && (
        <Modal transparent animationType="fade" visible={show} onRequestClose={() => setShow(false)}>
          <View style={styles.modalBackdrop}>
            <View style={[styles.iosSheet, { backgroundColor: colors.bg.secondary }]}>
              <View style={styles.iosHeader}>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text style={[styles.iosAction, { color: colors.text.tertiary }]}>Cancel</Text>
                </TouchableOpacity>
                <Text style={[styles.iosTitle, { color: colors.text.primary }]}>{label}</Text>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text style={[styles.iosAction, { color: colors.accent.primary }]}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={currentDate}
                mode="date"
                display="spinner"
                onChange={handleChange}
              />
            </View>
          </View>
        </Modal>
      )}
      {show && Platform.OS !== 'ios' && (
        <DateTimePicker
          value={currentDate}
          mode="date"
          display="default"
          onChange={handleChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  icon: {
    marginRight: 10,
  },
  text: {
    flex: 1,
    fontSize: 15,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  iosSheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingBottom: 20,
    overflow: 'hidden',
  },
  iosHeader: {
    height: 48,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iosTitle: { fontSize: 15, fontWeight: '700' },
  iosAction: { fontSize: 15, fontWeight: '700' },
});

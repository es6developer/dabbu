import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
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
  const [mode, setMode] = useState<'date' | 'time'>('date');

  const currentDate = value
    ? new Date(value + 'T12:00:00')
    : new Date();

  const handleChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShow(false);
    }
    if (!selectedDate) return;

    if (mode === 'date') {
      const now = new Date();
      selectedDate.setHours(now.getHours(), now.getMinutes(), 0, 0);
      const y = selectedDate.getFullYear();
      const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const d = String(selectedDate.getDate()).padStart(2, '0');
      onChange(`${y}-${m}-${d}`);
      if (Platform.OS === 'ios') {
        setMode('time');
      }
    } else {
      const existing = value ? new Date(value + 'T00:00:00') : new Date();
      existing.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
      const y = existing.getFullYear();
      const m = String(existing.getMonth() + 1).padStart(2, '0');
      const d = String(existing.getDate()).padStart(2, '0');
      onChange(`${y}-${m}-${d}`);
      setMode('date');
    }
  };

  const openDatePicker = () => {
    setMode('date');
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
      {show && (
        <DateTimePicker
          value={currentDate}
          mode={mode}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleChange}
          themeVariant="dark"
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
});

import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Modal } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { AntDesign } from '@expo/vector-icons';
import { useTheme, spacing, borderRadius } from '../../theme';

interface DatePickerFieldProps {
  label: string;
  value: string;
  onChange: (dateString: string) => void;
  placeholder?: string;
  optional?: boolean;
  mode?: 'date' | 'clockcircleo' | 'datetime';
}

function toDateInput(dateStr: string): Date {
  if (!dateStr) {
    return new Date();
  }
  const d = new Date(dateStr + 'T12:00:00');
  return isNaN(d.getTime()) ? new Date() : d;
}

function formatDisplayDate(dateStr: string, mode: string): string {
  if (!dateStr) {
    return '';
  }
  const d = toDateInput(dateStr);
  if (isNaN(d.getTime())) {
    return dateStr;
  }
  if (mode === 'clockcircleo') {
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }
  if (mode === 'datetime') {
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatTimeValue(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function formatDateTimeValue(date: Date): string {
  return `${formatDateValue(date)}T${formatTimeValue(date)}`;
}

export function DatePickerField({
  label,
  value,
  onChange,
  placeholder = 'Select date',
  optional = false,
  mode = 'date',
}: DatePickerFieldProps) {
  const { colors } = useTheme();
  const [show, setShow] = useState(false);
  const pendingRef = useRef<Date>(toDateInput(value));

  const currentDate = toDateInput(value);

  const handleChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS !== 'ios') {
      if (selectedDate) {
        if (mode === 'date') {
          onChange(formatDateValue(selectedDate));
        } else if (mode === 'clockcircleo') {
          onChange(formatTimeValue(selectedDate));
        } else {
          onChange(formatDateTimeValue(selectedDate));
        }
      }
      setShow(false);
      return;
    }
    if (selectedDate) {
      pendingRef.current = selectedDate;
      if (mode === 'date') {
        onChange(formatDateValue(selectedDate));
      } else if (mode === 'clockcircleo') {
        onChange(formatTimeValue(selectedDate));
      } else {
        onChange(formatDateTimeValue(selectedDate));
      }
    }
  };

  const handleDone = () => {
    setShow(false);
  };

  const handleCancel = () => {
    const original = toDateInput(value);
    if (mode === 'date') {
      onChange(formatDateValue(original));
    } else if (mode === 'clockcircleo') {
      onChange(formatTimeValue(original));
    } else {
      onChange(formatDateTimeValue(original));
    }
    setShow(false);
  };

  const openDatePicker = () => {
    pendingRef.current = currentDate;
    setShow(true);
  };

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: colors.text.secondary }]}>
        {label}
        {optional ? ' (optional)' : ''}
      </Text>
      <TouchableOpacity
        style={[
          styles.field,
          {
            backgroundColor: colors.bg.tertiary,
            borderColor: colors.border.default,
          },
        ]}
        onPress={openDatePicker}
        activeOpacity={0.7}
      >
        <AntDesign
          name={mode === 'clockcircleo' ? 'clockcircleo' : 'calendar'}
          size={18}
          color={value ? colors.text.primary : colors.text.tertiary}
          style={styles.icon}
        />
        <Text style={[styles.text, { color: value ? colors.text.primary : colors.text.tertiary }]}>
          {value ? formatDisplayDate(value, mode) : placeholder}
        </Text>
        <AntDesign  name="down" size={16} color={colors.text.tertiary} />
      </TouchableOpacity>
      {show && Platform.OS === 'ios' && (
        <Modal transparent animationType="fade" visible={show} onRequestClose={handleCancel}>
          <View style={styles.modalBackdrop}>
            <View style={[styles.iosSheet, { backgroundColor: colors.bg.secondary }]}>
              <View style={styles.iosHeader}>
                <TouchableOpacity onPress={handleCancel}>
                  <Text style={[styles.iosAction, { color: colors.text.tertiary }]}>Cancel</Text>
                </TouchableOpacity>
                <Text style={[styles.iosTitle, { color: colors.text.primary }]}>{label}</Text>
                <TouchableOpacity onPress={handleDone}>
                  <Text style={[styles.iosAction, { color: colors.accent.primary }]}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={pendingRef.current}
                mode={mode}
                display="spinner"
                onChange={handleChange}
              />
            </View>
          </View>
        </Modal>
      )}
      {show && Platform.OS !== 'ios' && (
        <DateTimePicker value={currentDate} mode={mode} display="default" onChange={handleChange} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
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
    paddingBottom: spacing.xl,
    overflow: 'hidden',
  },
  iosHeader: {
    height: 48,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iosTitle: { fontSize: 15, fontWeight: '700' },
  iosAction: { fontSize: 15, fontWeight: '700' },
});

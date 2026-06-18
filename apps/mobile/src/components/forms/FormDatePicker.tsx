import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { FormBottomSheet } from './FormBottomSheet';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface FormDatePickerProps {
  label: string;
  value: string;
  onChange: (date: string) => void;
  optional?: boolean;
  required?: boolean;
}

export function FormDatePicker({ label, value, onChange, optional, required }: FormDatePickerProps) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  const today = new Date();
  const selectedDate = value ? new Date(value + 'T12:00:00') : today;
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());

  const displayLabel = value
    ? selectedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Today';

  const isToday = value === today.toISOString().split('T')[0];

  function daysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
  }
  function firstDayOfMonth(year: number, month: number) {
    return new Date(year, month, 1).getDay();
  }

  const handleSelect = useCallback((day: number) => {
    const m = String(viewMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    onChange(`${viewYear}-${m}-${d}`);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setOpen(false);
  }, [viewYear, viewMonth, onChange]);

  const navigateMonth = useCallback((dir: -1 | 1) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (dir === -1 && viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11); }
    else if (dir === 1 && viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0); }
    else { setViewMonth(viewMonth + dir); }
  }, [viewYear, viewMonth]);

  const totalDays = daysInMonth(viewYear, viewMonth);
  const firstDay = firstDayOfMonth(viewYear, viewMonth);
  const blanks = Array(firstDay).fill(null);
  const days = Array.from({ length: totalDays }, (_, i) => i + 1);

  return (
    <>
      <View style={styles.fieldBlock}>
        <Text style={[styles.label, { color: colors.text.tertiary }]}>
          {label}
          {required && <Text style={{ color: '#FF6B6B' }}> *</Text>}
          {optional && <Text style={{ color: colors.text.tertiary, fontWeight: '500', textTransform: 'none' }}> (optional)</Text>}
        </Text>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            setOpen(true);
          }}
          activeOpacity={0.75}
          style={[styles.dateShell, { backgroundColor: colors.bg.card, borderColor: colors.border.default }]}
        >
          <AntDesign name="calendar" size={18} color={colors.text.tertiary} style={styles.icon} />
          <Text style={[styles.dateText, { color: colors.text.primary }]}>
            {displayLabel}
          </Text>
          {isToday && (
            <View style={[styles.todayBadge, { backgroundColor: `${colors.status.info}18` }]}>
              <Text style={[styles.todayBadgeText, { color: colors.status.info }]}>Today</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <FormBottomSheet visible={open} onClose={() => setOpen(false)} title={`Select ${label}`}>
        <View>
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={() => navigateMonth(-1)} style={[styles.navBtn, { backgroundColor: colors.bg.tertiary }]}>
              <AntDesign name="left" size={16} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={[styles.monthTitle, { color: colors.text.primary }]}>
              {MONTHS[viewMonth]} {viewYear}
            </Text>
            <TouchableOpacity onPress={() => navigateMonth(1)} style={[styles.navBtn, { backgroundColor: colors.bg.tertiary }]}>
              <AntDesign name="right" size={16} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((wd) => (
              <Text key={wd} style={[styles.weekday, { color: colors.text.tertiary }]}>{wd}</Text>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {blanks.map((_, i) => <View key={`b${i}`} style={styles.dayCell} />)}
            {days.map((day) => {
              const isSel = selectedDate.getDate() === day && selectedDate.getMonth() === viewMonth && selectedDate.getFullYear() === viewYear;
              const isTodayDate = today.getDate() === day && today.getMonth() === viewMonth && today.getFullYear() === viewYear;
              return (
                <TouchableOpacity
                  key={day}
                  onPress={() => handleSelect(day)}
                  style={[styles.dayCell, isSel && { backgroundColor: colors.accent.primary, borderRadius: 12 }]}
                >
                  <Text style={[
                    styles.dayText,
                    { color: isSel ? '#FFF' : isTodayDate ? colors.accent.primary : colors.text.primary },
                    isTodayDate && !isSel && { fontWeight: '800' },
                  ]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </FormBottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  fieldBlock: { marginBottom: 0 },
  label: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  dateShell: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: { marginRight: 10 },
  dateText: { fontSize: 15, fontWeight: '600', flex: 1 },
  todayBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  todayBadgeText: { fontSize: 10, fontWeight: '700' },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  monthTitle: { fontSize: 17, fontWeight: '700' },
  weekdayRow: { flexDirection: 'row', marginBottom: 8 },
  weekday: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 1.3, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 15, fontWeight: '600' },
});

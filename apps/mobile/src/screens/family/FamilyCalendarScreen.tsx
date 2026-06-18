import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface CalendarEvent {
  id: string;
  date: number;
  name: string;
  description: string;
  time: string;
  type: string;
}

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const events: CalendarEvent[] = [
  { id: '1', date: 5, name: 'Electricity Bill Due', description: 'Pay monthly electricity bill', time: 'All day', type: 'bill' },
  { id: '2', date: 10, name: 'Insurance Premium', description: 'Health insurance due', time: 'All day', type: 'insurance' },
  { id: '3', date: 15, name: 'Family Budget Review', description: 'Monthly budget review with family', time: '7:00 PM', type: 'meeting' },
  { id: '4', date: 18, name: 'School Fee Payment', description: 'Aarav school fees due', time: 'All day', type: 'education' },
  { id: '5', date: 22, name: 'Investment Review', description: 'Review MF & stock portfolio', time: '10:00 AM', type: 'finance' },
  { id: '6', date: 25, name: 'Credit Card Payment', description: 'Settle outstanding bill', time: 'All day', type: 'bill' },
];

const eventDates = events.map(e => e.date);

const DayCell: React.FC<{
  day: number;
  isToday: boolean;
  isCurrentMonth: boolean;
  hasEvent: boolean;
  onPress: () => void;
}> = ({ day, isToday, isCurrentMonth, hasEvent, onPress }) => (
  <TouchableOpacity
    style={[
      styles.dayCell,
      isToday && styles.todayCell,
    ]}
    onPress={onPress}
    disabled={!isCurrentMonth}
  >
    <Text style={[styles.dayText, !isCurrentMonth && styles.otherMonthDay, isToday && styles.todayText]}>
      {day}
    </Text>
    {hasEvent && <View style={[styles.eventDot, isToday && styles.todayEventDot]} />}
  </TouchableOpacity>
);

const CalendarGrid: React.FC<{
  month: number;
  year: number;
  onDayPress: (day: number) => void;
}> = ({ month, year, onDayPress }) => {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const today = new Date();
  const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;

  const cells: React.ReactElement[] = [];

  for (let i = 0; i < firstDay; i++) {
    cells.push(
      <DayCell
        key={`prev-${i}`}
        day={daysInPrevMonth - firstDay + i + 1}
        isToday={false}
        isCurrentMonth={false}
        hasEvent={false}
        onPress={() => {}}
      />
    );
  }

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(
      <DayCell
        key={day}
        day={day}
        isToday={isCurrentMonth && day === today.getDate()}
        isCurrentMonth={true}
        hasEvent={eventDates.includes(day)}
        onPress={() => onDayPress(day)}
      />
    );
  }

  const remainingCells = 42 - cells.length;
  for (let day = 1; day <= remainingCells; day++) {
    cells.push(
      <DayCell
        key={`next-${day}`}
        day={day}
        isToday={false}
        isCurrentMonth={false}
        hasEvent={false}
        onPress={() => {}}
      />
    );
  }

  return (
    <View style={styles.calendarGrid}>
      {weekDays.map(d => (
        <View key={d} style={styles.weekDayCell}>
          <Text style={styles.weekDayText}>{d}</Text>
        </View>
      ))}
      {cells}
    </View>
  );
};

export default function FamilyCalendarScreen() {
  const insets = useSafeAreaInsets();
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setSelectedDay(null);
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedDay(null);
  };

  const dayEvents = selectedDay
    ? events.filter(e => e.date === selectedDay)
    : [];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <AntDesign name="calendar" size={22} color="#10B981" />
          <Text style={styles.headerTitle}>Calendar</Text>
        </View>
      </View>

      <View style={styles.monthNavigator}>
        <TouchableOpacity onPress={goToPrevMonth} style={styles.navButton}>
          <AntDesign name="left" size={18} color="#F9FAFB" />
        </TouchableOpacity>
        <Text style={styles.monthYearText}>
          {monthNames[currentMonth]} {currentYear}
        </Text>
        <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
          <AntDesign name="right" size={18} color="#F9FAFB" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.calendarCard}>
          <CalendarGrid
            month={currentMonth}
            year={currentYear}
            onDayPress={setSelectedDay}
          />
        </View>

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
            <Text style={styles.legendText}>Events</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#10B981', width: 10, height: 10, borderRadius: 5 }]} />
            <Text style={styles.legendText}>Today</Text>
          </View>
        </View>

        <View style={styles.eventsSection}>
          <Text style={styles.eventsTitle}>
            {selectedDay ? `Events on ${selectedDay} ${monthNames[currentMonth]}` : 'All Events'}
          </Text>

          {selectedDay && dayEvents.length === 0 && (
            <View style={styles.noEventsCard}>
              <AntDesign name="calendar" size={32} color="#6B7280" />
              <Text style={styles.noEventsText}>No events on this day</Text>
            </View>
          )}

          {(selectedDay ? dayEvents : events).map(event => (
            <View key={event.id} style={styles.eventCard}>
              <View style={styles.eventDateBadge}>
                <Text style={styles.eventDateDay}>{event.date}</Text>
                <Text style={styles.eventDateMonth}>{monthNames[currentMonth].slice(0, 3)}</Text>
              </View>
              <View style={styles.eventInfo}>
                <Text style={styles.eventName}>{event.name}</Text>
                <Text style={styles.eventDescription}>{event.description}</Text>
                <View style={styles.eventTimeRow}>
                  <AntDesign name="clockcircle" size={12} color="#6B7280" />
                  <Text style={styles.eventTime}>{event.time}</Text>
                </View>
              </View>
              <View style={[styles.eventTypeDot, {
                backgroundColor: event.type === 'bill' ? '#EF4444' :
                  event.type === 'insurance' ? '#3B82F6' :
                  event.type === 'education' ? '#8B5CF6' :
                  '#10B981'
              }]} />
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F9FAFB',
    letterSpacing: -0.5,
  },
  monthNavigator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 12,
    marginBottom: 8,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthYearText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  calendarCard: {
    backgroundColor: '#1C1C1E',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  weekDayCell: {
    width: '14.28%',
    paddingVertical: 8,
    alignItems: 'center',
  },
  weekDayText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  dayCell: {
    width: '14.28%',
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 15,
    color: '#F9FAFB',
    fontWeight: '500',
  },
  otherMonthDay: {
    color: '#3A3A3C',
  },
  todayCell: {
    backgroundColor: '#10B981',
    borderRadius: 20,
    width: 32,
    height: 32,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayText: {
    color: '#0A0A0A',
    fontWeight: '700',
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#10B981',
    marginTop: 2,
  },
  todayEventDot: {
    backgroundColor: '#0A0A0A',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginVertical: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 12,
    color: '#6B7280',
  },
  eventsSection: {
    paddingHorizontal: 20,
  },
  eventsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F9FAFB',
    marginBottom: 12,
  },
  noEventsCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 30,
    alignItems: 'center',
    gap: 10,
  },
  noEventsText: {
    fontSize: 14,
    color: '#6B7280',
  },
  eventCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventDateBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  eventDateDay: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  eventDateMonth: {
    fontSize: 10,
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  eventInfo: {
    flex: 1,
  },
  eventName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F9FAFB',
    marginBottom: 2,
  },
  eventDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  eventTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  eventTypeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
});

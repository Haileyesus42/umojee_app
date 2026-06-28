import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { styles } from '../../../theme/styles';

type CalendarOverlayProps = {
  onCancel: () => void;
  onDone: () => void;
  visible: boolean;
};

const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 51 }, (_, index) => String(currentYear - 35 + index));

export function CalendarOverlay({ onCancel, onDone, visible }: CalendarOverlayProps) {
  const [selectedMonth, setSelectedMonth] = useState('March');
  const [selectedDay, setSelectedDay] = useState('4');
  const [selectedYear, setSelectedYear] = useState(String(currentYear));

  if (!visible) {
    return null;
  }

  const canSubmit = Boolean(selectedMonth && selectedDay && selectedYear);
  const selectedMonthIndex = monthNames.indexOf(selectedMonth);
  const selectedYearNumber = Number(selectedYear);
  const dayCount =
    selectedMonthIndex >= 0 && Number.isFinite(selectedYearNumber)
      ? new Date(selectedYearNumber, selectedMonthIndex + 1, 0).getDate()
      : 31;
  const days = Array.from({ length: dayCount }, (_, index) => String(index + 1));

  function handleSelectMonth(month: string) {
    setSelectedMonth(month);

    const monthIndex = monthNames.indexOf(month);
    const maxDay = new Date(Number(selectedYear), monthIndex + 1, 0).getDate();
    if (Number(selectedDay) > maxDay) {
      setSelectedDay(String(maxDay));
    }
  }

  function handleSelectYear(year: string) {
    setSelectedYear(year);

    const maxDay = new Date(Number(year), selectedMonthIndex + 1, 0).getDate();
    if (Number(selectedDay) > maxDay) {
      setSelectedDay(String(maxDay));
    }
  }

  return (
    <View style={styles.calendarOverlayRoot}>
      <Pressable
        accessibilityLabel="Close calendar"
        accessibilityRole="button"
        onPress={onCancel}
        style={styles.calendarOverlayBackdrop}
      />
      <View style={styles.calendarPicker}>
        <View style={styles.calendarPickerColumns}>
          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            style={[styles.calendarPickerColumn, styles.calendarPickerMonthColumn]}
          >
            {monthNames.map((month) => (
              <Pressable
                key={month}
                onPress={() => handleSelectMonth(month)}
                style={styles.calendarPickerOption}
              >
                <Text
                  style={[
                    styles.calendarPickerText,
                    month === selectedMonth && styles.calendarPickerTextSelected,
                  ]}
                >
                  {month}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            style={styles.calendarPickerDayColumn}
          >
            {days.map((day) => (
              <Pressable
                key={day}
                onPress={() => setSelectedDay(day)}
                style={styles.calendarPickerOption}
              >
                <Text
                  style={[
                    styles.calendarPickerText,
                    day === selectedDay && styles.calendarPickerTextSelected,
                  ]}
                >
                  {day}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            style={styles.calendarPickerYearColumn}
          >
            {years.map((year) => (
              <Pressable
                key={year}
                onPress={() => handleSelectYear(year)}
                style={styles.calendarPickerOption}
              >
                <Text
                  style={[
                    styles.calendarPickerText,
                    year === selectedYear && styles.calendarPickerTextSelected,
                  ]}
                >
                  {year}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.calendarPickerFooterDivider} />
        <View style={styles.calendarPickerFooter}>
          <Pressable
            accessibilityRole="button"
            onPress={onCancel}
            style={({ pressed }) => [
              styles.calendarPickerFooterButton,
              pressed && styles.pressedFeedback,
            ]}
          >
            <Text style={[styles.calendarPickerFooterText, styles.calendarPickerCancelText]}>
              Cancel
            </Text>
          </Pressable>
          <View style={styles.calendarPickerFooterSeparator} />
          <Pressable
            accessibilityRole="button"
            disabled={!canSubmit}
            onPress={onDone}
            style={({ pressed }) => [
              styles.calendarPickerFooterButton,
              !canSubmit && styles.calendarPickerFooterButtonDisabled,
              pressed && styles.pressedFeedback,
            ]}
          >
            <Text
              style={[
                styles.calendarPickerFooterText,
                !canSubmit && styles.calendarPickerFooterTextDisabled,
              ]}
            >
              Done
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

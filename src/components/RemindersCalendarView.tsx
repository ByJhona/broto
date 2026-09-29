import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Calendar, type DateData } from 'react-native-calendars';
import { Fonts, Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import type { CareTask } from '@/types';
import { addDays, today } from '@/utils';
import { CareTaskItem } from './CareTaskItem';

type DayMarking = { marked: boolean; dotColor: string; selected?: boolean; selectedColor?: string };
type VisibleMonth = { year: number; month: number };

function monthRange(visibleMonth: VisibleMonth): { start: string; end: string } {
  const monthPrefix = `${visibleMonth.year}-${String(visibleMonth.month).padStart(2, '0')}`;
  const daysInMonth = new Date(visibleMonth.year, visibleMonth.month, 0).getDate();
  return { start: `${monthPrefix}-01`, end: `${monthPrefix}-${String(daysInMonth).padStart(2, '0')}` };
}

function occurrencesInRange(task: CareTask, rangeStart: string, rangeEnd: string): string[] {
  if (!task.recurrenceDays) {
    return task.dueDate >= rangeStart && task.dueDate <= rangeEnd ? [task.dueDate] : [];
  }

  const dates: string[] = [];
  for (let cursor = task.dueDate; cursor <= rangeEnd; cursor = addDays(cursor, task.recurrenceDays)) {
    if (cursor >= rangeStart) dates.push(cursor);
  }
  return dates;
}

export function taskOccursOnDate(task: CareTask, date: string): boolean {
  if (task.dueDate === date) return true;
  if (!task.recurrenceDays || date < task.dueDate) return false;
  return (new Date(date).getTime() - new Date(task.dueDate).getTime()) % (task.recurrenceDays * 86_400_000) === 0;
}

function buildMarkedDates(
  tasks: CareTask[],
  visibleMonth: VisibleMonth,
  selectedDate: string,
  colors: ThemeColors
): Record<string, DayMarking> {
  const todayDate = today();
  const { start, end } = monthRange(visibleMonth);
  const marked: Record<string, DayMarking> = {};

  for (const task of tasks) {
    for (const date of occurrencesInRange(task, start, end)) {
      const isOverdue = !task.done && date === task.dueDate && date < todayDate;
      marked[date] = { marked: true, dotColor: isOverdue ? colors.destructive : colors.leaf };
    }
  }

  marked[selectedDate] = {
    marked: marked[selectedDate]?.marked ?? false,
    dotColor: marked[selectedDate]?.dotColor ?? colors.leaf,
    selected: true,
    selectedColor: colors.leaf,
  };

  return marked;
}

type RemindersCalendarViewProps = {
  tasks: CareTask[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
};

export function RemindersCalendarView({ tasks, onToggle, onDelete }: Readonly<RemindersCalendarViewProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('garden');
  const [selectedDate, setSelectedDate] = useState(today());
  const [visibleMonth, setVisibleMonth] = useState<VisibleMonth>(() => {
    const [year, month] = today().split('-').map(Number);
    return { year, month };
  });

  const markedDates = useMemo(
    () => buildMarkedDates(tasks, visibleMonth, selectedDate, colors),
    [tasks, visibleMonth, selectedDate, colors]
  );
  const tasksForSelectedDate = tasks.filter((task) => taskOccursOnDate(task, selectedDate));

  return (
    <View>
      <Calendar
        current={selectedDate}
        markedDates={markedDates}
        onDayPress={(date: DateData) => setSelectedDate(date.dateString)}
        onMonthChange={(date: DateData) => setVisibleMonth({ year: date.year, month: date.month })}
        style={styles.calendar}
        theme={{
          backgroundColor: 'transparent',
          calendarBackground: 'transparent',
          textSectionTitleColor: colors.mutedForeground,
          dayTextColor: colors.foreground,
          textDisabledColor: colors.border,
          todayTextColor: colors.leaf,
          monthTextColor: colors.foreground,
          arrowColor: colors.leaf,
          textDayFontFamily: Fonts.body,
          textDayHeaderFontFamily: Fonts.body,
          textMonthFontFamily: Fonts.display,
        }}
      />

      <View style={styles.dayTasks}>
        {tasksForSelectedDate.length === 0 ? (
          <Text style={styles.emptyText}>{t('noRemindersOnDay')}</Text>
        ) : (
          tasksForSelectedDate.map((task) => (
            <View key={task.id} style={styles.taskSpacing}>
              <CareTaskItem task={task} onToggle={onToggle} onDelete={onDelete} />
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    calendar: {
      borderRadius: Metrics.radius.md,
    },
    dayTasks: {
      marginTop: Metrics.spacing.md,
    },
    emptyText: {
      ...Typography.bodySmall,
      color: colors.mutedForeground,
    },
    taskSpacing: {
      marginTop: Metrics.spacing.sm,
    },
  });

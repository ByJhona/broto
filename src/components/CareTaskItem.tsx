import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import CheckCircle2 from 'lucide-react-native/icons/circle-check';
import Circle from 'lucide-react-native/icons/circle';
import type { LucideIcon } from 'lucide-react-native';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { addDays, CATEGORY_ICONS, daysBetween, formatShortDate, today } from '@/utils';
import { TASK_CATEGORY, type CareTask } from '@/types';
import { IconBadge } from './IconBadge';

type CareTaskItemProps = {
  task: CareTask;
  onToggle: (id: string) => void;
  onLongPress?: (id: string) => void;
};

type Styles = ReturnType<typeof makeStyles>;

function timeOfDay(task: CareTask): string {
  return `${String(task.reminderHour).padStart(2, '0')}:${String(task.reminderMinute).padStart(2, '0')}`;
}

function dueLabel(task: CareTask): string {
  const daysUntilDue = daysBetween(today(), task.dueDate);
  if (daysUntilDue < 0) return `Atrasado há ${-daysUntilDue} dia${-daysUntilDue === 1 ? '' : 's'}`;
  if (daysUntilDue === 0) return `Vence hoje às ${timeOfDay(task)}`;
  if (daysUntilDue === 1) return `Vence amanhã às ${timeOfDay(task)}`;
  return `Vence em ${daysUntilDue} dias`;
}

function recurrenceLabel(task: CareTask): string | null {
  return task.recurrenceDays ? `a cada ${task.recurrenceDays} dias` : null;
}

function statusLabel(task: CareTask): string {
  const recurrence = recurrenceLabel(task);
  if (!task.done) {
    return [dueLabel(task), recurrence].filter(Boolean).join(' · ');
  }
  if (!task.recurrenceDays) return 'Concluído';
  return [`Concluído — próxima em ${formatShortDate(addDays(task.dueDate, task.recurrenceDays))}`, recurrence]
    .filter(Boolean)
    .join(' · ');
}

function subtitleFor(task: CareTask): string {
  const isAutomatic = task.category === TASK_CATEGORY.GROWTH_CHECK;
  return [task.plantName, statusLabel(task), isAutomatic ? 'Automático' : null].filter(Boolean).join(' · ');
}

function cardStyle(styles: Styles, done: boolean, pressed: boolean) {
  return [styles.card, done && styles.cardDone, pressed && styles.cardPressed];
}

function titleStyle(styles: Styles, done: boolean) {
  return [styles.title, done && styles.textDone];
}

function subtitleStyle(styles: Styles, overdue: boolean) {
  return [styles.subtitle, overdue && styles.subtitleOverdue];
}

function iconBackgroundColor(colors: ThemeColors, done: boolean): string {
  return done ? colors.card : colors.muted;
}

function buildLongPressHandler(onLongPress: ((id: string) => void) | undefined, taskId: string) {
  return onLongPress ? () => onLongPress(taskId) : undefined;
}

type CareTaskLeadingIconProps = {
  task: CareTask;
  Icon: LucideIcon;
  colors: ThemeColors;
  styles: Styles;
};

function CareTaskLeadingIcon({ task, Icon, colors, styles }: Readonly<CareTaskLeadingIconProps>) {
  if (task.plantPhotoUrl) {
    return (
      <Image
        source={{ uri: task.plantPhotoUrl }}
        style={styles.iconPhoto}
        contentFit="cover"
        recyclingKey={task.id}
        cachePolicy="memory-disk"
      />
    );
  }
  return (
    <Icon
      size={Metrics.icon.normal}
      color={task.done ? colors.mutedForeground : colors.leaf}
      strokeWidth={Metrics.icon.strokeWidth}
    />
  );
}

type CareTaskStatusIconProps = {
  done: boolean;
  colors: ThemeColors;
};

function CareTaskStatusIcon({ done, colors }: Readonly<CareTaskStatusIconProps>) {
  if (done) {
    return <CheckCircle2 size={Metrics.icon.normal} color={colors.primary} strokeWidth={Metrics.icon.strokeWidth} />;
  }
  return <Circle size={Metrics.icon.normal} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />;
}

export const CareTaskItem = memo(function CareTaskItem({ task, onToggle, onLongPress }: Readonly<CareTaskItemProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const Icon = CATEGORY_ICONS[task.category];
  const subtitle = subtitleFor(task);
  const isOverdue = !task.done && daysBetween(today(), task.dueDate) < 0;

  return (
    <Pressable
      onPress={() => onToggle(task.id)}
      onLongPress={buildLongPressHandler(onLongPress, task.id)}
      style={({ pressed }) => cardStyle(styles, task.done, pressed)}
    >
      <IconBadge backgroundColor={iconBackgroundColor(colors, task.done)} style={styles.iconOverflow}>
        <CareTaskLeadingIcon task={task} Icon={Icon} colors={colors} styles={styles} />
      </IconBadge>

      <View style={styles.textContainer}>
        <Text style={titleStyle(styles, task.done)}>{task.title}</Text>
        <Text style={subtitleStyle(styles, isOverdue)}>{subtitle}</Text>
      </View>

      <CareTaskStatusIcon done={task.done} colors={colors} />
    </Pressable>
  );
});

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Metrics.spacing.sm,
    backgroundColor: colors.card,
    borderRadius: Metrics.radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: Metrics.spacing.md,
  },
  cardDone: {
    backgroundColor: colors.muted,
    borderColor: colors.muted,
  },
  cardPressed: {
    opacity: 0.8,
  },
  iconOverflow: {
    overflow: 'hidden',
  },
  iconPhoto: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.foreground,
  },
  subtitle: {
    fontSize: 13,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  subtitleOverdue: {
    color: colors.destructive,
    fontWeight: '600',
  },
  textDone: {
    color: colors.mutedForeground,
    textDecorationLine: 'line-through',
  },
  });

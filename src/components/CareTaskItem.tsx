import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import CheckCircle2 from 'lucide-react-native/icons/circle-check';
import Circle from 'lucide-react-native/icons/circle';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { addDays, CATEGORY_ICONS, daysBetween, formatShortDate, today } from '@/utils';
import type { CareTask } from '@/types';
import { IconBadge } from './IconBadge';

type CareTaskItemProps = {
  task: CareTask;
  onToggle: (id: string) => void;
  onLongPress?: (id: string) => void;
};

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

export const CareTaskItem = memo(function CareTaskItem({ task, onToggle, onLongPress }: Readonly<CareTaskItemProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const Icon = CATEGORY_ICONS[task.category];
  const subtitle = task.plantName ? `${task.plantName} · ${statusLabel(task)}` : statusLabel(task);
  const isOverdue = !task.done && daysBetween(today(), task.dueDate) < 0;

  return (
    <Pressable
      onPress={() => onToggle(task.id)}
      onLongPress={onLongPress ? () => onLongPress(task.id) : undefined}
      style={({ pressed }) => [styles.card, task.done && styles.cardDone, pressed && styles.cardPressed]}
    >
      <IconBadge
        backgroundColor={task.done ? colors.card : colors.muted}
        style={styles.iconOverflow}
      >
        {task.plantPhotoUrl ? (
          <Image
            source={{ uri: task.plantPhotoUrl }}
            style={styles.iconPhoto}
            contentFit="cover"
            recyclingKey={task.id}
            cachePolicy="memory-disk"
          />
        ) : (
          <Icon
            size={Metrics.icon.normal}
            color={task.done ? colors.mutedForeground : colors.leaf}
            strokeWidth={Metrics.icon.strokeWidth}
          />
        )}
      </IconBadge>

      <View style={styles.textContainer}>
        <Text style={[styles.title, task.done && styles.textDone]}>{task.title}</Text>
        <Text style={[styles.subtitle, isOverdue && styles.subtitleOverdue]}>{subtitle}</Text>
      </View>

      {task.done ? (
        <CheckCircle2 size={Metrics.icon.normal} color={colors.primary} strokeWidth={Metrics.icon.strokeWidth} />
      ) : (
        <Circle size={Metrics.icon.normal} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
      )}
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

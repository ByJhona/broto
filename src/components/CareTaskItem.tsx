import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import CheckCircle2 from 'lucide-react-native/icons/circle-check';
import Circle from 'lucide-react-native/icons/circle';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { addDays, CATEGORY_ICONS, formatShortDate } from '@/utils';
import type { CareTask } from '@/types';

type CareTaskItemProps = {
  task: CareTask;
  onToggle: (id: string) => void;
  onLongPress?: (id: string) => void;
};

function statusLabel(task: CareTask): string {
  if (!task.done) {
    return task.lastCompletedOccurrence
      ? `Última vez: ${formatShortDate(task.lastCompletedOccurrence)}`
      : 'Ainda não feito';
  }
  if (!task.recurrenceDays) return 'Concluído';
  return `Concluído — próxima em ${formatShortDate(addDays(task.dueDate, task.recurrenceDays))}`;
}

export const CareTaskItem = memo(function CareTaskItem({ task, onToggle, onLongPress }: Readonly<CareTaskItemProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const Icon = CATEGORY_ICONS[task.category];
  const subtitle = task.plantName ? `${task.plantName} · ${statusLabel(task)}` : statusLabel(task);

  return (
    <Pressable
      onPress={() => onToggle(task.id)}
      onLongPress={onLongPress ? () => onLongPress(task.id) : undefined}
      style={({ pressed }) => [styles.card, task.done && styles.cardDone, pressed && styles.cardPressed]}
    >
      <View style={[styles.icon, task.done && styles.iconDone]}>
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
      </View>

      <View style={styles.textContainer}>
        <Text style={[styles.title, task.done && styles.textDone]}>{task.title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
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
  icon: {
    width: 40,
    height: 40,
    borderRadius: Metrics.radius.full,
    backgroundColor: colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  iconDone: {
    backgroundColor: colors.card,
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
  textDone: {
    color: colors.mutedForeground,
    textDecorationLine: 'line-through',
  },
  });
